import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';
import notificationService from './NotificationService';

class CallService {
  // Initialize a call (create call document)
  async initiateCall(callerId, receiverId, callType = 'video') {
    try {
      const callData = {
        callerId,
        receiverId,
        callType, // 'video' or 'audio'
        status: 'ringing', // ringing, active, ended, missed, declined
        startTime: serverTimestamp(),
        endTime: null,
        duration: 0,
        offer: null,
        answer: null,
        iceCandidates: {
          caller: [],
          receiver: []
        }
      };

      const callRef = await addDoc(collection(db, 'calls'), callData);
      const callId = callRef.id;

      // Send push notification to receiver
      await notificationService.sendCallNotification(
        callerId,
        receiverId,
        callType,
        callId
      );

      return { success: true, callId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Answer a call
  async answerCall(callId) {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'active',
        answerTime: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Decline a call
  async declineCall(callId) {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'declined',
        endTime: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // End a call
  async endCall(callId, duration = 0) {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'ended',
        endTime: serverTimestamp(),
        duration
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Mark call as missed
  async markAsMissed(callId) {
    try {
      // Get call details to send notification
      const callDoc = await getDoc(doc(db, 'calls', callId));
      if (callDoc.exists()) {
        const callData = callDoc.data();

        // Send missed call notification
        await notificationService.sendMissedCallNotification(
          callData.callerId,
          callData.receiverId,
          callData.callType
        );
      }

      await updateDoc(doc(db, 'calls', callId), {
        status: 'missed',
        endTime: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Save WebRTC offer
  async saveOffer(callId, offer) {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        offer: JSON.stringify(offer)
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Save WebRTC answer
  async saveAnswer(callId, answer) {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        answer: JSON.stringify(answer)
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Save ICE candidate
  async saveIceCandidate(callId, candidate, isCallerCandidate) {
    try {
      const callRef = doc(db, 'calls', callId);
      const callDoc = await getDoc(callRef);
      const callData = callDoc.data();

      const iceCandidates = callData.iceCandidates || { caller: [], receiver: [] };
      const candidateKey = isCallerCandidate ? 'caller' : 'receiver';

      iceCandidates[candidateKey].push(JSON.stringify(candidate));

      await updateDoc(callRef, {
        iceCandidates
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Listen to a specific call
  listenToCall(callId, callback) {
    const callRef = doc(db, 'calls', callId);
    return onSnapshot(callRef, (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() });
      }
    });
  }

  // Listen to incoming calls for a user
  listenToIncomingCalls(userId, callback) {
    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', userId),
      where('status', '==', 'ringing'),
      orderBy('startTime', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const calls = [];
      snapshot.forEach((doc) => {
        calls.push({ id: doc.id, ...doc.data() });
      });
      callback(calls);
    });
  }

  // Get call history for a user
  async getCallHistory(userId) {
    try {
      const q = query(
        collection(db, 'calls'),
        where('participants', 'array-contains', userId),
        orderBy('startTime', 'desc')
      );

      // Note: For this query to work, you need to add 'participants' field
      // For now, we'll get calls where user is caller or receiver
      const callerQuery = query(
        collection(db, 'calls'),
        where('callerId', '==', userId),
        orderBy('startTime', 'desc')
      );

      const receiverQuery = query(
        collection(db, 'calls'),
        where('receiverId', '==', userId),
        orderBy('startTime', 'desc')
      );

      const [callerSnapshot, receiverSnapshot] = await Promise.all([
        getDocs(callerQuery),
        getDocs(receiverQuery)
      ]);

      const calls = new Map();

      callerSnapshot.forEach((doc) => {
        calls.set(doc.id, { id: doc.id, ...doc.data() });
      });

      receiverSnapshot.forEach((doc) => {
        calls.set(doc.id, { id: doc.id, ...doc.data() });
      });

      // Convert to array and sort by startTime
      return Array.from(calls.values()).sort((a, b) => {
        const timeA = a.startTime?.toMillis?.() || 0;
        const timeB = b.startTime?.toMillis?.() || 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error('Error getting call history:', error);
      return [];
    }
  }

  // Get call details
  async getCallDetails(callId) {
    try {
      const callDoc = await getDoc(doc(db, 'calls', callId));
      if (callDoc.exists()) {
        return { id: callDoc.id, ...callDoc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting call details:', error);
      return null;
    }
  }

  // Create a group call
  async initiateGroupCall(callerId, participantIds, callType = 'video') {
    try {
      const callData = {
        callerId,
        callType,
        isGroupCall: true,
        participants: participantIds.map(id => ({
          id,
          status: 'ringing', // ringing, active, declined, missed
          joinedAt: null
        })),
        status: 'ringing',
        startTime: serverTimestamp(),
        endTime: null,
        duration: 0
      };

      const callRef = await addDoc(collection(db, 'calls'), callData);
      const callId = callRef.id;

      // Send notifications to all participants
      for (const participantId of participantIds) {
        if (participantId !== callerId) {
          await notificationService.sendCallNotification(
            callerId,
            participantId,
            callType,
            callId
          );
        }
      }

      return { success: true, callId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Join a group call
  async joinGroupCall(callId, userId) {
    try {
      const callDoc = await getDoc(doc(db, 'calls', callId));
      if (!callDoc.exists()) {
        return { success: false, error: 'Call not found' };
      }

      const callData = callDoc.data();
      const participants = callData.participants || [];

      // Update participant status
      const updatedParticipants = participants.map(p =>
        p.id === userId
          ? { ...p, status: 'active', joinedAt: serverTimestamp() }
          : p
      );

      await updateDoc(doc(db, 'calls', callId), {
        participants: updatedParticipants
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Leave a group call
  async leaveGroupCall(callId, userId) {
    try {
      const callDoc = await getDoc(doc(db, 'calls', callId));
      if (!callDoc.exists()) {
        return { success: false };
      }

      const callData = callDoc.data();
      const participants = callData.participants || [];

      // Remove participant
      const updatedParticipants = participants.filter(p => p.id !== userId);

      // If no participants left, end the call
      if (updatedParticipants.length === 0) {
        await updateDoc(doc(db, 'calls', callId), {
          status: 'ended',
          endTime: serverTimestamp(),
          participants: updatedParticipants
        });
      } else {
        await updateDoc(doc(db, 'calls', callId), {
          participants: updatedParticipants
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Import getDocs
import { getDocs } from 'firebase/firestore';

export default new CallService();
