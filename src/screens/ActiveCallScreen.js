import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import callService from '../services/callService';
import { createRoomUrl } from '../config/wherebyConfig';

export default function ActiveCallScreen({ route, navigation }) {
  const { callId, callType, isInitiator, otherUser } = route.params;
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const durationInterval = useRef(null);
  const webViewRef = useRef(null);

  // Generate Whereby room URL
  const displayName = otherUser?.displayName || 'User';
  const isVideoCall = callType === 'video';
  const roomUrl = createRoomUrl(callId, displayName, isVideoCall);

  // Start duration timer and listen for call status
  useEffect(() => {
    console.log('Starting call with Whereby URL:', roomUrl);

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
  }, []);

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

  const handleWebViewMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('WebView message:', data);

      // Handle Whereby events
      if (data.type === 'app.room_left') {
        // User left the room
        handleEndCall();
      }
    } catch (error) {
      console.log('WebView message (non-JSON):', event.nativeEvent.data);
    }
  };

  const handleWebViewError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    Alert.alert(
      'Connection Error',
      'Failed to load video call. Please check your internet connection.',
      [{ text: 'OK', onPress: () => handleEndCall() }]
    );
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: roomUrl }}
        style={styles.webview}
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        allowsInlineMediaPlayback={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        onMessage={handleWebViewMessage}
        onError={handleWebViewError}
        onLoadEnd={() => setIsLoading(false)}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={styles.loadingText}>Loading video call...</Text>
            <Text style={styles.roomText}>Room: {callId}</Text>
          </View>
        )}
      />

      {/* Top info overlay */}
      <View style={styles.topOverlay}>
        <Text style={styles.userName}>{otherUser?.displayName || 'Unknown'}</Text>
        <Text style={styles.duration}>{formatDuration(duration)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 5,
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    marginTop: 20,
  },
  roomText: {
    fontSize: 14,
    color: '#888',
    marginTop: 10,
  },
  topOverlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  duration: {
    fontSize: 14,
    color: '#ddd',
  },
});
