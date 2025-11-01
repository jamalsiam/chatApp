import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  RtcSurfaceView,
  VideoCanvas,
} from 'react-native-agora';
import AgoraConfig from '../config/agoraConfig';

const AgoraVideoCall = ({
  channelName,
  uid = 0,
  isHost = true,
  callType = 'video', // 'video' or 'audio'
  onUserJoined,
  onUserLeft,
  onError,
  onConnectionStateChange,
  commands,
}) => {
  const agoraEngineRef = useRef(null);
  const [remoteUid, setRemoteUid] = useState(0);
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');

  useEffect(() => {
    setupVideoSDKEngine();

    return () => {
      if (agoraEngineRef.current) {
        agoraEngineRef.current.leaveChannel();
        agoraEngineRef.current.release();
      }
    };
  }, []);

  // Handle commands from parent component
  useEffect(() => {
    if (commands && agoraEngineRef.current) {
      handleCommand(commands);
    }
  }, [commands]);

  const setupVideoSDKEngine = async () => {
    try {
      if (!AgoraConfig.appId || AgoraConfig.appId === 'YOUR_AGORA_APP_ID') {
        console.error('Please set your Agora App ID in src/config/agoraConfig.js');
        onError && onError({ message: 'Agora App ID not configured' });
        return;
      }

      // Create Agora engine
      const engine = createAgoraRtcEngine();
      agoraEngineRef.current = engine;

      // Initialize engine
      engine.initialize({
        appId: AgoraConfig.appId,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
      });

      // Register event handlers
      engine.registerEventHandler({
        onJoinChannelSuccess: () => {
          console.log('Successfully joined channel');
          setIsJoined(true);
        },
        onUserJoined: (_connection, uid) => {
          console.log('Remote user joined:', uid);
          setRemoteUid(uid);
          onUserJoined && onUserJoined(uid);
        },
        onUserOffline: (_connection, uid) => {
          console.log('Remote user left:', uid);
          setRemoteUid(0);
          onUserLeft && onUserLeft(uid);
        },
        onError: (err, msg) => {
          console.error('Agora error:', err, msg);
          onError && onError({ code: err, message: msg });
        },
        onConnectionStateChanged: (state, reason) => {
          console.log('Connection state changed:', state, reason);
          onConnectionStateChange && onConnectionStateChange(state, reason);
        },
      });

      // Enable video if video call
      if (callType === 'video') {
        engine.enableVideo();
      }

      // Join channel
      await engine.joinChannel(
        null, // Token (null for testing, required for production)
        channelName,
        uid,
        {
          clientRoleType: isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
        }
      );

      console.log('Joining channel:', channelName);
    } catch (error) {
      console.error('Error setting up Agora:', error);
      onError && onError({ message: error.message });
    }
  };

  const handleCommand = (command) => {
    const engine = agoraEngineRef.current;
    if (!engine) return;

    switch (command.type) {
      case 'toggleMicrophone':
        const newMuteState = !isMuted;
        engine.muteLocalAudioStream(newMuteState);
        setIsMuted(newMuteState);
        console.log('Microphone', newMuteState ? 'muted' : 'unmuted');
        break;

      case 'toggleCamera':
        const newVideoState = !isVideoEnabled;
        engine.muteLocalVideoStream(!newVideoState);
        setIsVideoEnabled(newVideoState);
        console.log('Camera', newVideoState ? 'enabled' : 'disabled');
        break;

      case 'switchCamera':
        engine.switchCamera();
        console.log('Camera switched');
        break;

      default:
        console.log('Unknown command:', command.type);
    }
  };

  return (
    <View style={styles.container}>
      {/* Remote video (full screen) */}
      {isJoined && remoteUid !== 0 ? (
        <RtcSurfaceView
          style={styles.remoteVideo}
          canvas={{ uid: remoteUid, renderMode: 1 }}
        />
      ) : (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingText}>Waiting for other user...</Text>
        </View>
      )}

      {/* Local video (small overlay) */}
      {isJoined && callType === 'video' && isVideoEnabled && (
        <RtcSurfaceView
          style={styles.localVideo}
          canvas={{ uid: 0, renderMode: 1 }}
          zOrderMediaOverlay={true}
        />
      )}

      {/* Connection status */}
      {!isJoined && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Connecting...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  localVideo: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 120,
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#2a2a2a',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  waitingText: {
    color: '#fff',
    fontSize: 18,
  },
  statusContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AgoraVideoCall;
