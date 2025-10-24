import {
    collection,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

class UserService {
  // Get User Profile
  async getUserProfile(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { success: true, user: { id: userDoc.id, ...userDoc.data() } };
      }
      return { success: false, error: 'User not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Search Users
  async searchUsers(searchTerm) {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const users = [];
      snapshot.forEach((doc) => {
        const userData = doc.data();
        if (userData.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) {
          users.push({ id: doc.id, ...userData });
        }
      });

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }

  // Get All Users (for listing)
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

  // Update Online Status
  async updateOnlineStatus(userId, isOnline) {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isOnline,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  }
}

export default new UserService();