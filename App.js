import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './src/config/firebase';
import authService from './src/services/authService';
import chatService from './src/services/chatService';
import notificationService from './src/services/NotificationService';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Main App Screens
import CallsScreen from './src/screens/CallsScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatRoomScreen from './src/screens/ChatRoomScreen';
import CreateGroupScreen from './src/screens/CreateGroupScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import FeedScreen from './src/screens/FeedScreen';
import FollowersListScreen from './src/screens/FollowersListScreen';
import MediaViewerScreen from './src/screens/MediaViewerScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchUsersScreen from './src/screens/SearchUsersScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function HomeTabs() {
  const [unreadCount, setUnreadCount] = useState(0);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    if (!currentUser) return;

    // Listen to chat list for unread count
    const unsubscribe = chatService.listenToChatList(currentUser.uid, (chatList) => {
      // Calculate total unread messages
      const total = chatList.reduce((sum, chat) => {
        const count = chat.unreadCount?.[currentUser.uid] || 0;
        return sum + count;
      }, 0);
      setUnreadCount(total);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'Chats':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Calls':
              iconName = focused ? 'call' : 'call-outline';
              break;
            case 'Feed':
              iconName = focused ? 'play-circle' : 'play-circle-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#2A2A2A',
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Chats"
        component={ChatListScreen}
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : null,
          tabBarBadgeStyle: {
            backgroundColor: '#6C5CE7',
            color: '#fff',
            fontSize: 10,
            fontWeight: 'bold',
          },
        }}
      />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigationRef = useRef();

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = authService.onAuthStateChanged(async (user) => {
      setIsAuthenticated(!!user);

      // Initialize notifications when user logs in
      if (user) {
        const result = await notificationService.initialize(user.uid);
        if (result.success) {
        }

        // Set user as online
        await setDoc(doc(db, 'users', user.uid), {
          isOnline: true,
          lastSeen: serverTimestamp()
        }, { merge: true });
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
      notificationService.removeListeners();
    };
  }, []);

  // Track app state for online/offline status
  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const user = authService.getCurrentUser();
      if (!user) return;

      if (nextAppState === 'active') {
        // App came to foreground - set online
        await setDoc(doc(db, 'users', user.uid), {
          isOnline: true,
          lastSeen: serverTimestamp()
        }, { merge: true });
      } else if (nextAppState === 'background') {
        // App went to background - set offline (not on inactive to avoid false negatives)
        await setDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: serverTimestamp()
        }, { merge: true });
      }
    });

    // Set up heartbeat to update lastSeen every 30 seconds while app is active
    const heartbeatInterval = setInterval(async () => {
      const user = authService.getCurrentUser();
      if (user && AppState.currentState === 'active') {
        await setDoc(doc(db, 'users', user.uid), {
          lastSeen: serverTimestamp(),
          isOnline: true
        }, { merge: true });
      }
    }, 30000); // Update every 30 seconds

    return () => {
      subscription.remove();
      clearInterval(heartbeatInterval);

      // Mark offline when component unmounts
      const user = authService.getCurrentUser();
      if (user) {
        setDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: serverTimestamp()
        }, { merge: true }).catch(() => {});
      }
    };
  }, [isAuthenticated]);

  // Handle notification tap navigation
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      if (notificationService.onNotificationTap && navigationRef.current) {
        const data = notificationService.onNotificationTap;
        
        // Navigate based on notification type
        if (data.type === 'message' && data.chatId) {
          navigationRef.current.navigate('ChatRoom', {
            chatId: data.chatId,
            otherUser: { id: data.senderId }
          });
        } else if (data.type === 'follow' && data.userId) {
          navigationRef.current.navigate('Profile', { userId: data.userId });
        }
        
        // Clear notification tap data
        notificationService.onNotificationTap = null;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#1A1A1A',
        }}
      >
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Auth Stack
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          // Main App Stack
          <>
            <Stack.Screen name="Home" component={HomeTabs} />
            <Stack.Screen name="SearchUsers" component={SearchUsersScreen} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="MediaViewer" component={MediaViewerScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="FollowersList" component={FollowersListScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="CreateGroup" component={CreateGroupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}