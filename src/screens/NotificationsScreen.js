import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import authService from '../services/authService';
import notificationService from '../services/NotificationService';

export default function NotificationsScreen({ navigation }) {
  const currentUser = authService.getCurrentUser();
  
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    
    // Listen to real-time notifications
    const unsubscribe = notificationService.listenToNotifications(
      currentUser.uid,
      (newNotifications) => {
        setNotifications(newNotifications);
        updateUnreadCount(newNotifications);
      }
    );

    return () => unsubscribe();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const notifs = await notificationService.getUserNotifications(currentUser.uid);
      setNotifications(notifs);
      updateUnreadCount(notifs);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const updateUnreadCount = (notifs) => {
    const unread = notifs.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
    }

    // Navigate based on notification type
    const data = notification.data || {};

    if (data.type === 'message' && data.chatId) {
      // Navigate to chat
      navigation.navigate('ChatRoom', {
        chatId: data.chatId,
        otherUser: { id: data.senderId }
      });
    } else if (data.type === 'follow' && data.userId) {
      // Navigate to user profile
      navigation.navigate('Profile', { userId: data.userId });
    }
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead(currentUser.uid);
    await loadNotifications();
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    const now = new Date();
    const notifDate = timestamp.toDate();
    const diffMs = now - notifDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return notifDate.toLocaleDateString();
  };

  const getNotificationIcon = (notification) => {
    const data = notification.data || {};
    
    switch (data.type) {
      case 'message':
        return 'chatbubble';
      case 'follow':
        return 'person-add';
      case 'like':
        return 'heart';
      case 'comment':
        return 'chatbox';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (notification) => {
    const data = notification.data || {};
    
    switch (data.type) {
      case 'message':
        return '#6C5CE7';
      case 'follow':
        return '#00B894';
      case 'like':
        return '#FF6B6B';
      case 'comment':
        return '#4ECDC4';
      default:
        return '#888';
    }
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !item.read && styles.unreadNotification
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View 
        style={[
          styles.iconContainer,
          { backgroundColor: getNotificationColor(item) + '20' }
        ]}
      >
        <Icon 
          name={getNotificationIcon(item)} 
          size={24} 
          color={getNotificationColor(item)} 
        />
      </View>

      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.notificationTime}>
          {formatTimestamp(item.createdAt)}
        </Text>
      </View>

      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="notifications-off-outline" size={80} color="#444" />
      <Text style={styles.emptyTitle}>No Notifications</Text>
      <Text style={styles.emptyText}>
        You'll see notifications here when you receive messages, follows, and more.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.listHeaderText}>
        {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
      </Text>
      {unreadCount > 0 && (
        <TouchableOpacity onPress={handleMarkAllRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => {}}>
          <Icon name="settings-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={notifications.length > 0 ? renderHeader : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6C5CE7"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#2A2A2A',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  loadingText: {
    marginTop: 10,
    color: '#888',
    fontSize: 16,
  },
  listContent: {
    flexGrow: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  listHeaderText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  markAllText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontWeight: '600',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  unreadNotification: {
    backgroundColor: '#252525',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6C5CE7',
    marginLeft: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});