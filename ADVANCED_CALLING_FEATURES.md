# Advanced Calling Features Documentation

This document covers all the advanced calling features implemented in the chat app.

## Table of Contents
1. [Call History Display](#1-call-history-display)
2. [Push Notifications](#2-push-notifications)
3. [TURN Server Configuration](#3-turn-server-configuration)
4. [Group Calls](#4-group-calls)
5. [Call Quality Indicators](#5-call-quality-indicators)
6. [Screen Sharing](#6-screen-sharing)

---

## 1. Call History Display

### Overview
View your complete call history with details about each call including duration, status, and participant information.

### Features
- **Call List Display**: Shows all past calls in chronological order
- **Call Details**: Displays:
  - Caller/receiver information
  - Call type (video/audio)
  - Call duration
  - Call status (missed, declined, ended)
  - Timestamp
- **Quick Redial**: Tap any call to instantly call that person back
- **Visual Indicators**:
  - Green arrow up: Outgoing call
  - Green arrow down: Incoming call
  - Red icon: Missed call

### Usage
1. Open the **Calls** tab from the bottom navigation
2. View your call history list
3. Tap on any call entry to call that person again

### Implementation Details
- **Screen**: `CallsScreen.js`
- **Service**: `callService.getCallHistory(userId)`
- **Data**: Stored in Firebase `calls` collection

---

## 2. Push Notifications

### Overview
Receive real-time notifications for incoming calls, even when the app is in the background.

### Features
- **Incoming Call Notifications**: High-priority alerts for incoming calls
- **Missed Call Notifications**: Alerts when you miss a call
- **Call Details**: Notifications show:
  - Caller name
  - Call type (video/audio)
  - Quick actions to answer or decline

### Setup
Push notifications are automatically configured when you log in. No additional setup required.

### Notification Types
1. **Active Call Notification**
   - Title: "Incoming Video/Audio Call"
   - Body: "[Name] is calling you..."
   - Priority: High

2. **Missed Call Notification**
   - Title: "Missed Call"
   - Body: "You missed a [type] call from [Name]"
   - Priority: Normal

### Implementation Details
- **Service**: `NotificationService.js`
  - `sendCallNotification(callerId, receiverId, callType, callId)`
  - `sendMissedCallNotification(callerId, receiverId, callType)`
- **Platform**: Uses Expo Push Notifications
- **Channels**: Android uses dedicated "calls" channel

---

## 3. TURN Server Configuration

### Overview
TURN servers enable calls to work even behind strict firewalls and NAT configurations.

### Default Configuration
The app comes pre-configured with free TURN servers:
- **STUN Servers**: Google's public STUN servers
- **TURN Servers**: Metered.ca free relay servers
  - Ports: 80, 443, 443/tcp
  - Limited quota but sufficient for testing

### Production Recommendations

#### Free TURN Servers
1. **Metered.ca** (Already configured)
   - Limited free tier
   - Good for testing
   - Sign up at: https://www.metered.ca

2. **OpenRelay**
   - Public TURN server
   - No authentication required
   - URL: `turn:openrelay.metered.ca:80`

#### Commercial TURN Servers
1. **Twilio TURN/STUN**
   - Enterprise-grade
   - 99.99% uptime
   - Pay-as-you-go pricing

2. **Xirsys**
   - WebRTC infrastructure
   - Global CDN
   - Free tier available

3. **Cloudflare Calls**
   - Low latency
   - Global network
   - Built-in security

### Custom Configuration
To use your own TURN servers, update the configuration in `webrtc-call.html`:

```javascript
const configuration = {
  iceServers: [
    // STUN servers
    { urls: 'stun:stun.l.google.com:19302' },

    // Your TURN server
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'your-username',
      credential: 'your-password'
    }
  ]
};
```

### Testing TURN Servers
Use this tool to test your TURN server configuration:
https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

---

## 4. Group Calls

### Overview
Make video or audio calls with multiple participants simultaneously.

### Features
- **Multi-participant Support**: Up to 4 participants recommended
- **Participant List**: See all active participants
- **Dynamic Joining**: Participants can join and leave during the call
- **Call Controls**: Same controls as 1-on-1 calls (mute, video, etc.)

### Usage

#### Starting a Group Call
```javascript
const result = await callService.initiateGroupCall(
  currentUserId,
  [participantId1, participantId2, participantId3],
  'video' // or 'audio'
);

navigation.navigate('GroupCall', {
  groupCallId: result.callId,
  callType: 'video',
  participants: participantsArray,
  currentUserId: currentUserId
});
```

#### Joining a Group Call
Participants receive a notification and can join by tapping it.

### Implementation Details
- **Screen**: `GroupCallScreen.js`
- **Service Methods**:
  - `initiateGroupCall(callerId, participantIds, callType)`
  - `joinGroupCall(callId, userId)`
  - `leaveGroupCall(callId, userId)`
- **Architecture**: Mesh topology (peer-to-peer connections)
- **Data Model**:
  ```javascript
  {
    callerId: string,
    callType: 'video' | 'audio',
    isGroupCall: true,
    participants: [
      { id: string, status: string, joinedAt: timestamp }
    ],
    status: 'ringing' | 'active' | 'ended'
  }
  ```

### Limitations
- **Recommended**: Maximum 4 participants
- **Network**: Bandwidth increases with participant count
- **Performance**: May vary based on device capabilities

---

## 5. Call Quality Indicators

### Overview
Real-time monitoring and display of call quality metrics.

### Features
- **Quality Levels**:
  - 🟢 **Good**: Low packet loss, low latency
  - 🟡 **Fair**: Moderate packet loss or latency
  - 🔴 **Poor**: High packet loss or latency

- **Metrics Monitored**:
  - Packet loss
  - Jitter
  - Round-trip time (RTT)
  - Bitrate

### Visual Indicators
Located in the top-left corner of the call screen:
- WiFi icon with quality label
- Color-coded (green/yellow/red)
- Updates every 2 seconds

### Quality Thresholds
```javascript
Good:  packetsLost < 20 && RTT < 150ms
Fair:  packetsLost < 50 && RTT < 300ms
Poor:  packetsLost >= 50 || RTT >= 300ms
```

### Troubleshooting Poor Quality
1. **Check Internet Connection**
   - Switch to WiFi if on cellular
   - Move closer to router

2. **Reduce Bandwidth Usage**
   - Close other apps
   - Turn off video (use audio-only)

3. **Network Issues**
   - Check if TURN servers are working
   - Test with different network

### Implementation Details
- **Monitoring**: WebRTC `getStats()` API
- **Update Interval**: 2 seconds
- **Handler**: `handleWebViewMessage()` in `ActiveCallScreen.js`

---

## 6. Screen Sharing

### Overview
Share your screen during video calls to show presentations, documents, or apps.

### Features
- **Easy Toggle**: Single button to start/stop sharing
- **Seamless Switching**: Automatically switches between camera and screen
- **Visual Feedback**: Screen share button highlights when active
- **Auto-Stop**: Screen sharing stops when you end the system screen capture

### Usage

#### Start Screen Sharing
1. During a video call, tap the **screen share** icon (desktop icon)
2. Select the content you want to share:
   - Entire screen
   - Specific window
   - Browser tab (on web)
3. Tap "Start Sharing"

#### Stop Screen Sharing
1. Tap the **screen share** icon again (now highlighted)
2. OR stop sharing from your system screen capture controls
3. Camera automatically switches back to normal video

### Platform Support
- ✅ **Desktop/Web**: Full support
- ⚠️ **Android**: Limited support (may require additional permissions)
- ⚠️ **iOS**: Not supported due to iOS WebRTC limitations

### Technical Details
- **API**: `navigator.mediaDevices.getDisplayMedia()`
- **Track Replacement**: Uses `replaceTrack()` to switch video streams
- **Quality**: Shares screen at optimal resolution
- **Audio**: Currently video-only (no system audio sharing)

### Implementation
```javascript
// Start screen sharing
sendToWebView('startScreenSharing', {});

// Stop screen sharing
sendToWebView('stopScreenSharing', {});

// Handle events
case 'screenSharingStarted':
  setIsScreenSharing(true);
  break;
case 'screenSharingStopped':
  setIsScreenSharing(false);
  break;
```

---

## Architecture Overview

### Call Flow Diagram
```
User A initiates call
    ↓
Create call document in Firebase
    ↓
Send push notification to User B
    ↓
User B accepts call
    ↓
Establish WebRTC peer connection
    ↓
Exchange SDP offer/answer via Firebase
    ↓
Exchange ICE candidates
    ↓
STUN/TURN server negotiation
    ↓
Direct P2P connection established
    ↓
Media streaming (video/audio)
    ↓
Quality monitoring active
    ↓
Call ends → Update Firebase
```

### Firebase Data Structure
```
calls/
  {callId}/
    callerId: string
    receiverId: string
    callType: 'video' | 'audio'
    status: 'ringing' | 'active' | 'ended' | 'missed' | 'declined'
    startTime: timestamp
    endTime: timestamp
    duration: number (seconds)
    offer: string (SDP)
    answer: string (SDP)
    iceCandidates: {
      caller: array,
      receiver: array
    }
    // Group calls only:
    isGroupCall: boolean
    participants: array
```

### File Structure
```
src/
├── screens/
│   ├── CallsScreen.js          # Call history display
│   ├── ActiveCallScreen.js     # 1-on-1 call with quality indicators
│   ├── GroupCallScreen.js      # Group call screen
│   ├── IncomingCallScreen.js   # Incoming call UI
│   └── OutgoingCallScreen.js   # Outgoing call UI
├── services/
│   ├── callService.js          # Call management
│   └── NotificationService.js  # Push notifications
└── assets/
    └── webrtc-call.html        # WebRTC implementation
```

---

## Performance Optimization

### Recommended Settings
- **Video Resolution**: 720p (1280x720) for optimal quality
- **Frame Rate**: 30fps
- **Audio Codec**: Opus
- **Video Codec**: VP8 or H.264

### Bandwidth Requirements
- **Audio only**: ~50 Kbps
- **Video SD (480p)**: ~500 Kbps
- **Video HD (720p)**: ~1.5 Mbps
- **Video FHD (1080p)**: ~3 Mbps

### Battery Optimization
- Use audio-only calls when possible
- Lower video resolution on mobile
- Avoid screen sharing on battery power

---

## Troubleshooting

### Common Issues

#### 1. Calls Not Connecting
**Symptoms**: Call rings but never connects
**Solutions**:
- Check TURN server configuration
- Verify both users have internet
- Test with different network (WiFi vs cellular)
- Check firewall settings

#### 2. No Notifications
**Symptoms**: Not receiving incoming call notifications
**Solutions**:
- Check app notification permissions
- Verify push token is saved
- Test with foreground notifications first
- Check Expo push notification service status

#### 3. Poor Call Quality
**Symptoms**: Choppy video, audio cutting out
**Solutions**:
- Check network speed (min 1.5 Mbps recommended)
- Switch to audio-only
- Move closer to WiFi router
- Close background apps
- Check quality indicator for specific metrics

#### 4. Screen Sharing Not Working
**Symptoms**: Screen share button doesn't work
**Solutions**:
- Ensure you're on a video call
- Check browser/platform support
- Grant screen capture permissions
- Try restarting the call

#### 5. Group Call Issues
**Symptoms**: Some participants can't join
**Solutions**:
- Limit participants to 4 or fewer
- Check each participant's network
- Ensure all users have latest app version
- Verify Firebase rules allow group call data

---

## Security Considerations

### Data Encryption
- ✅ **Media Streams**: End-to-end encrypted via WebRTC (DTLS-SRTP)
- ✅ **Signaling**: Encrypted via Firebase (HTTPS)
- ✅ **Push Notifications**: Encrypted in transit

### Privacy
- Call metadata stored in Firebase
- Media streams are peer-to-peer (not recorded)
- Call history can be cleared by user
- Notifications respect user privacy settings

### Best Practices
1. Use authenticated TURN servers in production
2. Implement rate limiting for call requests
3. Add user blocking functionality
4. Monitor for abuse patterns
5. Comply with GDPR/privacy regulations

---

## Future Enhancements

### Potential Features
- [ ] Call recording
- [ ] Call transfer
- [ ] Virtual backgrounds
- [ ] Background blur
- [ ] Noise cancellation
- [ ] Picture-in-picture mode
- [ ] Breakout rooms for group calls
- [ ] Call scheduling
- [ ] Integration with calendar
- [ ] Call analytics dashboard

---

## API Reference

### CallService Methods

#### `initiateCall(callerId, receiverId, callType)`
Start a 1-on-1 call
```javascript
const result = await callService.initiateCall(
  'user123',
  'user456',
  'video'
);
```

#### `initiateGroupCall(callerId, participantIds, callType)`
Start a group call
```javascript
const result = await callService.initiateGroupCall(
  'user123',
  ['user456', 'user789'],
  'video'
);
```

#### `answerCall(callId)`
Answer an incoming call
```javascript
await callService.answerCall(callId);
```

#### `declineCall(callId)`
Decline an incoming call
```javascript
await callService.declineCall(callId);
```

#### `endCall(callId, duration)`
End an active call
```javascript
await callService.endCall(callId, 120); // 120 seconds
```

#### `getCallHistory(userId)`
Retrieve call history
```javascript
const history = await callService.getCallHistory('user123');
```

### NotificationService Methods

#### `sendCallNotification(callerId, receiverId, callType, callId)`
Send incoming call notification
```javascript
await notificationService.sendCallNotification(
  'user123',
  'user456',
  'video',
  'call789'
);
```

#### `sendMissedCallNotification(callerId, receiverId, callType)`
Send missed call notification
```javascript
await notificationService.sendMissedCallNotification(
  'user123',
  'user456',
  'video'
);
```

---

## Support & Resources

### Documentation
- [WebRTC Setup Guide](WEBRTC_SETUP.md)
- [Firebase Setup](https://firebase.google.com/docs)
- [Expo Notifications](https://docs.expo.dev/push-notifications/overview/)

### Debugging Tools
- Chrome WebRTC Internals: `chrome://webrtc-internals`
- Firefox WebRTC Stats: `about:webrtc`
- TURN Server Tester: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

### Community
- WebRTC GitHub: https://github.com/webrtc
- Stack Overflow: Tag [webrtc]
- WebRTC Discord: https://discord.gg/webrtc

---

## License & Credits

### Technologies Used
- **WebRTC**: Real-time communication
- **Firebase**: Backend and signaling
- **Expo**: React Native framework
- **React Native**: Mobile app framework

### Credits
- WebRTC implementation based on standard WebRTC practices
- TURN servers provided by Metered.ca (free tier)
- Icons from Ionicons

---

**Last Updated**: 2025-11-01
**Version**: 2.0.0
**Author**: Chat App Development Team
