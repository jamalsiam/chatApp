import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

class ChatService {
  // Get or Create Chat Room
  async getOrCreateChatRoom(userId1, userId2) {
    try {
      const chatId = [userId1, userId2].sort().join('_');
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);

      if (!chatDoc.exists()) {
        await setDoc(chatRef, {
          participants: [userId1, userId2],
          createdAt: serverTimestamp(),
          lastMessage: '',
          lastMessageTime: serverTimestamp(),
          unreadCount: { [userId1]: 0, [userId2]: 0 }
        });
      }

      return chatId;
    } catch (error) {
      console.error('Error creating chat room:', error);
      throw error;
    }
  }

  // Send Message
  async sendMessage(chatId, senderId, receiverId, message) {
    try {
      // Check if sender has enough coins
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      const senderData = senderDoc.data();

      if (senderData.balanceCoins < 1) {
        return { success: false, error: 'Insufficient coins' };
      }

      // Deduct 1 coin from sender
      await updateDoc(doc(db, 'users', senderId), {
        balanceCoins: increment(-1)
      });

      // Add 1 coin to receiver
      await updateDoc(doc(db, 'users', receiverId), {
        balanceCoins: increment(1)
      });

      // Add message
      const messageData = {
        chatId,
        senderId,
        receiverId,
        message,
        timestamp: serverTimestamp(),
        read: false
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Update chat with last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: message,
        lastMessageTime: serverTimestamp(),
        [`unreadCount.${receiverId}`]: increment(1)
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Listen to Messages
  listenToMessages(chatId, callback) {
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({ id: doc.id, ...doc.data() });
      });
      callback(messages);
    });
  }

  // Mark Messages as Read
  async markAsRead(chatId, userId) {
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        [`unreadCount.${userId}`]: 0
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  // Listen to Chat List
  listenToChatList(userId, callback) {
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageTime', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
      const chats = [];
      
      for (const docSnap of snapshot.docs) {
        const chatData = docSnap.data();
        const otherUserId = chatData.participants.find(id => id !== userId);
        
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        const userData = userDoc.exists() ? userDoc.data() : null;

        chats.push({
          chatId: docSnap.id,
          ...chatData,
          otherUser: { id: otherUserId, ...userData }
        });
      }

      callback(chats);
    });
  }
}

export default new ChatService();