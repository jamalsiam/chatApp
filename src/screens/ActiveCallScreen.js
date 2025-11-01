import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
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
  const durationInterval = useRef(null);

  useEffect(() => {
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
  }, [webViewReady]);

  const sendToWebView = (type, data) => {
    if (webViewRef.current) {
      const message = JSON.stringify({ type, data });
      webViewRef.current.postMessage(message);
    }
  };

  const handleWebViewMessage = async (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);

      switch (message.type) {
        case 'ready':
          setWebViewReady(true);
          sendToWebView('initialize', { callType, isInitiator });
          break;
        case 'offer':
          await callService.saveOffer(callId, message.data);
          break;
        case 'answer':
          await callService.saveAnswer(callId, message.data);
          break;
        case 'iceCandidate':
          await callService.saveIceCandidate(callId, message.data, isInitiator);
          break;
        case 'connectionError':
          Alert.alert('Connection Error', 'Call connection was lost');
          handleEndCall();
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
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
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
      <WebView
        ref={webViewRef}
        source={htmlSource}
        style={styles.webview}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleWebViewMessage}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
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
