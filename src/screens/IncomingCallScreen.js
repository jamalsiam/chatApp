import { useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Vibration
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import callService from '../services/callService';
import userService from '../services/userService';

const { width } = Dimensions.get('window');

export default function IncomingCallScreen({ route, navigation }) {
  const { callId, callerId, callType } = route.params;
  const [caller, setCaller] = useState(null);
  const [callStatus, setCallStatus] = useState('ringing');

  useEffect(() => {
    loadCallerInfo();

    // Vibrate on incoming call
    Vibration.vibrate([0, 1000, 500, 1000], true);

    // Listen to call status changes
    const unsubscribe = callService.listenToCall(callId, (callData) => {
      setCallStatus(callData.status);

      if (callData.status === 'ended' || callData.status === 'declined') {
        Vibration.cancel();
        // Check if we can go back, otherwise navigate to Home
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Home');
        }
      }
    });

    return () => {
      Vibration.cancel();
      unsubscribe();
    };
  }, []);

  const loadCallerInfo = async () => {
    try {
      const userProfile = await userService.getUserProfile(callerId);
      setCaller(userProfile);
    } catch (error) {
      console.error('Error loading caller info:', error);
    }
  };

  const handleAnswer = async () => {
    Vibration.cancel();
    await callService.answerCall(callId);

    navigation.replace('ActiveCall', {
      callId,
      callType,
      isInitiator: false,
      otherUser: caller
    });
  };

  const handleDecline = async () => {
    Vibration.cancel();
    await callService.declineCall(callId);
    // Check if we can go back, otherwise navigate to Home
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const getCallTypeText = () => {
    return callType === 'video' ? 'Video Call' : 'Voice Call';
  };

  const getCallIcon = () => {
    return callType === 'video' ? 'videocam' : 'call';
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <View style={styles.gradientBackground} />

      {/* Caller Info */}
      <View style={styles.callerInfo}>
        <View style={styles.avatarContainer}>
          {caller?.photoURL ? (
            <Image source={{ uri: caller.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={80} color="#fff" />
            </View>
          )}
        </View>

        <Text style={styles.callerName}>{caller?.displayName || 'Unknown'}</Text>
        <Text style={styles.callType}>{getCallTypeText()}</Text>

        <View style={styles.statusContainer}>
          <Icon name={getCallIcon()} size={20} color="#fff" />
          <Text style={styles.statusText}>Incoming call...</Text>
        </View>
      </View>

      {/* Call Actions */}
      <View style={styles.actionsContainer}>
        {/* Decline Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.declineButton]}
          onPress={handleDecline}
        >
          <Icon name="close" size={40} color="#fff" />
          <Text style={styles.actionText}>Decline</Text>
        </TouchableOpacity>

        {/* Answer Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.answerButton]}
          onPress={handleAnswer}
        >
          <Icon name="call" size={40} color="#fff" />
          <Text style={styles.actionText}>Answer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: '#6C5CE7',
    opacity: 0.3,
  },
  callerInfo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  avatarContainer: {
    marginBottom: 30,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  callerName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  callType: {
    fontSize: 18,
    color: '#ddd',
    marginBottom: 20,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
    paddingBottom: 60,
  },
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  declineButton: {
    backgroundColor: '#FF4757',
  },
  answerButton: {
    backgroundColor: '#00D856',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});
