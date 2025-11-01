import { useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import callService from '../services/callService';

export default function OutgoingCallScreen({ route, navigation }) {
  const { callId, receiver, callType } = route.params;
  const [callStatus, setCallStatus] = useState('ringing');

  useEffect(() => {
    const unsubscribe = callService.listenToCall(callId, (callData) => {
      setCallStatus(callData.status);

      if (callData.status === 'active') {
        navigation.replace('ActiveCall', {
          callId,
          callType,
          isInitiator: true,
          otherUser: receiver
        });
      } else if (callData.status === 'declined' || callData.status === 'ended') {
        navigation.goBack();
      }
    });

    // Auto-cancel after 30 seconds
    const timeout = setTimeout(() => {
      callService.markAsMissed(callId);
      navigation.goBack();
    }, 30000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleCancel = async () => {
    await callService.endCall(callId);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradientBackground} />
      <View style={styles.receiverInfo}>
        <View style={styles.avatarContainer}>
          {receiver?.photoURL ? (
            <Image source={{ uri: receiver.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={80} color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.receiverName}>{receiver?.displayName || 'Unknown'}</Text>
        <Text style={styles.callType}>{callType === 'video' ? 'Video Call' : 'Voice Call'}</Text>
        <View style={styles.statusContainer}>
          <Icon name={callType === 'video' ? 'videocam' : 'call'} size={20} color="#fff" />
          <Text style={styles.statusText}>Calling...</Text>
        </View>
      </View>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={handleCancel}>
          <Icon name="close" size={40} color="#fff" />
          <Text style={styles.actionText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  gradientBackground: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%', backgroundColor: '#6C5CE7', opacity: 0.3 },
  receiverInfo: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  avatarContainer: { marginBottom: 30 },
  avatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: '#fff' },
  avatarPlaceholder: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#6C5CE7', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  receiverName: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  callType: { fontSize: 18, color: '#ddd', marginBottom: 20 },
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  statusText: { fontSize: 16, color: '#fff' },
  actionsContainer: { flexDirection: 'row', justifyContent: 'center', paddingBottom: 60 },
  actionButton: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  cancelButton: { backgroundColor: '#FF4757' },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 8 }
});
