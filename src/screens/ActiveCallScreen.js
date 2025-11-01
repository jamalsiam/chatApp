import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View, ActivityIndicator, BackHandler, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Ionicons';
import callService from '../services/callService';
import { createJitsiUrl } from '../config/jitsiConfig';

export default function ActiveCallScreen({ route, navigation }) {
  const { callId, callType, isInitiator, otherUser } = route.params;
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const durationInterval = useRef(null);
  const webViewRef = useRef(null);
  const hasEndedRef = useRef(false);

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
    // Prevent multiple calls to end
    if (hasEndedRef.current) {
      console.log('Call already ending, skipping...');
      return;
    }

    hasEndedRef.current = true;
    setIsEnding(true);

    console.log('Ending call...');

    try {
      // Stop duration timer
      clearInterval(durationInterval.current);

      // End call in Firebase
      await callService.endCall(callId, duration);

      console.log('Call ended, navigating back...');

      // Navigate back to previous screen (chat)
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Error ending call:', error);
      // Still navigate back even if there's an error
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
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

  // Injected JavaScript to auto-join and forward events
  const injectedJavaScript = `
    (function() {
      console.log('Jitsi auto-join script loaded');

      // Function to auto-submit prejoin form if it appears
      function autoJoinIfPrejoinExists() {
        // Look for the prejoin screen join button
        const joinButton = document.querySelector('[data-testid="prejoin.joinMeeting"]') ||
                          document.querySelector('.prejoin-join-btn') ||
                          document.querySelector('button[aria-label*="Join"]') ||
                          Array.from(document.querySelectorAll('button')).find(btn => {
                            const text = btn.textContent.toLowerCase();
                            return text.includes('join') && !text.includes('audio') && !text.includes('video');
                          });

        if (joinButton) {
          console.log('Found join button, clicking...');
          joinButton.click();
          return true;
        }

        // Look for lobby "Ask to join" or "Join" button
        const askToJoinButton = document.querySelector('[data-testid="lobby.knockButton"]') ||
                               document.querySelector('button[aria-label*="Ask to join"]') ||
                               Array.from(document.querySelectorAll('button')).find(btn =>
                                 btn.textContent.includes('Ask to join') ||
                                 btn.textContent.includes('Join meeting')
                               );

        if (askToJoinButton) {
          console.log('Found ask-to-join button, clicking...');
          askToJoinButton.click();
          return true;
        }

        // Try to find and fill the name input if it exists
        const nameInput = document.querySelector('[data-testid="prejoin.displayName"]') ||
                         document.querySelector('[data-testid="lobby.nameField"]') ||
                         document.querySelector('input[placeholder*="name" i]') ||
                         document.querySelector('input[type="text"]');

        if (nameInput && nameInput.value === '') {
          nameInput.value = '${displayName.replace(/'/g, "\\'")}';
          console.log('Filled in name: ${displayName.replace(/'/g, "\\'")}');
        }

        return false;
      }

      // Try to auto-join immediately
      setTimeout(() => {
        autoJoinIfPrejoinExists();
      }, 1000);

      // Keep trying every 500ms for 15 seconds
      let attempts = 0;
      const maxAttempts = 30;
      const interval = setInterval(() => {
        attempts++;
        const joined = autoJoinIfPrejoinExists();
        if (joined || attempts >= maxAttempts) {
          clearInterval(interval);
          if (joined) {
            console.log('Successfully auto-joined!');
          }
        }
      }, 500);

      // Listen for Jitsi IFrame API events
      window.addEventListener('message', function(event) {
        try {
          if (event.data && typeof event.data === 'object') {
            window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
          }
        } catch (error) {
          console.error('Error forwarding event:', error);
        }
      });

      console.log('Auto-join listener ready');
    })();
    true;
  `;

  // Handle WebView navigation state changes
  const handleNavigationStateChange = (navState) => {
    console.log('Navigation state changed:', navState.url);

    // If navigating away from Jitsi (e.g., Jitsi closed), end call
    // Check for 8x8.vc (our current server)
    if (!navState.loading && !navState.url.includes('8x8.vc')) {
      console.log('Left Jitsi page, ending call...');
      handleEndCall();
    }
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
        injectedJavaScript={injectedJavaScript}
        onMessage={handleWebViewMessage}
        onError={handleWebViewError}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={() => setIsLoading(false)}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C5CE7" />
            <Text style={styles.loadingText}>Joining call...</Text>
            <Text style={styles.roomText}>Room: {callId}</Text>
          </View>
        )}
      />

      {/* Top info bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarContent}>
          <Text style={styles.userName}>{otherUser?.displayName || 'Unknown'}</Text>
          <Text style={styles.duration}>{formatDuration(duration)}</Text>
        </View>
      </View>

      {/* End Call Button - Always visible and reliable */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.endCallButton, isEnding && styles.endCallButtonDisabled]}
          onPress={handleEndCall}
          disabled={isEnding}
        >
          {isEnding ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="call" size={28} color="#fff" style={styles.endCallIcon} />
              <Text style={styles.endCallText}>End Call</Text>
            </>
          )}
        </TouchableOpacity>
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  topBarContent: {
    alignItems: 'center',
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 30,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    zIndex: 10,
  },
  endCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    minWidth: 180,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  endCallButtonDisabled: {
    backgroundColor: '#999',
  },
  endCallIcon: {
    marginRight: 10,
    transform: [{ rotate: '135deg' }],
  },
  endCallText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
