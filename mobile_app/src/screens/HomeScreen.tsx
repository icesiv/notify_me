import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
  TextInput,
  Vibration,
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, getApiHeaders } from '../config/api';

// Import Tab Components
import NotificationsTab, { NotificationItem } from '../components/NotificationsTab';
import ReminderTimerTab from '../components/ReminderTimerTab';
import TasksTab from '../components/TasksTab';
import PrvNotificationsTab from '../components/PrvNotificationsTab';

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
  if (item.type) return item.type;
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
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'notifications' | 'reminders' | 'tasks' | 'previous'>('notifications');

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

  // Periodic reminders alarm checker
  useEffect(() => {
    const checkReminders = async () => {
      try {
        const stored = await AsyncStorage.getItem('userReminders');
        if (!stored) return;

        const reminders = JSON.parse(stored);
        let updated = false;
        const now = new Date();

        const activeReminders = reminders.map((r: any) => {
          if (!r.isEnabled) return r;

          // Parse YYYY-MM-DD and HH:MM
          const [year, month, day] = r.date.split('-').map(Number);
          const [hour, minute] = r.time.split(':').map(Number);
          
          if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
            return r;
          }

          const reminderTime = new Date(year, month - 1, day, hour, minute, 0);

          if (now >= reminderTime) {
            // Trigger Alarm!
            Vibration.vibrate([0, 500, 200, 500, 200, 500]);
            Alert.alert(
              '⏰ Reminder Alarm! 🔔',
              r.title,
              [{ text: 'Dismiss Alarm', onPress: () => Vibration.cancel() }]
            );
            
            updated = true;
            return { ...r, isEnabled: false };
          }

          return r;
        });

        if (updated) {
          await AsyncStorage.setItem('userReminders', JSON.stringify(activeReminders));
          DeviceEventEmitter.emit('reminders_updated');
        }
      } catch (e) {
        console.error('Failed to run periodic reminders check:', e);
      }
    };

    // Check immediately and then every 15 seconds
    checkReminders();
    const interval = setInterval(checkReminders, 15000);

    return () => clearInterval(interval);
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

  const syncDataFromFetchedNotifications = async (fetchedNotifications: any[]) => {
    try {
      // 1. Sync Tasks
      const tasksStored = await AsyncStorage.getItem('userTasks');
      const localTasks = tasksStored ? JSON.parse(tasksStored) : [];
      let tasksUpdated = false;

      // 2. Sync Reminders
      const remindersStored = await AsyncStorage.getItem('userReminders');
      const localReminders = remindersStored ? JSON.parse(remindersStored) : [];
      let remindersUpdated = false;

      for (const n of fetchedNotifications) {
        const type = n.type || 'general';
        const title = n.title || '';
        const body = n.body || '';
        
        // Parse payload
        let payload: any = {};
        if (n.payload) {
          payload = typeof n.payload === 'string' ? JSON.parse(n.payload) : n.payload;
        }

        if (type === 'tasks') {
          // Check for duplicate title
          const exists = localTasks.some((t: any) => 
            t.title.toLowerCase().trim() === title.toLowerCase().trim()
          );
          if (!exists) {
            localTasks.unshift({
              id: 'sync_' + n.id,
              title: title.trim(),
              description: body.trim() || undefined,
              priority: (payload.priority || 'low').toLowerCase() as 'low' | 'medium' | 'high',
              dueDate: payload.dueDate ? payload.dueDate.trim() : undefined,
              isCompleted: false,
            });
            tasksUpdated = true;
          }
        } else if (type === 'reminder') {
          const date = payload.date;
          const time = payload.time;
          if (date && time) {
            const exists = localReminders.some((r: any) => 
              r.title.toLowerCase() === title.toLowerCase() && 
              r.date === date && 
              r.time === time
            );
            if (!exists) {
              localReminders.unshift({
                id: 'sync_' + n.id,
                title: title.trim(),
                date: date.trim(),
                time: time.trim(),
                isEnabled: true,
              });
              remindersUpdated = true;
            }
          }
        }
      }

      if (tasksUpdated) {
        await AsyncStorage.setItem('userTasks', JSON.stringify(localTasks));
        DeviceEventEmitter.emit('tasks_updated');
      }

      if (remindersUpdated) {
        await AsyncStorage.setItem('userReminders', JSON.stringify(localReminders));
        DeviceEventEmitter.emit('reminders_updated');
      }
    } catch (e) {
      console.error('Error syncing data from fetched notifications:', e);
    }
  };

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
        
        // Sync database notifications (reminders & tasks) to local storage
        await syncDataFromFetchedNotifications(data.notifications);
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
      showToast('Notification dismissed');
    } catch (e) {
      console.error('Failed to save dismissed notification ID:', e);
      showToast('Failed to dismiss notification');
    }
  };

  const handleRestoreNotification = async (id: string) => {
    try {
      const newDismissed = new Set(dismissedIds);
      newDismissed.delete(id);
      setDismissedIds(newDismissed);
      await AsyncStorage.setItem('dismissedNotificationIds', JSON.stringify(Array.from(newDismissed)));
      showToast('Notification restored');
    } catch (e) {
      console.error('Failed to restore notification:', e);
      showToast('Failed to restore notification');
    }
  };

  const tabs = [
    { id: 'notifications', label: 'Alerts', icon: '🔔' },
    { id: 'reminders', label: 'Reminder', icon: '⏰' },
    { id: 'tasks', label: 'Tasks', icon: '✅' },
    { id: 'previous', label: 'History', icon: '📁' },
  ] as const;

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
            {(activeTab === 'notifications' || activeTab === 'previous') && (
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
            )}
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

        {/* Tab Content Router */}
        <View style={styles.tabContent}>
          {activeTab === 'notifications' && (
            <NotificationsTab
              notifications={notifications}
              dismissedIds={dismissedIds}
              loading={loading}
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              onRemoveNotification={handleRemoveNotification}
            />
          )}

          {activeTab === 'reminders' && (
            <ReminderTimerTab />
          )}

          {activeTab === 'tasks' && (
            <TasksTab />
          )}

          {activeTab === 'previous' && (
            <PrvNotificationsTab
              notifications={notifications}
              dismissedIds={dismissedIds}
              loading={loading}
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              onRestoreNotification={handleRestoreNotification}
            />
          )}
        </View>

        {/* Floating Custom Bottom Tab Bar */}
        <View style={styles.tabBarContainer}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabBarItem}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabBarIcon, isActive && styles.activeTabBarIcon]}>
                  {tab.icon}
                </Text>
                <Text style={[styles.tabBarLabel, isActive && styles.activeTabBarLabel]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
                    setActiveTab('previous');
                  }}
                >
                  <Text style={styles.menuItemIcon}>📁</Text>
                  <Text style={styles.menuItemText}>Notification History</Text>
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
    marginBottom: 24,
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
  tabContent: {
    flex: 1,
  },
  // Floating Tab Bar
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    height: 72,
    backgroundColor: 'rgba(30, 27, 46, 0.95)',
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1.5,
    borderColor: '#2D2942',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
    marginHorizontal: 12,
  },
  tabBarItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  tabBarIcon: {
    fontSize: 20,
    color: '#64748B',
    marginBottom: 4,
  },
  activeTabBarIcon: {
    color: '#A78BFA',
    transform: [{ scale: 1.1 }],
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabBarLabel: {
    color: '#A78BFA',
    fontWeight: '700',
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
    bottom: Platform.OS === 'ios' ? 110 : 90, // Positioned nicely above the bottom floating tab bar
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
});
