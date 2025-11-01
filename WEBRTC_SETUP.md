# WebRTC Video/Audio Calling - Setup Guide

## ✅ Features Implemented

- **Video Calls**: Full HD video calling with camera controls
- **Audio Calls**: High-quality voice calls
- **Call Management**: Incoming, outgoing, and active call screens
- **Hybrid Architecture**: Native UI + WebView WebRTC

---

## 🚀 How to Use

### Starting a Call

1. Open any chat conversation
2. Tap the **video camera icon** (📹) for video call
3. Tap the **phone icon** (📞) for audio call
4. Wait for the other user to answer

### Receiving a Call

1. When someone calls you, **IncomingCallScreen** appears automatically
2. Your phone will vibrate
3. Tap **Answer** (green) to accept
4. Tap **Decline** (red) to reject

### During a Call

**Video Call Controls:**
- 🎥 Toggle camera on/off
- 🔄 Switch between front/back camera
- 🎤 Mute/unmute microphone
- ❌ End call (red button)

**Audio Call Controls:**
- 🎤 Mute/unmute microphone
- ❌ End call (red button)

---

## 🔧 Technical Setup

### Firebase Configuration

**Required Firestore Collections:**
- `calls` - Stores call metadata and signaling data

**Required Firestore Indexes:**
Create these indexes in Firebase Console → Firestore → Indexes:

1. Collection: `calls`
   - Fields: `receiverId` (Ascending), `status` (Ascending), `startTime` (Descending)

2. Collection: `calls`
   - Fields: `callerId` (Ascending), `startTime` (Descending)

### Android Setup

The HTML file is already copied to Android assets. No additional setup needed.

### iOS Setup

No additional setup needed. The HTML file is bundled automatically.

---

## 🌐 Production Checklist

### ✅ Already Done
- [x] WebRTC peer connection
- [x] STUN servers configured
- [x] ICE candidate exchange via Firebase
- [x] Call state management
- [x] Native UI with WebView
- [x] Camera/Microphone permissions
- [x] Call duration tracking

### ⚠️ TODO for Production

1. **Add TURN Servers** (Critical for NAT traversal)
   ```javascript
   // In assets/webrtc-call.html, update:
   const configuration = {
     iceServers: [
       { urls: 'stun:stun.l.google.com:19302' },
       {
         urls: 'turn:your-turn-server.com:3478',
         username: 'user',
         credential: 'pass'
       }
     ]
   };
   ```

   **Free TURN services:**
   - Twilio (free tier)
   - Xirsys (free tier)
   - Self-hosted Coturn

2. **Implement Push Notifications for Calls**
   - App needs to wake up when call comes in background
   - Use Firebase Cloud Messaging (FCM)
   - Send notification when call is initiated

3. **Add Call History**
   - Display past calls in CallsScreen
   - Show missed/declined/completed calls
   - Tap to call back

4. **Handle Permissions Gracefully**
   - Request camera/mic permissions before call
   - Show helpful error if permissions denied
   - Guide user to settings if needed

5. **Test on Real Devices**
   - Emulators don't support camera well
   - Test on actual Android/iOS devices
   - Test under different network conditions

---

## 🐛 Troubleshooting

### Issue: "Connection failed" or calls don't connect

**Solution:** Add TURN servers (see Production Checklist #1)
- About 20% of users need TURN due to firewall/NAT
- STUN alone won't work for all network configurations

### Issue: No incoming call notification

**Solution:** App must be open to receive calls currently
- Implement push notifications (see Production Checklist #2)
- Or keep app running in background

### Issue: Black screen during video call

**Solutions:**
1. Check camera permissions are granted
2. Test on real device (not emulator)
3. Check browser console in WebView for errors

### Issue: "Cannot read property 'getUserMedia'"

**Solution:** WebRTC requires HTTPS or localhost
- Use `expo start --https` for testing
- Production deployment must use HTTPS

---

## 📊 Architecture

```
┌─────────────────────────────────┐
│    React Native App             │
│  ┌──────────────────────────┐   │
│  │  Call Screens (Native)   │   │
│  └──────────┬───────────────┘   │
│             │                    │
│  ┌──────────▼───────────────┐   │
│  │  WebView                 │   │
│  │  ┌────────────────────┐  │   │
│  │  │ webrtc-call.html   │  │   │
│  │  │ (WebRTC Core)      │  │   │
│  │  └────────────────────┘  │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
         ↕ (Signaling)
   Firebase Firestore
         ↕
   Other User's Device
```

---

## 📝 Files Structure

```
src/
├── screens/
│   ├── IncomingCallScreen.js  → UI for receiving calls
│   ├── OutgoingCallScreen.js  → UI for calling someone
│   └── ActiveCallScreen.js    → UI during active call (with WebView)
├── services/
│   └── callService.js         → Firebase signaling & call management
assets/
└── webrtc-call.html          → WebRTC video/audio implementation
android/app/src/main/assets/
└── webrtc-call.html          → Copy for Android
```

---

## 🎬 Next Steps

1. **Test the calls:**
   ```bash
   npm start
   ```
   - Open app on two devices/emulators
   - Start a call and test all controls

2. **Add TURN servers** (required for production)

3. **Implement push notifications** for background calls

4. **Test on real devices** (not just emulators)

---

## 💡 Tips

- **Battery Usage**: Video calls use more battery. This is normal for WebRTC.
- **Network**: Calls require good internet. 4G/WiFi recommended.
- **Privacy**: All calls are peer-to-peer (P2P) via WebRTC.
- **Quality**: Video quality adapts based on network speed.

---

## 📞 Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review Firebase Console for signaling errors
3. Check browser console in WebView for WebRTC errors
4. Ensure all Firestore indexes are created

---

**Status:** ✅ Ready for testing
**Production Ready:** ⚠️ After adding TURN servers & push notifications
