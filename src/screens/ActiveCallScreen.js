import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import callService from '../services/callService';
import NativeWebRTCView from '../components/NativeWebRTCView';

export default function ActiveCallScreen({ route, navigation }) {
  const { callId, callType, isInitiator, otherUser } = route.params;
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [callQuality, setCallQuality] = useState('good');
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [remoteOffer, setRemoteOffer] = useState(null);
  const [remoteAnswer, setRemoteAnswer] = useState(null);
  const [remoteIceCandidate, setRemoteIceCandidate] = useState(null);
  const [webrtcCommand, setWebrtcCommand] = useState(null);
  const durationInterval = useRef(null);

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

  useEffect(() => {
    if (!permissionsGranted) return;

    durationInterval.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    const unsubscribe = callService.listenToCall(callId, async (callData) => {
      if (callData.status === 'ended') {
        handleEndCall();
      }

      if (!isInitiator && callData.offer && isReady) {
        console.log('Received offer from Firebase');
        setRemoteOffer(JSON.parse(callData.offer));
      }

      if (isInitiator && callData.answer && isReady) {
        console.log('Received answer from Firebase');
        setRemoteAnswer(JSON.parse(callData.answer));
      }

      const iceCandidates = callData.iceCandidates || { caller: [], receiver: [] };
      const candidateKey = isInitiator ? 'receiver' : 'caller';

      if (iceCandidates[candidateKey].length > 0) {
        const lastCandidate = iceCandidates[candidateKey][iceCandidates[candidateKey].length - 1];
        setRemoteIceCandidate(JSON.parse(lastCandidate));
      }
    });

    return () => {
      clearInterval(durationInterval.current);
      unsubscribe();
    };
  }, [isReady, permissionsGranted]);

  // WebRTC callbacks
  const handleWebRTCReady = () => {
    console.log('Native WebRTC ready');
    setIsReady(true);
  };

  const handleWebRTCOffer = async (offer) => {
    console.log('Generated offer, saving to Firebase...');
    await callService.saveOffer(callId, offer);
  };

  const handleWebRTCAnswer = async (answer) => {
    console.log('Generated answer, saving to Firebase...');
    await callService.saveAnswer(callId, answer);
  };

  const handleWebRTCIceCandidate = async (candidate) => {
    console.log('Generated ICE candidate');
    await callService.saveIceCandidate(callId, candidate, isInitiator);
  };

  const handleWebRTCError = (error) => {
    console.error('WebRTC error:', error);
    setErrorMessage(error.message || 'Unknown error');
    Alert.alert('Call Error', error.message || 'Failed to establish connection');
  };

  const handleConnectionStateChange = (state) => {
    console.log('Connection state changed:', state);
    if (state === 'failed' || state === 'disconnected') {
      Alert.alert('Connection Error', 'Call connection was lost');
      handleEndCall();
    }
  };

  const handleQualityChange = (quality) => {
    setCallQuality(quality.quality);
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
    setWebrtcCommand({ type: 'toggleMicrophone', timestamp: Date.now() });
  };

  const toggleCamera = () => {
    setIsCameraOff(!isCameraOff);
    setWebrtcCommand({ type: 'toggleCamera', timestamp: Date.now() });
  };

  const switchCamera = () => {
    setWebrtcCommand({ type: 'switchCamera', timestamp: Date.now() });
  };

  const getQualityColor = () => {
    switch (callQuality) {
      case 'good': return '#00D856';
      case 'fair': return '#FFD700';
      case 'poor': return '#FF4757';
      default: return '#00D856';
    }
  };

  const getQualityIcon = () => {
    switch (callQuality) {
      case 'good': return 'wifi';
      case 'fair': return 'wifi-outline';
      case 'poor': return 'warning';
      default: return 'wifi';
    }
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
          <NativeWebRTCView
            callType={callType}
            isInitiator={isInitiator}
            onOffer={handleWebRTCOffer}
            onAnswer={handleWebRTCAnswer}
            onIceCandidate={handleWebRTCIceCandidate}
            onError={handleWebRTCError}
            onReady={handleWebRTCReady}
            onConnectionStateChange={handleConnectionStateChange}
            onQualityChange={handleQualityChange}
            remoteOffer={remoteOffer}
            remoteAnswer={remoteAnswer}
            remoteIceCandidate={remoteIceCandidate}
            commands={webrtcCommand}
          />

          <View style={styles.topOverlay}>
            <View style={styles.topLeft}>
              <Icon
                name={getQualityIcon()}
                size={16}
                color={getQualityColor()}
                style={styles.qualityIcon}
              />
              <Text style={[styles.qualityText, { color: getQualityColor() }]}>
                {callQuality}
              </Text>
            </View>
            <View style={styles.topCenter}>
              <Text style={styles.userName}>{otherUser?.displayName || 'Unknown'}</Text>
              <Text style={styles.duration}>{formatDuration(duration)}</Text>
            </View>
          </View>

          <View style={styles.controlsOverlay}>
            {callType === 'video' && (
              <>
                <TouchableOpacity style={styles.controlButton} onPress={toggleCamera}>
                  <Icon name={isCameraOff ? 'videocam-off' : 'videocam'} size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
                  <Icon name="camera-reverse" size={28} color="#fff" />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 15,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center' },
  topCenter: { alignItems: 'center', flex: 1 },
  qualityIcon: { marginRight: 6 },
  qualityText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  duration: { fontSize: 16, color: '#ddd' },
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
  activeButton: { backgroundColor: '#6C5CE7' },
  endButton: { backgroundColor: '#FF4757', width: 70, height: 70, borderRadius: 35 },
});
