import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  isRead: boolean;
  type: 'announcement' | 'alert' | 'message';
}

interface NotificationsTabProps {
  notifications: NotificationItem[];
  dismissedIds: Set<string>;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onRemoveNotification: (id: string) => void;
}

const getIconForType = (type: NotificationItem['type']) => {
  switch (type) {
    case 'announcement': return '📢';
    case 'alert': return '⚠️';
    case 'message': return '✉️';
    default: return '🔔';
  }
};

export default function NotificationsTab({
  notifications,
  dismissedIds,
  loading,
  refreshing,
  onRefresh,
  onRemoveNotification,
}: NotificationsTabProps) {
  const activeNotifications = notifications.filter(n => !dismissedIds.has(n.id));

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
          onPress={() => onRemoveNotification(item.id)}
          activeOpacity={0.6}
        >
          <Text style={styles.cardRemoveText}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.notificationDescription}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.sectionTitle}>Recent Notifications</Text>
      
      <FlatList
        data={activeNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#7C3AED" style={styles.emptyLoader} />
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>All caught up!</Text>
              <Text style={styles.emptySubtext}>No new notifications right now.</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 100, // Extra padding to make sure floating tab bar doesn't overlay content
  },
  notificationCard: {
    backgroundColor: '#1E1B2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2D2942',
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
  emptyLoader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
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
});
