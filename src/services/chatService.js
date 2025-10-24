import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
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
        // Create new chat room
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
        
        // Get other user data
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