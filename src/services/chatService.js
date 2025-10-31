import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../config/firebase';

// Configuration for your local server
// IMPORTANT: Replace YOUR_LOCAL_IP with your actual IP address!
const LOCAL_SERVER_CONFIG = {
  // Platform-specific URLs for different environments
  uploadUrl: Platform.select({
    ios: 'http://localhost:3000/upload',           // iOS Simulator
    android: 'http://10.0.2.2:3000/upload',        // Android Emulator
    default: 'http://192.168.1.100:3000/upload'    // Real Device - CHANGE THIS!
  }),
  mediaBaseUrl: Platform.select({
    ios: 'http://localhost:3000/media',            // iOS Simulator
    android: 'http://10.0.2.2:3000/media',         // Android Emulator
    default: 'http://192.168.1.100:3000/media'     // Real Device - CHANGE THIS!
  })
};

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

  // Upload Media to Local Server
  async uploadMedia(uri, chatId) {
    try {
      

      // Create form data
      const formData = new FormData();
      
      // Get file extension from URI
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1].toLowerCase();
      
     
      
      // Determine MIME type
      let mimeType = 'image/jpeg'; // default
      if (fileType === 'png') {
        mimeType = 'image/png';
      } else if (fileType === 'gif') {
        mimeType = 'image/gif';
      } else if (fileType === 'heic' || fileType === 'heif') {
        mimeType = 'image/heic';
      } else if (['mp4', 'mov', 'avi', 'webm', 'm4v', '3gp'].includes(fileType)) {
        mimeType = `video/${fileType === 'mov' ? 'quicktime' : fileType}`;
      }
      
 
      
      // Create file name
      const fileName = `${Date.now()}.${fileType}`;
      
      // Append file to form data (React Native format)
      formData.append('file', {
        uri: uri,
        type: mimeType,
        name: fileName,
      });
      
      // Add metadata
      formData.append('chatId', chatId);
      formData.append('timestamp', Date.now().toString());

    
      // Upload to local server with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch(LOCAL_SERVER_CONFIG.uploadUrl, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

    

        const responseText = await response.text();
        

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} - ${responseText}`);
        }

        const result = JSON.parse(responseText);
       
        
        // Get the media URL
        const mediaUrl = result.url || `${LOCAL_SERVER_CONFIG.mediaBaseUrl}/${chatId}/${result.filename}`;
        
        return mediaUrl;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Upload timeout - check if server is running');
        }
        throw fetchError;
      }
    } catch (error) {
       
      throw error;
    }
  }

  // Send Media Message
  async sendMediaMessage(chatId, senderId, receiverId, mediaUri, mediaType) {
    try {
     
      // Check if sender has enough coins
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      const senderData = senderDoc.data();

      if (senderData.balanceCoins < 1) {
     
        return { success: false, error: 'Insufficient coins' };
      }

      

      // Upload media to local server
      const mediaUrl = await this.uploadMedia(mediaUri, chatId);
     
      // Deduct 1 coin from sender
      await updateDoc(doc(db, 'users', senderId), {
        balanceCoins: increment(-1)
      });

      // Add 1 coin to receiver
      await updateDoc(doc(db, 'users', receiverId), {
        balanceCoins: increment(1)
      });
 

      // Add message with media
      const messageData = {
        chatId,
        senderId,
        receiverId,
        message: '',
        mediaUrl,
        mediaType, // 'image' or 'video'
        timestamp: serverTimestamp(),
        read: false
      };
 

      await addDoc(collection(db, 'messages'), messageData);

      // Update chat with last message
      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: mediaType === 'image' ? '📷 Photo' : '🎥 Video',
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
        const data = doc.data();
        messages.push({ id: doc.id, ...data });
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

  // Edit Message
  async editMessage(messageId, newText) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        message: newText,
        edited: true,
        editedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error editing message:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete Message
  async deleteMessage(messageId, chatId) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      await updateDoc(messageRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
        message: '',
        mediaUrl: ''
      });

      // Update chat last message if needed
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        lastMessage: 'Message deleted',
        lastMessageTime: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { success: false, error: error.message };
    }
  }

  // Add Reaction to Message
  async addReaction(messageId, userId, reaction) {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);
      const data = messageDoc.data();

      const reactions = data.reactions || {};
      if (!reactions[reaction]) {
        reactions[reaction] = [];
      }

      // Toggle reaction
      if (reactions[reaction].includes(userId)) {
        reactions[reaction] = reactions[reaction].filter(id => id !== userId);
        if (reactions[reaction].length === 0) {
          delete reactions[reaction];
        }
      } else {
        reactions[reaction].push(userId);
      }

      await updateDoc(messageRef, { reactions });
      return { success: true };
    } catch (error) {
      console.error('Error adding reaction:', error);
      return { success: false, error: error.message };
    }
  }

  // Send Reply Message
  async sendReplyMessage(chatId, senderId, receiverId, message, replyTo) {
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

      // Add message with reply info
      const messageData = {
        chatId,
        senderId,
        receiverId,
        message,
        timestamp: serverTimestamp(),
        read: false,
        replyTo: {
          messageId: replyTo.id,
          message: replyTo.message,
          senderId: replyTo.senderId,
          mediaType: replyTo.mediaType,
          mediaUrl: replyTo.mediaUrl
        }
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

  // Search Messages
  async searchMessages(chatId, searchQuery) {
    try {
      const q = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId)
      );

      const snapshot = await getDocs(q);
      const messages = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.message.toLowerCase().includes(searchQuery.toLowerCase())) {
          messages.push({ id: doc.id, ...data });
        }
      });

      return messages;
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }

  // ===== GROUP CHAT FUNCTIONS =====

  // Create Group Chat
  async createGroupChat(creatorId, groupName, memberIds, groupPhoto = '') {
    try {
      const allMembers = [creatorId, ...memberIds.filter(id => id !== creatorId)];
      const chatRef = await addDoc(collection(db, 'chats'), {
        isGroup: true,
        groupName: groupName,
        groupPhoto: groupPhoto,
        participants: allMembers,
        admin: creatorId,
        createdAt: serverTimestamp(),
        lastMessage: 'Group created',
        lastMessageTime: serverTimestamp(),
        unreadCount: allMembers.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
      });

      return { success: true, chatId: chatRef.id };
    } catch (error) {
      console.error('Error creating group:', error);
      return { success: false, error: error.message };
    }
  }

  // Add Member to Group
  async addGroupMember(chatId, newMemberId) {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      const chatData = chatDoc.data();

      if (!chatData.participants.includes(newMemberId)) {
        const updatedParticipants = [...chatData.participants, newMemberId];
        await updateDoc(chatRef, {
          participants: updatedParticipants,
          [`unreadCount.${newMemberId}`]: 0
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding member:', error);
      return { success: false, error: error.message };
    }
  }

  // Remove Member from Group
  async removeGroupMember(chatId, memberId) {
    try {
      const chatRef = doc(db, 'chats', chatId);
      const chatDoc = await getDoc(chatRef);
      const chatData = chatDoc.data();

      const updatedParticipants = chatData.participants.filter(id => id !== memberId);
      const updatedUnreadCount = { ...chatData.unreadCount };
      delete updatedUnreadCount[memberId];

      await updateDoc(chatRef, {
        participants: updatedParticipants,
        unreadCount: updatedUnreadCount
      });

      return { success: true };
    } catch (error) {
      console.error('Error removing member:', error);
      return { success: false, error: error.message };
    }
  }

  // Leave Group
  async leaveGroup(chatId, userId) {
    return await this.removeGroupMember(chatId, userId);
  }

  // Update Group Info
  async updateGroupInfo(chatId, updates) {
    try {
      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, updates);
      return { success: true };
    } catch (error) {
      console.error('Error updating group:', error);
      return { success: false, error: error.message };
    }
  }

  // Send Group Message
  async sendGroupMessage(chatId, senderId, message) {
    try {
      // Get group participants
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      const chatData = chatDoc.data();

      // Add message
      const messageData = {
        chatId,
        senderId,
        message,
        timestamp: serverTimestamp(),
        read: false,
        isGroupMessage: true
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Update chat with last message and increment unread for all except sender
      const unreadUpdates = {};
      chatData.participants.forEach(participantId => {
        if (participantId !== senderId) {
          unreadUpdates[`unreadCount.${participantId}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: message,
        lastMessageTime: serverTimestamp(),
        ...unreadUpdates
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Send Group Media Message
  async sendGroupMediaMessage(chatId, senderId, mediaUri, mediaType) {
    try {
      // Upload media to local server
      const mediaUrl = await this.uploadMedia(mediaUri, chatId);

      // Get group participants
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      const chatData = chatDoc.data();

      // Add message with media
      const messageData = {
        chatId,
        senderId,
        message: '',
        mediaUrl,
        mediaType,
        timestamp: serverTimestamp(),
        read: false,
        isGroupMessage: true
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Update chat with last message
      const unreadUpdates = {};
      chatData.participants.forEach(participantId => {
        if (participantId !== senderId) {
          unreadUpdates[`unreadCount.${participantId}`] = increment(1);
        }
      });

      await updateDoc(doc(db, 'chats', chatId), {
        lastMessage: mediaType === 'image' ? '📷 Photo' : '🎥 Video',
        lastMessageTime: serverTimestamp(),
        ...unreadUpdates
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get Group Info
  async getGroupInfo(chatId) {
    try {
      const chatDoc = await getDoc(doc(db, 'chats', chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();

        // Get all member details
        const memberDetails = await Promise.all(
          chatData.participants.map(async (userId) => {
            const userDoc = await getDoc(doc(db, 'users', userId));
            return { id: userId, ...userDoc.data() };
          })
        );

        return {
          success: true,
          group: { ...chatData, members: memberDetails }
        };
      }
      return { success: false, error: 'Group not found' };
    } catch (error) {
      console.error('Error getting group info:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new ChatService();