import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import {
  RTCView,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
} from 'react-native-webrtc';

const NativeWebRTCView = ({
  callType,
  isInitiator,
  onOffer,
  onAnswer,
  onIceCandidate,
  onError,
  onReady,
  onConnectionStateChange,
  onQualityChange,
  remoteOffer,
  remoteAnswer,
  remoteIceCandidate,
  commands,
}) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('new');
  const peerConnection = useRef(null);
  const statsInterval = useRef(null);

  // WebRTC configuration with TURN servers
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:a.relay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:a.relay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  };

  // Initialize media and peer connection
  useEffect(() => {
    initializeCall();

    return () => {
      cleanup();
    };
  }, []);

  // Handle remote offer
  useEffect(() => {
    if (remoteOffer && peerConnection.current) {
      handleRemoteOffer(remoteOffer);
    }
  }, [remoteOffer]);

  // Handle remote answer
  useEffect(() => {
    if (remoteAnswer && peerConnection.current) {
      handleRemoteAnswer(remoteAnswer);
    }
  }, [remoteAnswer]);

  // Handle remote ICE candidate
  useEffect(() => {
    if (remoteIceCandidate && peerConnection.current) {
      handleRemoteIceCandidate(remoteIceCandidate);
    }
  }, [remoteIceCandidate]);

  // Handle commands (toggle camera, mute, etc.)
  useEffect(() => {
    if (commands && localStream) {
      handleCommand(commands);
    }
  }, [commands]);

  const initializeCall = async () => {
    try {
      console.log('Initializing native WebRTC call...');

      // Get user media
      const constraints = {
        audio: true,
        video: callType === 'video' ? {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } : false,
      };

      const stream = await mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      console.log('Got local media stream');

      // Create peer connection
      const pc = new RTCPeerConnection(configuration);
      peerConnection.current = pc;

      // Add local stream tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        console.log('Received remote track');
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Generated ICE candidate');
          onIceCandidate && onIceCandidate(event.candidate);
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('Connection state:', state);
        setConnectionState(state);
        onConnectionStateChange && onConnectionStateChange(state);

        if (state === 'connected') {
          startQualityMonitoring();
        } else if (state === 'failed' || state === 'disconnected') {
          stopQualityMonitoring();
          onError && onError({ message: 'Connection lost' });
        }
      };

      // If initiator, create offer
      if (isInitiator) {
        console.log('Creating offer...');
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callType === 'video',
        });
        await pc.setLocalDescription(offer);
        onOffer && onOffer(offer);
      }

      onReady && onReady();
    } catch (error) {
      console.error('Error initializing call:', error);
      onError && onError({ message: error.message });
    }
  };

  const handleRemoteOffer = async (offer) => {
    try {
      console.log('Handling remote offer...');
      const pc = peerConnection.current;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      onAnswer && onAnswer(answer);
    } catch (error) {
      console.error('Error handling offer:', error);
      onError && onError({ message: error.message });
    }
  };

  const handleRemoteAnswer = async (answer) => {
    try {
      console.log('Handling remote answer...');
      const pc = peerConnection.current;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Error handling answer:', error);
      onError && onError({ message: error.message });
    }
  };

  const handleRemoteIceCandidate = async (candidate) => {
    try {
      const pc = peerConnection.current;
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  };

  const handleCommand = (command) => {
    if (!localStream) return;

    switch (command.type) {
      case 'toggleMicrophone':
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
        }
        break;

      case 'toggleCamera':
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
        }
        break;

      case 'switchCamera':
        if (callType === 'video') {
          localStream.getVideoTracks().forEach((track) => {
            track._switchCamera();
          });
        }
        break;
    }
  };

  const startQualityMonitoring = () => {
    if (statsInterval.current) return;

    statsInterval.current = setInterval(async () => {
      if (!peerConnection.current) return;

      try {
        const stats = await peerConnection.current.getStats();
        const quality = parseStats(stats);
        onQualityChange && onQualityChange(quality);
      } catch (error) {
        console.error('Error getting stats:', error);
      }
    }, 2000);
  };

  const stopQualityMonitoring = () => {
    if (statsInterval.current) {
      clearInterval(statsInterval.current);
      statsInterval.current = null;
    }
  };

  const parseStats = (stats) => {
    let qualityData = {
      packetsLost: 0,
      jitter: 0,
      roundTripTime: 0,
      quality: 'good',
    };

    if (stats && stats.forEach) {
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          qualityData.packetsLost = report.packetsLost || 0;
          qualityData.jitter = report.jitter || 0;
        } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          qualityData.roundTripTime = report.currentRoundTripTime || 0;
        }
      });
    }

    // Determine quality level
    if (qualityData.packetsLost > 50 || qualityData.roundTripTime > 0.3) {
      qualityData.quality = 'poor';
    } else if (qualityData.packetsLost > 20 || qualityData.roundTripTime > 0.15) {
      qualityData.quality = 'fair';
    }

    return qualityData;
  };

  const cleanup = () => {
    console.log('Cleaning up WebRTC resources...');
    stopQualityMonitoring();

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }

    if (peerConnection.current) {
      peerConnection.current.close();
    }
  };

  return (
    <View style={styles.container}>
      {/* Remote video (full screen) */}
      {remoteStream && (
        <RTCView
          style={styles.remoteVideo}
          streamURL={remoteStream.toURL()}
          objectFit="cover"
        />
      )}

      {/* Local video (small overlay) */}
      {localStream && callType === 'video' && (
        <RTCView
          style={styles.localVideo}
          streamURL={localStream.toURL()}
          objectFit="cover"
          mirror={true}
          zOrder={1}
        />
      )}

      {/* Connection status */}
      {connectionState !== 'connected' && (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {connectionState === 'connecting' ? 'Connecting...' : connectionState}
          </Text>
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
    backgroundColor: '#1a1a1a',
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

export default NativeWebRTCView;
