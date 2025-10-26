import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../config/firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Initialize push notifications
  async initialize(userId) {
    try {
      console.log('🔔 Initializing push notifications...');

      // Request permissions
      const token = await this.registerForPushNotifications();
      
      if (token) {
        this.expoPushToken = token;
        console.log('✅ Push token:', token);

        // Save token to user profile
        await this.saveTokenToUser(userId, token);

        // Set up listeners
        this.setupNotificationListeners();

        return { success: true, token };
      }

      return { success: false, error: 'No token received' };
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Request notification permissions and get Expo push token
  async registerForPushNotifications() {
    try {
      if (!Device.isDevice) {
        console.log('⚠️ Must use physical device for Push Notifications');
        return null;
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Ask for permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Permission not granted for push notifications');
        return null;
      }

      // Get project ID from app config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.easConfig?.projectId;

      console.log('📱 Project ID:', projectId);

      // Get Expo push token with project ID
      let tokenData;
      if (projectId) {
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId
        });
      } else {
        // Fallback: Try without projectId (works for Expo Go)
        console.log('⚠️ No project ID found, trying without it...');
        tokenData = await Notifications.getExpoPushTokenAsync();
      }

      console.log('✅ Expo Push Token:', tokenData.data);

      // Android specific channel setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6C5CE7',
        });
      }

      return tokenData.data;
    } catch (error) {
      console.error('❌ Error getting push token:', error);
      return null;
    }
  }

  // Save push token to user document
  async saveTokenToUser(userId, pushToken) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pushToken: pushToken,
        pushTokenUpdatedAt: serverTimestamp()
      });
      console.log('✅ Push token saved to user profile');
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Notification received:', notification);
    });

    // Listener for when user taps notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      // Handle navigation based on notification data
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification tap
  handleNotificationResponse(response) {
    const data = response.notification.request.content.data;
    console.log('📱 Notification data:', data);

    // You can emit an event or use navigation here
    if (data.type === 'message' && data.chatId) {
      this.onNotificationTap = data;
    }
  }

  // Send notification to a user
  async sendNotificationToUser(userId, title, body, data = {}) {
    try {
      // Get user's push token
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        console.log('❌ User not found');
        return { success: false };
      }

      const pushToken = userDoc.data().pushToken;

      if (!pushToken) {
        console.log('⚠️ User has no push token (notifications not enabled)');
        return { success: false };
      }

      // Send push notification via Expo's push service
      const message = {
        to: pushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data,
        badge: 1,
        priority: 'high',
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('✅ Notification sent:', result);

      // Save notification to database
      await this.saveNotificationToDatabase(userId, title, body, data);

      return { success: true, result };
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Save notification to database for history
  async saveNotificationToDatabase(userId, title, body, data) {
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: userId,
        title: title,
        body: body,
        data: data,
        read: false,
        createdAt: serverTimestamp()
      });
      console.log('✅ Notification saved to database');
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  }

  // Get user's notification history
  async getUserNotifications(userId, limitCount = 20) {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      const notifications = [];

      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return notifications;
    } catch (error) {
      console.error('Error getting notifications:', error);
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, {
        read: true,
        readAt: serverTimestamp()
      });
      console.log('✅ Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      
      const updatePromises = [];
      snapshot.forEach((docSnapshot) => {
        updatePromises.push(
          updateDoc(doc(db, 'notifications', docSnapshot.id), {
            read: true,
            readAt: serverTimestamp()
          })
        );
      });

      await Promise.all(updatePromises);
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  // Get unread count
  async getUnreadCount(userId) {
    try {
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Listen to new notifications in real-time
  listenToNotifications(userId, callback) {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, (snapshot) => {
      const notifications = [];
      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data()
        });
      });
      callback(notifications);
    });
  }

  // Send new message notification
  async sendMessageNotification(senderId, receiverId, message, chatId) {
    try {
      // Get sender info
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      if (!senderDoc.exists()) return;

      const senderName = senderDoc.data().displayName || 'Someone';
      
      // Send notification
      await this.sendNotificationToUser(
        receiverId,
        `New message from ${senderName}`,
        message.length > 50 ? message.substring(0, 50) + '...' : message,
        {
          type: 'message',
          chatId: chatId,
          senderId: senderId
        }
      );
    } catch (error) {
      console.error('Error sending message notification:', error);
    }
  }

  // Send follow notification
  async sendFollowNotification(followerId, followedUserId) {
    try {
      // Get follower info
      const followerDoc = await getDoc(doc(db, 'users', followerId));
      if (!followerDoc.exists()) return;

      const followerName = followerDoc.data().displayName || 'Someone';
      
      // Send notification
      await this.sendNotificationToUser(
        followedUserId,
        'New Follower',
        `${followerName} started following you`,
        {
          type: 'follow',
          userId: followerId
        }
      );
    } catch (error) {
      console.error('Error sending follow notification:', error);
    }
  }

  // Clean up listeners
  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }

  // Schedule local notification (for testing or reminders)
  async scheduleLocalNotification(title, body, seconds = 5) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: seconds,
        },
      });
      console.log('✅ Local notification scheduled');
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ All scheduled notifications cancelled');
  }
}

export default new NotificationService();