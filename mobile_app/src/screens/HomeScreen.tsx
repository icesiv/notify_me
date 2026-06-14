import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  type: 'announcement' | 'alert' | 'message';
}

const DUMMY_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'System Update Completed',
    description: 'The recent system maintenance has been successfully completed. Enjoy the new features!',
    time: '2 hours ago',
    isRead: false,
    type: 'announcement',
  },
  {
    id: '2',
    title: 'New Login Detected',
    description: 'We noticed a new login from a device in New York, USA. If this was you, no action is needed.',
    time: '5 hours ago',
    isRead: false,
    type: 'alert',
  },
  {
    id: '3',
    title: 'Welcome to NotifyMe',
    description: 'Thanks for joining! We are excited to have you on board.',
    time: '1 day ago',
    isRead: true,
    type: 'message',
  },
];

interface HomeScreenProps {
  onLogout: () => void;
  userPhone?: string;
}

export default function HomeScreen({ onLogout, userPhone }: HomeScreenProps) {
  const [menuVisible, setMenuVisible] = useState(false);

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
            <Text style={styles.userPhone}>{userPhone || 'User'}</Text>
          </View>
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

        {/* Content */}
        <Text style={styles.sectionTitle}>Recent Notifications</Text>
        
        <FlatList
          data={DUMMY_NOTIFICATIONS}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No notifications yet.</Text>
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
                <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                  <Text style={styles.menuItemIcon}>📋</Text>
                  <Text style={styles.menuItemText}>Previous Notifications</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
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
      </View>
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
});
