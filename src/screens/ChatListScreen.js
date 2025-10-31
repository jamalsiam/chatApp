import { format, isToday, isYesterday } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

export default function ChatListScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getCurrentUser();

  useEffect(() => {
    // Listen to chat list
    const unsubscribe = chatService.listenToChatList(currentUser.uid, (chatList) => {
      setChats(chatList);
      setFilteredChats(chatList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter((chat) => {
        if (chat.isGroup) {
          return chat.groupName?.toLowerCase().includes(query.toLowerCase());
        }
        return chat.otherUser?.displayName?.toLowerCase().includes(query.toLowerCase());
      });
      setFilteredChats(filtered);
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

  const formatTimestamp = (date) => {
    if (!date) return '';

    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  const renderChatItem = ({ item }) => {
    const unreadCount = item.unreadCount?.[currentUser?.uid] || 0;
    const lastMessageTime = item.lastMessageTime?.toDate?.();
    const isGroup = item.isGroup;

    // Check if current user sent the last message
    const isSentByMe = item.lastMessageSenderId === currentUser?.uid;
    const isLastMessageRead = item.lastMessageRead || false;

    // Check if other user is typing
    const typing = item.typing || {};
    const otherUserId = item.otherUser?.id;
    let isOtherUserTyping = false;

    if (!isGroup && otherUserId && typing[otherUserId]) {
      const typingTimestamp = typing[otherUserId];
      const now = new Date();
      const typingTime = typingTimestamp.toDate ? typingTimestamp.toDate() : new Date(typingTimestamp);
      const diff = now - typingTime;
      isOtherUserTyping = diff < 3000; // Consider typing if within last 3 seconds
    }

    // For groups, prepare group info
    const displayName = isGroup ? item.groupName : item.otherUser?.displayName;
    const displayPhoto = isGroup ? item.groupPhoto : item.otherUser?.photoURL;
    const memberCount = isGroup ? item.participants?.length : 0;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => {
          if (isGroup) {
            navigation.navigate('ChatRoom', {
              chatId: item.chatId,
              otherUser: { displayName: item.groupName, photoURL: item.groupPhoto },
              isGroup: true,
              groupName: item.groupName,
              groupPhoto: item.groupPhoto,
              participants: item.participants,
              admin: item.admin
            });
          } else {
            navigation.navigate('ChatRoom', {
              chatId: item.chatId,
              otherUser: item.otherUser
            });
          }
        }}
      >
        <View style={styles.avatarContainer}>
          {displayPhoto ? (
            <Image
              source={{ uri: displayPhoto }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, isGroup && styles.groupAvatarPlaceholder]}>
              {isGroup ? (
                <Icon name="people" size={24} color="#fff" />
              ) : (
                <Text style={styles.avatarText}>
                  {getInitials(displayName)}
                </Text>
              )}
            </View>
          )}
          {!isGroup && item.otherUser?.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <View style={styles.chatNameContainer}>
              <Text style={[
                styles.chatName,
                unreadCount > 0 && styles.unreadChatName
              ]}>{displayName}</Text>
              {isGroup && (
                <Text style={styles.memberCount}>({memberCount})</Text>
              )}
            </View>
            {lastMessageTime && (
              <Text style={styles.timestamp}>
                {formatTimestamp(lastMessageTime)}
              </Text>
            )}
          </View>
          <View style={styles.chatFooter}>
            <View style={styles.lastMessageContainer}>
              {isSentByMe && !isOtherUserTyping && (
                <Icon
                  name={isLastMessageRead ? "checkmark-done" : "checkmark"}
                  size={16}
                  color={isLastMessageRead ? "#4A9EFF" : "#888"}
                  style={styles.readIcon}
                />
              )}
              <Text style={[
                styles.lastMessage,
                unreadCount > 0 && styles.unreadMessage,
                isOtherUserTyping && styles.typingMessage
              ]} numberOfLines={1}>
                {isOtherUserTyping ? 'typing...' : (item.lastMessage || 'No messages yet')}
              </Text>
            </View>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('CreateGroup')}
            style={styles.headerButton}
          >
            <Icon name="people" size={24} color="#6C5CE7" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SearchUsers')}>
            <Icon name="add-circle" size={28} color="#6C5CE7" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats..."
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      ) : filteredChats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="chatbubbles-outline" size={80} color="#444" />
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>
            Start a conversation with someone!
          </Text>
          <TouchableOpacity
            style={styles.newChatButton}
            onPress={() => navigation.navigate('SearchUsers')}
          >
            <Icon name="add" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.newChatButtonText}>New Chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.chatId}
          renderItem={renderChatItem}
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginRight: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    marginBottom: 15,
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
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 5,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00D856',
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  unreadChatName: {
    fontWeight: 'bold',
  },
  memberCount: {
    fontSize: 13,
    color: '#888',
    marginLeft: 5,
  },
  groupAvatarPlaceholder: {
    backgroundColor: '#6C5CE7',
  },
  timestamp: {
    fontSize: 12,
    color: '#888',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessageContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  readIcon: {
    marginRight: 4,
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#888',
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#fff',
  },
  typingMessage: {
    color: '#6C5CE7',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#6C5CE7',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    fontSize: 14,
    marginTop: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
    textAlign: 'center',
  },
  newChatButton: {
    flexDirection: 'row',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginTop: 30,
    alignItems: 'center',
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});