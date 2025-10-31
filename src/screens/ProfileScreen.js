import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import authService from '../services/authService';
import chatService from '../services/chatService';
import userService from '../services/userService';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 6) / 3;

export default function ProfileScreen({ route, navigation }) {
  const { userId } = route.params || {};
  const currentUser = authService.getCurrentUser();
  const isOwnProfile = !userId || userId === currentUser.uid;
  const targetUserId = userId || currentUser.uid;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [galleryPosts, setGalleryPosts] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadProfile();
    loadGalleryPosts();
  }, [targetUserId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const profileData = await userService.getUserProfile(targetUserId);
      setProfile(profileData);
      
      setFollowersCount(profileData.followers?.length || 0);
      setFollowingCount(profileData.following?.length || 0);

      if (!isOwnProfile) {
        const following = await userService.isFollowing(currentUser.uid, targetUserId);
        setIsFollowing(following);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadGalleryPosts = async () => {
    try {
      const posts = await userService.getUserGalleryPosts(targetUserId);
      setGalleryPosts(posts);
     
    } catch (error) {
    }
  };

  const handleAddPhoto = async () => {
    Alert.alert(
      'Add to Gallery',
      'Choose an option',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Choose Photo', onPress: handleChoosePhoto },
        { text: 'Choose Video', onPress: handleChooseVideo },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const handleChoosePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need permission to access your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        let imageUri = result.assets[0].uri;
        
        // Convert HEIC to JPEG
        if (imageUri.toLowerCase().endsWith('.heic') || 
            imageUri.toLowerCase().endsWith('.heif')) {
          const manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          imageUri = manipResult.uri;
        }
        
        await uploadToGallery(imageUri, 'image');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to choose photo');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera permission');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        let imageUri = result.assets[0].uri;
        
        if (imageUri.toLowerCase().endsWith('.heic') || 
            imageUri.toLowerCase().endsWith('.heif')) {
          const manipResult = await ImageManipulator.manipulateAsync(
            imageUri,
            [],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
          );
          imageUri = manipResult.uri;
        }
        
        await uploadToGallery(imageUri, 'image');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleChooseVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need permission to access your videos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        await uploadToGallery(result.assets[0].uri, 'video');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to choose video');
    }
  };

  const uploadToGallery = async (mediaUri, mediaType) => {
    try {
      setUploading(true);
     
      
      const result = await userService.uploadGalleryPost(currentUser.uid, mediaUri, mediaType);
      
      if (result.success) {
        
        Alert.alert('Success', 'Added to gallery!');
        await loadGalleryPosts(); // Reload gallery
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  const handleFollowToggle = async () => {
    try {
      if (isFollowing) {
        const result = await userService.unfollowUser(currentUser.uid, targetUserId);
        if (result.success) {
          setIsFollowing(false);
          setFollowersCount(prev => prev - 1);
        }
      } else {
        const result = await userService.followUser(currentUser.uid, targetUserId);
        if (result.success) {
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update follow status');
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  const handleMessage = async () => {
    try {
      const chatId = await chatService.getOrCreateChatRoom(currentUser.uid, targetUserId);
      navigation.navigate('ChatRoom', {
        chatId,
        otherUser: {
          id: targetUserId,
          displayName: profile.displayName,
          photoURL: profile.photoURL
        }
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to open chat');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    await loadGalleryPosts();
    setRefreshing(false);
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

  const renderMediaItem = ({ item }) => (
    <TouchableOpacity
      style={styles.mediaItem}
      onPress={() => navigation.navigate('MediaViewer', {
        mediaUrl: item.mediaUrl,
        mediaType: item.mediaType
      })}
      onLongPress={() => {
        if (isOwnProfile) {
          Alert.alert(
            'Delete Post',
            'Are you sure you want to delete this post?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await userService.deleteGalleryPost(item.id, item.mediaUrl);
                  await loadGalleryPosts();
                }
              }
            ]
          );
        }
      }}
    >
      <Image
        source={{ uri: item.mediaUrl }}
        style={styles.mediaImage}
        resizeMode="cover"
      />
      {item.mediaType === 'video' && (
        <View style={styles.videoOverlay}>
          <Icon name="play-circle" size={30} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={60} color="#888" />
        <Text style={styles.errorText}>Profile not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
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
        <Text style={styles.headerTitle}>{profile.displayName}</Text>
        {isOwnProfile && (
          <View style={{ flexDirection: 'row', gap: 15 }}>
            <TouchableOpacity onPress={() => navigation.navigate('NotificationSettings')}>
              <Icon name="settings-outline" size={24} color="#6C5CE7" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddPhoto}>
              <Icon name="add-circle" size={24} color="#6C5CE7" />
            </TouchableOpacity>
          </View>
        )}
        {!isOwnProfile && <View style={{ width: 24 }} />}
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profilePictureContainer}>
            {profile.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePicturePlaceholder}>
                <Text style={styles.profileInitials}>{getInitials(profile.displayName)}</Text>
              </View>
            )}
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{galleryPosts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowersList', {
                userId: targetUserId,
                type: 'followers'
              })}
            >
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() => navigation.navigate('FollowersList', {
                userId: targetUserId,
                type: 'following'
              })}
            >
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name and Bio */}
        <View style={styles.infoContainer}>
          <Text style={styles.displayName}>{profile.displayName}</Text>
          {profile.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <Text style={styles.bioPlaceholder}>No bio yet</Text>
          )}
          <View style={styles.coinsContainer}>
            <Icon name="wallet" size={16} color="#FFD700" />
            <Text style={styles.coinsText}>{profile.balanceCoins || 0} coins</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isOwnProfile ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Icon name="create-outline" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={handleFollowToggle}
              >
                <Icon
                  name={isFollowing ? "checkmark" : "person-add"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.followButtonText}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Icon name="chatbubble-outline" size={20} color="#fff" />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Gallery Section */}
        <View style={styles.mediaSection}>
          <View style={styles.mediaSectionHeader}>
            <Icon name="grid-outline" size={20} color="#fff" />
            <Text style={styles.mediaSectionTitle}>Gallery</Text>
          </View>

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator color="#6C5CE7" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}

          {galleryPosts.length > 0 ? (
            <FlatList
              data={galleryPosts}
              renderItem={renderMediaItem}
              keyExtractor={(item) => item.id}
              numColumns={3}
              scrollEnabled={false}
              columnWrapperStyle={styles.mediaRow}
            />
          ) : (
            <View style={styles.emptyMediaContainer}>
              <Icon name="images-outline" size={60} color="#444" />
              <Text style={styles.emptyMediaText}>
                {isOwnProfile ? 'No photos yet. Add your first!' : 'No photos yet'}
              </Text>
              {isOwnProfile && (
                <TouchableOpacity style={styles.addFirstButton} onPress={handleAddPhoto}>
                  <Icon name="add-circle" size={20} color="#fff" />
                  <Text style={styles.addFirstButtonText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: '#888',
    marginTop: 15,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#6C5CE7',
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  profilePictureContainer: {
    marginRight: 20,
  },
  profilePicture: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#6C5CE7',
  },
  profilePicturePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#6C5CE7',
  },
  profileInitials: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  infoContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  bio: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 10,
  },
  bioPlaceholder: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  coinsText: {
    fontSize: 14,
    color: '#FFD700',
    marginLeft: 5,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C5CE7',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  followingButton: {
    backgroundColor: '#444',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#444',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mediaSection: {
    paddingTop: 10,
  },
  mediaSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 10,
  },
  mediaSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 10,
  },
  uploadingText: {
    color: '#888',
    fontSize: 14,
  },
  mediaRow: {
    gap: 2,
    paddingHorizontal: 0,
  },
  mediaItem: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    marginBottom: 2,
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  emptyMediaContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMediaText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6C5CE7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});