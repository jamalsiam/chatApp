import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import authService from './src/services/authService';

// Auth Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

// Main App Screens
import AlbumScreen from './src/screens/AlbumScreen';
import CallsScreen from './src/screens/CallsScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import FeedScreen from './src/screens/FeedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchUsersScreen from './src/screens/SearchUsersScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder Chat Room Component (for now)
function ChatRoomPlaceholder() {
  return (
    <View style={{ flex: 1, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' }}>
      <Icon name="chatbubbles" size={80} color="#6C5CE7" />
      <Text style={{ color: '#fff', fontSize: 20, marginTop: 20, fontWeight: 'bold' }}>
        Chat Room
      </Text>
      <Text style={{ color: '#888', fontSize: 14, marginTop: 10 }}>
        Coming up
      </Text>
    </View>
  );
}

// Bottom Tab Navigator
function HomeTabs() {
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
            case 'Album':
              iconName = focused ? 'images' : 'images-outline';
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
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Calls" component={CallsScreen} />
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Album" component={AlbumScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#1A1A1A' 
      }}>
        <ActivityIndicator size="large" color="#6C5CE7" />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
            <Stack.Screen name="ChatRoom" component={ChatRoomPlaceholder} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}