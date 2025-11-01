import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import authService from '../services/authService';
import userService from '../services/userService';

export default function FollowersListScreen({ route, navigation }) {
  const { userId, type } = route.params; // type: 'followers' or 'following'
  const currentUser = authService.getCurrentUser();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState({}); // Track who current user follows

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      let usersList = [];
      if (type === 'followers') {
        usersList = await userService.getFollowers(userId);
      } else {
        usersList = await userService.getFollowing(userId);
      }
      
      setUsers(usersList);
      
      // Load current user's following list to show follow status
      if (userId !== currentUser.uid) {
        const currentUserProfile = await userService.getUserProfile(currentUser.uid);
        const following = currentUserProfile.following || [];
        const followMap = {};
        following.forEach(id => {
          followMap[id] = true;
        });
        setFollowingMap(followMap);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetUserId) => {
    try {
      const isFollowing = followingMap[targetUserId];
      
      if (isFollowing) {
        await userService.unfollowUser(currentUser.uid, targetUserId);
        setFollowingMap(prev => ({ ...prev, [targetUserId]: false }));
      } else {
        await userService.followUser(currentUser.uid, targetUserId);
        setFollowingMap(prev => ({ ...prev, [targetUserId]: true }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleUserPress = (user) => {
    if (user.id === currentUser.uid) {
      // Navigate to own profile
      navigation.navigate('Profile');
    } else {
      // Navigate to user's profile
      navigation.push('Profile', { userId: user.id });
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

  const renderUser = ({ item }) => {
    const isCurrentUser = item.id === currentUser.uid;
    const isFollowing = followingMap[item.id];

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserPress(item)}
      >
        {/* Profile Picture */}
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.userAvatar} />
        ) : (
          <View style={styles.userAvatarPlaceholder}>
            <Text style={styles.userInitials}>{getInitials(item.displayName)}</Text>
          </View>
        )}

        {/* User Info */}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName}</Text>
          {item.bio ? (
            <Text style={styles.userBio} numberOfLines={1}>{item.bio}</Text>
          ) : null}
        </View>

        {/* Follow Button */}
        {!isCurrentUser && (
          <TouchableOpacity
            style={[
              styles.followButton,
              isFollowing && styles.followingButton
            ]}
            onPress={() => handleFollowToggle(item.id)}
          >
            <Text style={styles.followButtonText}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon
        name={type === 'followers' ? 'people-outline' : 'person-add-outline'}
        size={60}
        color="#444"
      />
      <Text style={styles.emptyText}>
        {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'followers' ? 'Followers' : 'Following'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C5CE7" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
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
  },
  loadingText: {
    marginTop: 10,
    color: '#888',
    fontSize: 16,
  },
  listContent: {
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  userBio: {
    fontSize: 14,
    color: '#888',
  },
  followButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#6C5CE7',
    borderRadius: 6,
  },
  followingButton: {
    backgroundColor: '#444',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
});