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

interface PrvNotificationsTabProps {
  notifications: NotificationItem[];
  dismissedIds: Set<string>;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onRestoreNotification: (id: string) => void;
}

const getIconForType = (type: NotificationItem['type']) => {
  switch (type) {
    case 'announcement': return '📢';
    case 'alert': return '⚠️';
    case 'message': return '✉️';
    default: return '🔔';
  }
};

export default function PrvNotificationsTab({
  notifications,
  dismissedIds,
  loading,
  refreshing,
  onRefresh,
  onRestoreNotification,
}: PrvNotificationsTabProps) {

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const isDismissed = dismissedIds.has(item.id);

    return (
      <View style={[styles.notificationCard, isDismissed && styles.dismissedCard]}>
        <View style={styles.notificationHeader}>
          <View style={styles.iconWrapper}>
            <Text style={styles.iconText}>{getIconForType(item.type)}</Text>
          </View>
          <View style={styles.notificationTitleWrapper}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationTime}>{item.time}</Text>
          </View>
          
          {isDismissed ? (
            <View style={styles.badgeRow}>
              <View style={styles.archivedBadge}>
                <Text style={styles.archivedBadgeText}>Removed</Text>
              </View>
              <TouchableOpacity
                style={styles.restoreBtn}
                onPress={() => onRestoreNotification(item.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.restoreBtnText}>↩️ Restore</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>Live</Text>
            </View>
          )}
        </View>
        <Text style={styles.notificationDescription}>{item.description}</Text>
      </View>
    );
  };

  return (
    <View style={styles.tabContainer}>
      <Text style={styles.sectionTitle}>Notification History</Text>
      
      <FlatList
        data={notifications}
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
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyText}>No notifications found</Text>
              <Text style={styles.emptySubtext}>Your received notifications will show here.</Text>
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
    paddingBottom: 100,
  },
  notificationCard: {
    backgroundColor: '#1E1B2E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#2D2942',
  },
  dismissedCard: {
    opacity: 0.7,
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
  badgeRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  archivedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 4,
  },
  archivedBadgeText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '600',
  },
  restoreBtn: {
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  restoreBtnText: {
    color: '#A78BFA',
    fontSize: 10,
    fontWeight: '600',
  },
  liveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
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
});
