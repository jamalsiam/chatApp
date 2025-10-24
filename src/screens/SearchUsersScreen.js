import { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import authService from '../services/authService';
import chatService from '../services/chatService';
import userService from '../services/userService';

export default function SearchUsersScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    loadAllUsers();
  }, []);

  const loadAllUsers = async () => {
    const fetchedUsers = await userService.getAllUsers();
    // Filter out current user
    const filtered = fetchedUsers.filter(u => u.id !== currentUser.uid);
    setAllUsers(filtered);
    setUsers(filtered);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setUsers(allUsers);
    } else {
      const filtered = allUsers.filter((user) =>
        user.displayName?.toLowerCase().includes(query.toLowerCase())
      );
      setUsers(filtered);
    }
  };

  const handleSelectUser = async (user) => {
    try {
      // Create or get existing chat room
      const chatId = await chatService.getOrCreateChatRoom(currentUser.uid, user.id);
      
      // Navigate to chat room (we'll create this in next task)
      navigation.navigate('ChatRoom', {
        chatId,
        otherUser: user
      });
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleSelectUser(item)}
    >
      {item.photoURL ? (
        <Image source={{ uri: item.photoURL }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{getInitials(item.displayName)}</Text>
        </View>
      )}

      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.displayName}</Text>
        {item.email && <Text style={styles.userEmail}>{item.email}</Text>}
      </View>

      {item.isOnline && <View style={styles.onlineIndicator} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearch}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color="#888" />
          </TouchableOpacity>
        )}
      </View>

      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="people-outline" size={80} color="#444" />
          <Text style={styles.emptyText}>No users found</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    marginBottom: 20,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#888',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00D856',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 15,
  },
});