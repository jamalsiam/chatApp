import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Platform } from 'react-native';
import { db, storage } from '../config/firebase';
import notificationService from './NotificationService';

// Local server configuration for gallery posts
const LOCAL_SERVER_CONFIG = {
  uploadUrl: Platform.select({
    ios: 'http://localhost:3000/upload-gallery',
    android: 'http://10.0.2.2:3000/upload-gallery',
    default: 'http://192.168.1.100:3000/upload-gallery'
  }),
  mediaBaseUrl: Platform.select({
    ios: 'http://localhost:3000/gallery',
    android: 'http://10.0.2.2:3000/gallery',
    default: 'http://192.168.1.100:3000/gallery'
  })
};

class UserService {
  // Get user profile
  async getUserProfile(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: userDoc.id,
          ...userData,
          followers: userData.followers || [],
          following: userData.following || [],
          bio: userData.bio || ''
        };
      } else {
        throw new Error('User not found');
      }
    } catch (error) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, updates) {
    try {
      const userRef = doc(db, 'users', userId);

      const allowedUpdates = {};
      if (updates.displayName !== undefined) allowedUpdates.displayName = updates.displayName;
      if (updates.bio !== undefined) allowedUpdates.bio = updates.bio;
      if (updates.photoURL !== undefined) allowedUpdates.photoURL = updates.photoURL;

      await updateDoc(userRef, {
        ...allowedUpdates,
        updatedAt: serverTimestamp()
      });


      return { success: true };
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Upload profile photo (to Firebase Storage)
  async uploadProfilePhoto(userId, imageUri) {
    try {


      const filename = `profile_${userId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `profile_photos/${filename}`);

      const response = await fetch(imageUri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);


      return downloadURL;
    } catch (error) {

      throw error;
    }
  }

  // ========================================
  // GALLERY POSTS (Separate from chat media)
  // ========================================

  // Upload gallery post to LOCAL SERVER
  async uploadGalleryPost(userId, mediaUri, mediaType) {
    try {


      // Create form data
      const formData = new FormData();

      const uriParts = mediaUri.split('.');
      const fileType = uriParts[uriParts.length - 1].toLowerCase();

      let mimeType = mediaType === 'video' ? `video/${fileType}` : `image/${fileType}`;
      if (fileType === 'jpg' || fileType === 'jpeg') {
        mimeType = 'image/jpeg';
      } else if (fileType === 'png') {
        mimeType = 'image/png';
      }

      const fileName = `${Date.now()}.${fileType}`;

      formData.append('file', {
        uri: mediaUri,
        type: mimeType,
        name: fileName,
      });

      formData.append('userId', userId);
      formData.append('timestamp', Date.now().toString());



      const response = await fetch(LOCAL_SERVER_CONFIG.uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      const mediaUrl = result.url;



      // Save post reference in Firestore
      const postData = {
        userId: userId,
        mediaUrl: mediaUrl,
        mediaType: mediaType,
        createdAt: serverTimestamp()
      };

      const postRef = await addDoc(collection(db, 'gallery_posts'), postData);

      return {
        success: true,
        postId: postRef.id,
        mediaUrl: mediaUrl
      };
    } catch (error) {
      console.error('❌ Error uploading gallery post:', error);
      throw error;
    }
  }

  // Get user's gallery posts
  async getUserGalleryPosts(userId) {
    try {

      const postsRef = collection(db, 'gallery_posts');
      const q = query(
        postsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const posts = [];

      snapshot.forEach((doc) => {
        posts.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return posts;
    } catch (error) {
      console.error('Error getting gallery posts:', error);
      return [];
    }
  }

  // Delete gallery post
  async deleteGalleryPost(postId, mediaUrl) {
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'gallery_posts', postId));

      // Optionally: Delete from server
      // You can add a DELETE endpoint to your server


      return { success: true };
    } catch (error) {

      return { success: false, error: error.message };
    }
  }

  // ========================================
  // FOLLOW SYSTEM
  // ========================================

  async followUser(currentUserId, targetUserId) {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      await updateDoc(currentUserRef, {
        following: arrayUnion(targetUserId)
      });

      await updateDoc(targetUserRef, {
        followers: arrayUnion(currentUserId)
      });

      return { success: true };
    } catch (error) {

      return { success: false, error: error.message };
    }
  }

  async unfollowUser(currentUserId, targetUserId) {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      await updateDoc(currentUserRef, {
        following: arrayRemove(targetUserId)
      });

      await updateDoc(targetUserRef, {
        followers: arrayRemove(currentUserId)
      });


      return { success: true };
    } catch (error) {

      return { success: false, error: error.message };
    }
  }

  async isFollowing(currentUserId, targetUserId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      if (userDoc.exists()) {
        const following = userDoc.data().following || [];
        return following.includes(targetUserId);
      }
      return false;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  async getFollowers(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const followers = userDoc.data().followers || [];

        const followerDetails = await Promise.all(
          followers.map(async (followerId) => {
            const followerDoc = await getDoc(doc(db, 'users', followerId));
            if (followerDoc.exists()) {
              return { id: followerId, ...followerDoc.data() };
            }
            return null;
          })
        );

        return followerDetails.filter(f => f !== null);
      }
      return [];
    } catch (error) {

      return [];
    }
  }

  async getFollowing(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const following = userDoc.data().following || [];

        const followingDetails = await Promise.all(
          following.map(async (followingId) => {
            const followingDoc = await getDoc(doc(db, 'users', followingId));
            if (followingDoc.exists()) {
              return { id: followingId, ...followingDoc.data() };
            }
            return null;
          })
        );

        return followingDetails.filter(f => f !== null);
      }
      return [];
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }

  // Search users
  async searchUsers(searchTerm) {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      const users = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        const displayName = userData.displayName || '';
        const email = userData.email || '';

        if (
          displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          email.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          users.push({ id: doc.id, ...userData });
        }
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // Initialize user profile
  async initializeUserProfile(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        const updates = {};
        if (!userData.bio) updates.bio = '';
        if (!userData.followers) updates.followers = [];
        if (!userData.following) updates.following = [];

        if (Object.keys(updates).length > 0) {
          await updateDoc(userRef, updates);

        }
      }
    } catch (error) {

    }
  }
  async followUser(currentUserId, targetUserId) {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      const targetUserRef = doc(db, 'users', targetUserId);

      await updateDoc(currentUserRef, {
        following: arrayUnion(targetUserId)
      });

      await updateDoc(targetUserRef, {
        followers: arrayUnion(currentUserId)
      });


      await notificationService.sendFollowNotification(currentUserId, targetUserId);


      return { success: true };
    } catch (error) {

      return { success: false, error: error.message };
    }
  }
  async getAllUsers() {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);

      const users = [];
      snapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });

      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // Block user
  async blockUser(currentUserId, targetUserId) {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      await updateDoc(currentUserRef, {
        blockedUsers: arrayUnion(targetUserId)
      });
      return { success: true };
    } catch (error) {
      console.error('Error blocking user:', error);
      return { success: false, error: error.message };
    }
  }

  // Unblock user
  async unblockUser(currentUserId, targetUserId) {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      await updateDoc(currentUserRef, {
        blockedUsers: arrayRemove(targetUserId)
      });
      return { success: true };
    } catch (error) {
      console.error('Error unblocking user:', error);
      return { success: false, error: error.message };
    }
  }

  // Mute user
  async muteUser(currentUserId, targetUserId) {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      await updateDoc(currentUserRef, {
        mutedUsers: arrayUnion(targetUserId)
      });
      return { success: true };
    } catch (error) {
      console.error('Error muting user:', error);
      return { success: false, error: error.message };
    }
  }

  // Unmute user
  async unmuteUser(currentUserId, targetUserId) {
    try {
      const currentUserRef = doc(db, 'users', currentUserId);
      await updateDoc(currentUserRef, {
        mutedUsers: arrayRemove(targetUserId)
      });
      return { success: true };
    } catch (error) {
      console.error('Error unmuting user:', error);
      return { success: false, error: error.message };
    }
  }

  // Report user
  async reportUser(reporterId, reportedUserId, reason) {
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId,
        reportedUserId,
        reason,
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      return { success: true };
    } catch (error) {
      console.error('Error reporting user:', error);
      return { success: false, error: error.message };
    }
  }

  // Check if user is blocked
  async isUserBlocked(currentUserId, targetUserId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      const userData = userDoc.data();
      const blockedUsers = userData.blockedUsers || [];
      return blockedUsers.includes(targetUserId);
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  }

  // Check if user is muted
  async isUserMuted(currentUserId, targetUserId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));
      const userData = userDoc.data();
      const mutedUsers = userData.mutedUsers || [];
      return mutedUsers.includes(targetUserId);
    } catch (error) {
      console.error('Error checking if user is muted:', error);
      return false;
    }
  }
}

export default new UserService();