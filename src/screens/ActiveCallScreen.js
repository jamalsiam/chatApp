import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import callService from '../services/callService';
import AgoraVideoCall from '../components/AgoraVideoCall';

export default function ActiveCallScreen({ route, navigation }) {
  const { callId, callType, isInitiator, otherUser } = route.params;
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [agoraCommand, setAgoraCommand] = useState(null);
  const [userJoined, setUserJoined] = useState(false);
  const durationInterval = useRef(null);

  // Use callId as Agora channel name
  const channelName = callId;

  // Request permissions on mount
  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    try {
      console.log('Requesting camera and microphone permissions...');

      // Request audio permission
      const audioStatus = await Audio.requestPermissionsAsync();
      console.log('Audio permission status:', audioStatus.status);

      // Request camera permission if video call
      if (callType === 'video') {
        const cameraStatus = await Camera.requestCameraPermissionsAsync();
        console.log('Camera permission status:', cameraStatus.status);

        if (audioStatus.status !== 'granted' || cameraStatus.status !== 'granted') {
          setErrorMessage('Camera and microphone permissions are required for calls');
          Alert.alert(
            'Permissions Required',
            'Please grant camera and microphone permissions to make video calls',
            [
              {
                text: 'OK',
                onPress: () => handleEndCall()
              }
            ]
          );
          return;
        }
      } else {
        // Audio only call
        if (audioStatus.status !== 'granted') {
          setErrorMessage('Microphone permission is required for calls');
          Alert.alert(
            'Permission Required',
            'Please grant microphone permission to make voice calls',
            [
              {
                text: 'OK',
                onPress: () => handleEndCall()
              }
            ]
          );
          return;
        }
      }

      console.log('All permissions granted');
      setPermissionsGranted(true);
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setErrorMessage('Failed to request permissions: ' + error.message);
      Alert.alert('Permission Error', 'Could not request permissions. Please try again.');
    }
  };

  // Start duration timer
  useEffect(() => {
    if (!permissionsGranted) return;

    durationInterval.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    const unsubscribe = callService.listenToCall(callId, async (callData) => {
      if (callData.status === 'ended') {
        handleEndCall();
      }
    });

    return () => {
      clearInterval(durationInterval.current);
      unsubscribe();
    };
  }, [permissionsGranted]);

  // Agora event handlers
  const handleUserJoined = (uid) => {
    console.log('User joined:', uid);
    setUserJoined(true);
  };

  const handleUserLeft = (uid) => {
    console.log('User left:', uid);
    setUserJoined(false);
  };

  const handleAgoraError = (error) => {
    console.error('Agora error:', error);
    setErrorMessage(error.message || 'Call error');

    if (error.message && error.message.includes('App ID')) {
      Alert.alert(
        'Configuration Error',
        'Please configure your Agora App ID in src/config/agoraConfig.js\n\nGet your free App ID from: https://console.agora.io/',
        [{ text: 'OK', onPress: () => handleEndCall() }]
      );
    } else {
      Alert.alert('Call Error', error.message || 'An error occurred during the call');
    }
  };

  const handleConnectionStateChange = (state, reason) => {
    console.log('Connection state:', state, 'Reason:', reason);
    // You can add connection quality indicators here
  };

  const handleEndCall = async () => {
    clearInterval(durationInterval.current);
    await callService.endCall(callId, duration);

    // Check if we can go back, otherwise navigate to Home
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    setAgoraCommand({ type: 'toggleMicrophone', timestamp: Date.now() });
  };

  const toggleCamera = () => {
    setIsCameraOff(!isCameraOff);
    setAgoraCommand({ type: 'toggleCamera', timestamp: Date.now() });
  };

  const switchCamera = () => {
    setAgoraCommand({ type: 'switchCamera', timestamp: Date.now() });
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  };

  return (
    <View style={styles.container}>
      {!permissionsGranted ? (
        <View style={styles.loadingContainer}>
          <Icon name="lock-closed" size={60} color="#888" />
          <Text style={styles.loadingText}>Requesting permissions...</Text>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
      ) : (
        <>
          <AgoraVideoCall
            channelName={channelName}
            uid={0}
            isHost={true}
            callType={callType}
            onUserJoined={handleUserJoined}
            onUserLeft={handleUserLeft}
            onError={handleAgoraError}
            onConnectionStateChange={handleConnectionStateChange}
            commands={agoraCommand}
          />

          <View style={styles.topOverlay}>
            <View style={styles.topCenter}>
              <Text style={styles.userName}>{otherUser?.displayName || 'Unknown'}</Text>
              <Text style={styles.duration}>{formatDuration(duration)}</Text>
              {!userJoined && (
                <Text style={styles.statusText}>Calling...</Text>
              )}
            </View>
          </View>

          <View style={styles.controlsOverlay}>
            {callType === 'video' && (
              <>
                <TouchableOpacity
                  style={[styles.controlButton, isCameraOff && styles.controlButtonActive]}
                  onPress={toggleCamera}
                >
                  <Icon name={isCameraOff ? 'videocam-off' : 'videocam'} size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
                  <Icon name="camera-reverse" size={28} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.controlButton, isMuted && styles.controlButtonActive]}
              onPress={toggleMute}
            >
              <Icon name={isMuted ? 'mic-off' : 'mic'} size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.controlButton, styles.endButton]} onPress={handleEndCall}>
              <Icon name="call" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#FF4757',
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  topOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topCenter: { alignItems: 'center' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  duration: { fontSize: 16, color: '#ddd' },
  statusText: { fontSize: 14, color: '#FFD700', marginTop: 5 },
  controlsOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255, 71, 87, 0.7)',
  },
  endButton: { backgroundColor: '#FF4757', width: 70, height: 70, borderRadius: 35 },
});
