import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, getApiHeaders } from '../config/api';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  type: 'announcement' | 'alert' | 'message';
}

interface HomeScreenProps {
  onLogout: () => void;
  userName: string;
  onUpdateName: (newName: string) => Promise<void>;
  apiToken: string;
}

const formatTime = (createdAtString: string) => {
  try {
    const created = new Date(createdAtString);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    if (isNaN(diffMs)) return 'Recently';

    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return created.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Recently';
  }
};

const getType = (item: any) => {
  if (item.sent_to_all) return 'announcement';
  const titleLower = (item.title || '').toLowerCase();
  const bodyLower = (item.body || '').toLowerCase();
  if (
    titleLower.includes('alert') ||
    titleLower.includes('warning') ||
    titleLower.includes('urgent') ||
    titleLower.includes('error') ||
    bodyLower.includes('alert') ||
    bodyLower.includes('warning') ||
    bodyLower.includes('urgent')
  ) {
    return 'alert';
  }
  return 'message';
};

export default function HomeScreen({ onLogout, userName, onUpdateName, apiToken }: HomeScreenProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Profile update states
  const [profileVisible, setProfileVisible] = useState(false);
  const [profileName, setProfileName] = useState(userName);
  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState<{
    name?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [previousVisible, setPreviousVisible] = useState(false);

  useEffect(() => {
    setProfileName(userName);
  }, [userName]);

  useEffect(() => {
    const loadDismissedIds = async () => {
      try {
        const stored = await AsyncStorage.getItem('dismissedNotificationIds');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setDismissedIds(new Set(parsed));
          }
        }
      } catch (e) {
        console.error('Failed to load dismissed notification IDs:', e);
      }
    };
    loadDismissedIds();
  }, []);

  // Toast states for premium visual feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(message);
    toastAnim.setValue(0);

    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    toastTimeoutRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null);
      });
    }, 3000);
  }, [toastAnim]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const fetchNotifications = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    showToast('Refreshing notifications...');

    try {
      const url = `${API_BASE_URL}/notifications?api_token=${encodeURIComponent(apiToken)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: getApiHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch notifications');
      }

      if (data.success && Array.isArray(data.notifications)) {
        const mapped: NotificationItem[] = data.notifications.map((n: any) => ({
          id: String(n.id),
          title: n.title,
          description: n.body,
          time: formatTime(n.created_at),
          isRead: false,
          type: getType(n),
        }));

        // Deduplicate notifications by id to ensure we never show duplicates
        const seen = new Set<string>();
        const unique = mapped.filter((item) => {
          if (seen.has(item.id)) {
            return false;
          }
          seen.add(item.id);
          return true;
        });

        setNotifications(unique);
        showToast('Notifications updated successfully!');
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      showToast('Failed to refresh notifications');
      Alert.alert('Error', error?.message || 'Could not fetch notifications from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiToken, showToast]);

  useEffect(() => {
    if (apiToken) {
      fetchNotifications();
    }
  }, [apiToken, fetchNotifications]);

  const handleUpdateProfile = async () => {
    const errors: typeof profileErrors = {};
    if (!profileName.trim() || profileName.trim().length < 3) {
      errors.name = 'Full name must be at least 3 characters';
    }
    
    if (profilePassword) {
      if (profilePassword.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      }
      if (profilePassword !== profileConfirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileErrors({});
    setProfileLoading(true);

    try {
      const url = `${API_BASE_URL}/update-profile`;
      const response = await fetch(url, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({
          api_token: apiToken,
          full_name: profileName.trim(),
          ...(profilePassword ? { password: profilePassword } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      if (data.success) {
        await onUpdateName(data.client.full_name);
        setProfilePassword('');
        setProfileConfirmPassword('');
        setProfileVisible(false);
        showToast('Profile updated successfully!');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showToast('Profile update failed');
      Alert.alert('Error', error?.message || 'Could not update profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePullToRefresh = () => {
    fetchNotifications(true);
  };

  const handleRemoveNotification = async (id: string) => {
    try {
      const newDismissed = new Set(dismissedIds);
      newDismissed.add(id);
      setDismissedIds(newDismissed);
      await AsyncStorage.setItem('dismissedNotificationIds', JSON.stringify(Array.from(newDismissed)));
      showToast('Notification removed from home');
    } catch (e) {
      console.error('Failed to save dismissed notification ID:', e);
      showToast('Failed to remove notification');
    }
  };

  const getIconForType = (type: NotificationItem['type']) => {
    switch (type) {
      case 'announcement': return '📢';
      case 'alert': return '⚠️';
      case 'message': return '✉️';
      default: return '🔔';
    }
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <View style={[styles.notificationCard, !item.isRead && styles.unreadCard]}>
      <View style={styles.notificationHeader}>
        <View style={styles.iconWrapper}>
          <Text style={styles.iconText}>{getIconForType(item.type)}</Text>
        </View>
        <View style={styles.notificationTitleWrapper}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
        <TouchableOpacity 
          style={styles.cardRemoveButton} 
          onPress={() => handleRemoveNotification(item.id)}
          activeOpacity={0.6}
        >
          <Text style={styles.cardRemoveText}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.notificationDescription}>{item.description}</Text>
    </View>
  );

  const renderPreviousNotification = ({ item }: { item: NotificationItem }) => (
    <View style={[styles.notificationCard, !item.isRead && styles.unreadCard]}>
      <View style={styles.notificationHeader}>
        <View style={styles.iconWrapper}>
          <Text style={styles.iconText}>{getIconForType(item.type)}</Text>
        </View>
        <View style={styles.notificationTitleWrapper}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{item.time}</Text>
        </View>
        {dismissedIds.has(item.id) && (
          <View style={styles.archivedBadge}>
            <Text style={styles.archivedBadgeText}>Removed</Text>
          </View>
        )}
      </View>
      <Text style={styles.notificationDescription}>{item.description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0914" />
      <View style={styles.container}>
        {/* Custom Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userPhone}>{userName || 'User'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => fetchNotifications(false)}
              activeOpacity={0.7}
              disabled={loading || refreshing}
            >
              {loading && !refreshing ? (
                <ActivityIndicator size="small" color="#A78BFA" />
              ) : (
                <Text style={styles.refreshIcon}>🔄</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={() => setMenuVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <Text style={styles.sectionTitle}>Recent Notifications</Text>
        
        <FlatList
          data={notifications.filter(n => !dismissedIds.has(n.id))}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handlePullToRefresh}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator size="large" color="#7C3AED" style={styles.emptyLoader} />
            ) : (
              <Text style={styles.emptyText}>No notifications yet.</Text>
            )
          }
        />

        {/* Full-Screen Menu Modal */}
        <Modal
          visible={menuVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setMenuVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1} 
              onPress={() => setMenuVisible(false)} 
            />
            
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Menu</Text>
                <TouchableOpacity onPress={() => setMenuVisible(false)}>
                  <Text style={styles.closeMenuText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.menuOptions}>
                <TouchableOpacity 
                  style={styles.menuItem} 
                  activeOpacity={0.7}
                  onPress={() => {
                    setMenuVisible(false);
                    setPreviousVisible(true);
                  }}
                >
                  <Text style={styles.menuItemIcon}>📋</Text>
                  <Text style={styles.menuItemText}>Previous Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.menuItem} 
                  activeOpacity={0.7}
                  onPress={() => {
                    setMenuVisible(false);
                    setProfileVisible(true);
                  }}
                >
                  <Text style={styles.menuItemIcon}>👤</Text>
                  <Text style={styles.menuItemText}>Update Profile</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.logoutButton} 
                activeOpacity={0.8}
                onPress={() => {
                  setMenuVisible(false);
                  onLogout();
                }}
              >
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Profile Update Modal */}
        <Modal
          visible={profileVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setProfileVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1} 
              onPress={() => setProfileVisible(false)} 
            />
            
            <View style={styles.menuContainer}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Update Profile</Text>
                <TouchableOpacity onPress={() => setProfileVisible(false)}>
                  <Text style={styles.closeMenuText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.profileForm}>
                {/* Full Name Input */}
                <View style={styles.modalInputWrapper}>
                  <Text style={styles.modalFieldLabel}>Full Name</Text>
                  <View style={[styles.modalInputContainer, profileErrors.name ? styles.modalInputError : null]}>
                    <Text style={styles.modalInputIcon}>👤</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Your Full Name"
                      placeholderTextColor="#64748B"
                      value={profileName}
                      onChangeText={(text) => {
                        setProfileName(text);
                        if (profileErrors.name) setProfileErrors({ ...profileErrors, name: undefined });
                      }}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                  {profileErrors.name && <Text style={styles.modalErrorText}>{profileErrors.name}</Text>}
                </View>

                {/* Password Input */}
                <View style={styles.modalInputWrapper}>
                  <Text style={styles.modalFieldLabel}>New Password (Optional)</Text>
                  <View style={[styles.modalInputContainer, profileErrors.password ? styles.modalInputError : null]}>
                    <Text style={styles.modalInputIcon}>🔑</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Leave blank to keep current"
                      placeholderTextColor="#64748B"
                      value={profilePassword}
                      onChangeText={(text) => {
                        setProfilePassword(text);
                        if (profileErrors.password) setProfileErrors({ ...profileErrors, password: undefined });
                      }}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {profileErrors.password && <Text style={styles.modalErrorText}>{profileErrors.password}</Text>}
                </View>

                {/* Confirm Password Input */}
                <View style={styles.modalInputWrapper}>
                  <Text style={styles.modalFieldLabel}>Confirm New Password</Text>
                  <View style={[styles.modalInputContainer, profileErrors.confirmPassword ? styles.modalInputError : null]}>
                    <Text style={styles.modalInputIcon}>🔒</Text>
                    <TextInput
                      style={styles.modalTextInput}
                      placeholder="Confirm your new password"
                      placeholderTextColor="#64748B"
                      value={profileConfirmPassword}
                      onChangeText={(text) => {
                        setProfileConfirmPassword(text);
                        if (profileErrors.confirmPassword) setProfileErrors({ ...profileErrors, confirmPassword: undefined });
                      }}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                  {profileErrors.confirmPassword && <Text style={styles.modalErrorText}>{profileErrors.confirmPassword}</Text>}
                </View>

                <TouchableOpacity 
                  style={[styles.saveProfileButton, profileLoading && styles.saveProfileButtonDisabled]} 
                  activeOpacity={0.8}
                  onPress={handleUpdateProfile}
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.saveProfileButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Previous Notifications Modal */}
        <Modal
          visible={previousVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setPreviousVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity 
              style={styles.modalBackdrop} 
              activeOpacity={1} 
              onPress={() => setPreviousVisible(false)} 
            />
            
            <View style={[styles.menuContainer, styles.historyContainer]}>
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>Previous Notifications</Text>
                <TouchableOpacity onPress={() => setPreviousVisible(false)}>
                  <Text style={styles.closeMenuText}>✕</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderPreviousNotification}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No previous notifications.</Text>
                }
              />
            </View>
          </View>
        </Modal>
      </View>

      {/* Toast Alert */}
      {toastMessage && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [60, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.toastContent}>
            <Text style={styles.toastIcon}>🔔</Text>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0914',
  },
  container: {
    flex: 1,
    backgroundColor: '#0B0914',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'android' ? 24 : 12,
    marginBottom: 32,
  },
  greeting: {
    fontSize: 16,
    color: '#94A3B8',
  },
  userPhone: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  menuButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1E1B2E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2942',
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
    borderRadius: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 40,
  },
  notificationCard: {
    backgroundColor: '#1E1B2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2D2942',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  unreadCard: {
    borderColor: '#7C3AED',
    backgroundColor: '#231F3B',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0B0914',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#2D2942',
  },
  iconText: {
    fontSize: 18,
  },
  notificationTitleWrapper: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#64748B',
  },
  notificationDescription: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 22,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11, 9, 20, 0.7)',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
  },
  menuContainer: {
    backgroundColor: '#1E1B2E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderColor: '#2D2942',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeMenuText: {
    fontSize: 20,
    color: '#64748B',
    padding: 8,
  },
  menuOptions: {
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2942',
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    width: 44,
    height: 44,
    backgroundColor: '#1E1B2E',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#2D2942',
    marginRight: 12,
  },
  refreshIcon: {
    fontSize: 18,
  },
  toastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    backgroundColor: '#1E1B2E',
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toastIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  emptyLoader: {
    marginTop: 40,
  },
  profileForm: {
    marginTop: 8,
  },
  modalInputWrapper: {
    marginBottom: 16,
  },
  modalFieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B0914',
    borderWidth: 1.5,
    borderColor: '#2D2942',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  modalInputError: {
    borderColor: '#EF4444',
  },
  modalInputIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#94A3B8',
  },
  modalTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    height: '100%',
    padding: 0,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  saveProfileButton: {
    backgroundColor: '#7C3AED',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  saveProfileButtonDisabled: {
    opacity: 0.6,
  },
  saveProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardRemoveButton: {
    padding: 6,
    marginLeft: 8,
  },
  cardRemoveText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  archivedBadge: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  archivedBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  historyContainer: {
    height: '85%',
  },
});
