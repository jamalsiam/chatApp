import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

// Configure notification behavior - will be updated dynamically
Notifications.setNotificationHandler({
  handleNotification: async () => {
    // Load settings to determine behavior
    const settings = await loadNotificationSettings();

    return {
      shouldShowAlert: settings.enabled,
      shouldPlaySound: settings.enabled && settings.sound,
      shouldSetBadge: settings.enabled,
    };
  },
});

// Helper function to load notification settings
async function loadNotificationSettings() {
  try {
    const savedSettings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error('Error loading notification settings:', error);
  }

  // Default settings
  return {
    enabled: true,
    sound: true,
    vibration: true,
    messageNotifications: true,
    followNotifications: true,
    likeNotifications: true,
    commentNotifications: true,
    showPreview: true,
    muteFrom: null,
    muteTo: null,
  };
}

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  // Initialize push notifications
  async initialize(userId) {
    try {

      // Request permissions
      const token = await this.registerForPushNotifications();
      
      if (token) {
        this.expoPushToken = token;

        // Save token to user profile
        await this.saveTokenToUser(userId, token);

        // Set up listeners
        this.setupNotificationListeners();

        return { success: true, token };
      }

      return { success: false, error: 'No token received' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Request notification permissions and get Expo push token
  async registerForPushNotifications() {
    try {
      if (!Device.isDevice) {
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
        return null;
      }

      // Get project ID from app config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.easConfig?.projectId;


      // Get Expo push token with project ID
      let tokenData;
      if (projectId) {
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId
        });
      } else {
        // Fallback: Try without projectId (works for Expo Go)
        tokenData = await Notifications.getExpoPushTokenAsync();
      }


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
    } catch (error) {
    }
  }

  // Set up notification listeners
  setupNotificationListeners() {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
    });

    // Listener for when user taps notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle navigation based on notification data
      this.handleNotificationResponse(response);
    });
  }

  // Handle notification tap
  handleNotificationResponse(response) {
    const data = response.notification.request.content.data;

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
        return { success: false };
      }

      const pushToken = userDoc.data().pushToken;

      if (!pushToken) {
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

      // Save notification to database
      await this.saveNotificationToDatabase(userId, title, body, data);

      return { success: true, result };
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
      // Get receiver info to check if they're in the chat
      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      if (!receiverDoc.exists()) return;

      const receiverData = receiverDoc.data();

      // Don't send notification if receiver is currently in this chat room
      if (receiverData.activeChatId === chatId) {
        return;
      }

      // Check if sender is muted by receiver
      const mutedUsers = receiverData.mutedUsers || [];
      if (mutedUsers.includes(senderId)) {
        // User is muted, don't send notification
        return;
      }

      // Check if sender is blocked by receiver
      const blockedUsers = receiverData.blockedUsers || [];
      if (blockedUsers.includes(senderId)) {
        // User is blocked, don't send notification
        return;
      }

      // Load notification settings
      const settings = await loadNotificationSettings();

      // Check if notifications are enabled
      if (!settings.enabled || !settings.messageNotifications) {
        return;
      }

      // Check quiet hours
      if (settings.muteFrom && settings.muteTo) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [muteFromHour, muteFromMin] = settings.muteFrom.split(':').map(Number);
        const [muteToHour, muteToMin] = settings.muteTo.split(':').map(Number);
        const muteFromTime = muteFromHour * 60 + muteFromMin;
        const muteToTime = muteToHour * 60 + muteToMin;

        // Handle overnight quiet hours (e.g., 23:00 to 07:00)
        if (muteFromTime > muteToTime) {
          if (currentTime >= muteFromTime || currentTime < muteToTime) {
            return; // In quiet hours
          }
        } else {
          if (currentTime >= muteFromTime && currentTime < muteToTime) {
            return; // In quiet hours
          }
        }
      }

      // Get sender info
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      if (!senderDoc.exists()) return;

      const senderName = senderDoc.data().displayName || 'Someone';

      // Determine message preview based on settings
      const messageBody = settings.showPreview ? message : 'New message';

      // Trigger vibration if enabled
      if (settings.vibration && Platform.OS !== 'web') {
        // Note: Vibration is handled by the notification system automatically
      }

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
    }
  }

  // Send follow notification
  async sendFollowNotification(followerId, followedUserId) {
    try {
      // Load notification settings
      const settings = await loadNotificationSettings();

      // Check if notifications are enabled
      if (!settings.enabled || !settings.followNotifications) {
        return;
      }

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
    }
  }

  // Send incoming call notification
  async sendCallNotification(callerId, receiverId, callType, callId) {
    try {
      // Get receiver's push token
      const receiverDoc = await getDoc(doc(db, 'users', receiverId));
      if (!receiverDoc.exists()) return { success: false };

      const pushToken = receiverDoc.data().pushToken;
      if (!pushToken) return { success: false };

      // Get caller info
      const callerDoc = await getDoc(doc(db, 'users', callerId));
      if (!callerDoc.exists()) return { success: false };

      const callerName = callerDoc.data().displayName || 'Someone';

      // Send high-priority notification for incoming call
      const message = {
        to: pushToken,
        sound: 'default',
        title: `Incoming ${callType === 'video' ? 'Video' : 'Audio'} Call`,
        body: `${callerName} is calling you...`,
        data: {
          type: 'call',
          callId: callId,
          callerId: callerId,
          callType: callType
        },
        badge: 1,
        priority: 'high',
        channelId: 'calls', // Android channel for calls
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
      return { success: true, result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send missed call notification
  async sendMissedCallNotification(callerId, receiverId, callType) {
    try {
      const callerDoc = await getDoc(doc(db, 'users', callerId));
      if (!callerDoc.exists()) return;

      const callerName = callerDoc.data().displayName || 'Someone';

      await this.sendNotificationToUser(
        receiverId,
        'Missed Call',
        `You missed a ${callType === 'video' ? 'video' : 'audio'} call from ${callerName}`,
        {
          type: 'missedCall',
          callerId: callerId,
          callType: callType
        }
      );
    } catch (error) {
      console.error('Error sending missed call notification:', error);
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
    } catch (error) {
    }
  }

  // Cancel all scheduled notifications
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export default new NotificationService();