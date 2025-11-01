import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import callService from '../services/callService';

export default function GroupCallScreen({ route, navigation }) {
  const { groupCallId, callType, participants, currentUserId } = route.params;
  const webViewRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState(participants || []);
  const durationInterval = useRef(null);

  useEffect(() => {
    durationInterval.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    // Listen to group call status
    const unsubscribe = callService.listenToCall(groupCallId, async (callData) => {
      if (callData.status === 'ended') {
        handleEndCall();
      }

      // Update active participants
      if (callData.participants) {
        setActiveParticipants(callData.participants);
      }
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
          sendToWebView('initialize', {
            callType,
            isInitiator: true,
            isGroupCall: true,
            participantCount: activeParticipants.length
          });
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
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  const handleEndCall = async () => {
    clearInterval(durationInterval.current);
    sendToWebView('endCall', {});
    await callService.endCall(groupCallId, duration);

    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  const toggleMute = () => { sendToWebView('toggleMicrophone', {}); };
  const toggleCamera = () => { sendToWebView('toggleCamera', {}); };
  const switchCamera = () => { sendToWebView('switchCamera', {}); };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={require('../../assets/webrtc-call.html')}
        style={styles.webview}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onMessage={handleWebViewMessage}
      />

      <View style={styles.topOverlay}>
        <Text style={styles.title}>Group Call</Text>
        <Text style={styles.participantCount}>
          {activeParticipants.length} participant{activeParticipants.length !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      </View>

      <View style={styles.participantsList}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {activeParticipants.map((participant, index) => (
            <View key={participant.id || index} style={styles.participantCard}>
              <Icon name="person" size={24} color="#fff" />
              <Text style={styles.participantName} numberOfLines={1}>
                {participant.displayName || 'User'}
              </Text>
            </View>
          ))}
        </ScrollView>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  webview: { flex: 1 },
  topOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 15
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  participantCount: { fontSize: 14, color: '#ddd', marginBottom: 3 },
  duration: { fontSize: 16, color: '#ddd' },
  participantsList: {
    position: 'absolute',
    top: 180,
    left: 0,
    right: 0,
    height: 80,
    paddingHorizontal: 10
  },
  participantCard: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5
  },
  participantName: {
    fontSize: 10,
    color: '#fff',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 60
  },
  controlsOverlay: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    paddingHorizontal: 20
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  endButton: { backgroundColor: '#FF4757', width: 70, height: 70, borderRadius: 35 }
});
