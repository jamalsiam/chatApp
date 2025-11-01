import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import callService from '../services/callService';

export default function ActiveCallScreen({ route, navigation }) {
  const { callId, callType, isInitiator, otherUser } = route.params;
  const webViewRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callQuality, setCallQuality] = useState('good');
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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

      if (!isInitiator && callData.offer && webViewReady) {
        sendToWebView('offer', JSON.parse(callData.offer));
      }

      if (isInitiator && callData.answer && webViewReady) {
        sendToWebView('answer', JSON.parse(callData.answer));
      }

      const iceCandidates = callData.iceCandidates || { caller: [], receiver: [] };
      const candidateKey = isInitiator ? 'receiver' : 'caller';

      iceCandidates[candidateKey].forEach((candidate) => {
        sendToWebView('iceCandidate', JSON.parse(candidate));
      });
    });

    return () => {
      clearInterval(durationInterval.current);
      unsubscribe();
    };
  }, [webViewReady, permissionsGranted]);

  const sendToWebView = (type, data) => {
    if (webViewRef.current) {
      const message = JSON.stringify({ type, data });
      webViewRef.current.postMessage(message);
    }
  };

  const handleWebViewMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', message.type, message.data);

      switch (message.type) {
        case 'ready':
          console.log('WebView ready, initializing call...');
          setWebViewReady(true);
          sendToWebView('initialize', { callType, isInitiator });
          break;
        case 'offer':
          console.log('Received offer, saving to Firebase...');
          await callService.saveOffer(callId, message.data);
          break;
        case 'answer':
          console.log('Received answer, saving to Firebase...');
          await callService.saveAnswer(callId, message.data);
          break;
        case 'iceCandidate':
          await callService.saveIceCandidate(callId, message.data, isInitiator);
          break;
        case 'connectionError':
          console.error('WebRTC connection error:', message.data);
          Alert.alert('Connection Error', 'Call connection was lost');
          handleEndCall();
          break;
        case 'error':
          console.error('WebRTC error:', message.data);
          setErrorMessage(message.data.message || 'Unknown error');
          Alert.alert('Call Error', message.data.message || 'Failed to start call. Please check your camera and microphone permissions.');
          break;
        case 'microphoneToggled':
          setIsMuted(!message.data.enabled);
          break;
        case 'cameraToggled':
          setIsCameraOff(!message.data.enabled);
          break;
        case 'screenSharingStarted':
          setIsScreenSharing(true);
          break;
        case 'screenSharingStopped':
          setIsScreenSharing(false);
          break;
        case 'callQuality':
          setCallQuality(message.data.quality);
          break;
        case 'initialized':
          console.log('Call initialized successfully');
          break;
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
      setErrorMessage('Error: ' + error.message);
    }
  };

  const handleWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    setErrorMessage('WebView error: ' + nativeEvent.description);
    Alert.alert('WebView Error', 'Failed to load call interface. Please try again.');
  };

  const handleEndCall = async () => {
    clearInterval(durationInterval.current);
    sendToWebView('endCall', {});
    await callService.endCall(callId, duration);

    // Check if we can go back, otherwise navigate to Home
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const toggleMute = () => { sendToWebView('toggleMicrophone', {}); };
  const toggleCamera = () => { sendToWebView('toggleCamera', {}); };
  const switchCamera = () => { sendToWebView('switchCamera', {}); };
  const toggleScreenSharing = () => {
    if (isScreenSharing) {
      sendToWebView('stopScreenSharing', {});
    } else {
      sendToWebView('startScreenSharing', {});
    }
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

  const htmlSource = Platform.select({
    android: { uri: 'file:///android_asset/webrtc-call.html' },
    default: require('../../assets/webrtc-call.html')
  });

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
          <WebView
            ref={webViewRef}
            source={htmlSource}
            style={styles.webview}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            onMessage={handleWebViewMessage}
            onError={handleWebViewError}
            mediaPlaybackRequiresUserGesture={false}
            androidLayerType="hardware"
            androidHardwareAccelerationDisabled={false}
            originWhitelist={['*']}
            allowFileAccess={true}
            allowUniversalAccessFromFileURLs={true}
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
                <TouchableOpacity
                  style={[styles.controlButton, isScreenSharing && styles.activeButton]}
                  onPress={toggleScreenSharing}
                >
                  <Icon name={isScreenSharing ? 'desktop' : 'desktop-outline'} size={28} color="#fff" />
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
  webview: { flex: 1 },
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
  topOverlay: { position: 'absolute', top: 50, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 15, paddingHorizontal: 20 },
  topLeft: { flexDirection: 'row', alignItems: 'center' },
  topCenter: { alignItems: 'center', flex: 1 },
  qualityIcon: { marginRight: 6 },
  qualityText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  userName: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  duration: { fontSize: 16, color: '#ddd' },
  controlsOverlay: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 20, paddingHorizontal: 20 },
  controlButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' },
  activeButton: { backgroundColor: '#6C5CE7' },
  endButton: { backgroundColor: '#FF4757', width: 70, height: 70, borderRadius: 35 }
});
