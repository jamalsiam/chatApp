import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

class AuthService {
  // Register with Email/Password
  async register(email, password, fullName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: fullName,
      });

      // Create user document in Firestore with 300 initial coins
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: email,
        displayName: fullName,
        photoURL: '',
        bio: '',
        status: 'Hey there! I am using ChatApp',
        balanceCoins: 300,
        followers: [],
        following: [],
        blockedUsers: [],
        mutedUsers: [],
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isOnline: true
      });

      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Login with Email/Password
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update online status
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        isOnline: true,
        lastSeen: serverTimestamp()
      }, { merge: true });

      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Guest Login
  async guestLogin() {
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      // Create guest user document with 300 coins
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: '',
        displayName: 'Guest User',
        photoURL: '',
        bio: '',
        status: 'Guest',
        balanceCoins: 300,
        isGuest: true,
        followers: [],
        following: [],
        blockedUsers: [],
        mutedUsers: [],
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        isOnline: true
      });

      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Sign Out
  async signOut() {
    try {
      const user = auth.currentUser;
      if (user) {
        // Update offline status
        await setDoc(doc(db, 'users', user.uid), {
          isOnline: false,
          lastSeen: serverTimestamp()
        }, { merge: true });
      }
      await firebaseSignOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get Current User
  getCurrentUser() {
    return auth.currentUser;
  }

  // Listen to Auth State Changes
  onAuthStateChanged(callback) {
    return auth.onAuthStateChanged(callback);
  }
}

export default new AuthService();