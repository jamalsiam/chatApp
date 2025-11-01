import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View, ActivityIndicator, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import callService from '../services/callService';
import { createJitsiUrl } from '../config/jitsiConfig';

export default function ActiveCallScreen({ route, navigation }) {
  const { callId, callType, isInitiator, otherUser } = route.params;
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const durationInterval = useRef(null);
  const webViewRef = useRef(null);

  // Generate Jitsi Meet room URL
  const displayName = otherUser?.displayName || 'User';
  const isVideoCall = callType === 'video';
  const roomUrl = createJitsiUrl(callId, displayName, isVideoCall);

  // Start duration timer and listen for call status
  useEffect(() => {
    console.log('Starting call with Jitsi Meet URL:', roomUrl);

    durationInterval.current = setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    const unsubscribe = callService.listenToCall(callId, async (callData) => {
      if (callData.status === 'ended') {
        handleEndCall();
      }
    });

    // Handle Android hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleEndCall();
      return true; // Prevent default back behavior
    });

    return () => {
      clearInterval(durationInterval.current);
      unsubscribe();
      backHandler.remove();
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
      const message = event.nativeEvent.data;
      console.log('Jitsi Meet message:', message);

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(message);
      } catch (e) {
        // Not JSON, might be a string event
        if (message.includes('readyToClose') || message.includes('videoConferenceLeft')) {
          console.log('User left the call - returning to chat');
          handleEndCall();
        }
        return;
      }

      // Handle Jitsi IFrame API events
      const eventName = data.event || data.type;

      console.log('Jitsi event:', eventName);

      // Events that indicate call ended
      if (
        eventName === 'readyToClose' ||
        eventName === 'videoConferenceLeft' ||
        eventName === 'hangup'
      ) {
        console.log('Call ended - returning to chat');
        handleEndCall();
      }

      // Log other events for debugging
      if (eventName === 'videoConferenceJoined') {
        console.log('Successfully joined the call');
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
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

  // Inject JavaScript to listen for Jitsi events
  const injectedJavaScript = `
    (function() {
      console.log('Jitsi event listener injected');

      // Listen for Jitsi IFrame API events
      window.addEventListener('message', function(event) {
        try {
          const data = event.data;

          // Forward Jitsi events to React Native
          if (data && typeof data === 'object') {
            // Send to React Native
            window.ReactNativeWebView.postMessage(JSON.stringify(data));

            console.log('Jitsi event received:', data.event || data.type);
          }
        } catch (error) {
          console.error('Error handling Jitsi event:', error);
        }
      });

      // Also listen for beforeunload (when page closes)
      window.addEventListener('beforeunload', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          event: 'readyToClose'
        }));
      });

      console.log('Jitsi event listeners ready');
    })();
    true; // Required for injected JavaScript
  `;

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
        injectedJavaScript={injectedJavaScript}
        onMessage={handleWebViewMessage}
        onError={handleWebViewError}
        onLoadEnd={() => setIsLoading(false)}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={styles.loadingText}>Joining call...</Text>
            <Text style={styles.roomText}>Room: {callId}</Text>
          </View>
        )}
      />

      {/* Minimal top overlay - fades after 3 seconds */}
      {duration < 5 && (
        <View style={styles.topOverlay}>
          <Text style={styles.userName}>{otherUser?.displayName || 'Unknown'}</Text>
          <Text style={styles.statusText}>Joining call...</Text>
        </View>
      )}
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
  statusText: {
    fontSize: 14,
    color: '#ddd',
  },
});
