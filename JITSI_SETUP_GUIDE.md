# Jitsi Meet Video Calls - Setup Guide

## 🎉 100% FREE Forever - Works with Pure Expo Go!

Your chat app now uses **Jitsi Meet** for video and audio calls. This solution works perfectly with **pure Expo Go** - no custom development builds needed!

---

## ✅ What You Get

- **✅ 100% FREE Forever** - No limits, no account needed!
- **✅ Expo Go Compatible** - Test directly with `expo start`
- **✅ Professional UI** - Same quality as Zoom/Google Meet
- **✅ Open Source** - No vendor lock-in
- **✅ No Setup Required** - Works immediately with public server
- **✅ WebRTC Quality** - Enterprise-grade video calls
- **✅ Mobile Optimized** - Works great on iOS and Android
- **✅ Unlimited Minutes** - No restrictions, ever!

---

## 🚀 Quick Start (Zero Setup!)

Your app is **ready to use immediately** with Jitsi's public server!

### Test Right Now:

```bash
# Start Expo
expo start

# Scan QR code with Expo Go
# Make a call - it just works! 🎊
```

**How it works:**
- Rooms are created automatically using your `callId`
- Anyone with the same `callId` joins the same room
- **NO configuration required!**
- **NO account needed!**
- **NO limits!**

---

## 📱 How to Use

### 1. Start a Call
- Tap a contact in your chat
- Choose Video Call or Voice Call
- Call screen opens with Jitsi Meet embedded

### 2. Join a Call
- Receive incoming call notification
- Accept the call
- Both users join the same Jitsi room
- Video/audio works automatically!

### 3. During the Call
Jitsi provides professional built-in controls:
- 🎤 Mute/unmute microphone
- 📹 Toggle camera on/off
- 🔄 Switch front/back camera
- 💬 Chat messages
- ✋ Raise hand
- 📊 View connection quality
- 🖥️ Screen sharing (on some devices)
- ⚙️ Settings menu
- 📞 End call

### 4. End Call
- Tap the red "Hang up" button
- Or use the back button
- Call duration is automatically saved

---

## 🎨 Features

### What Users See:
- **Professional video interface** (same as Zoom)
- **Participant tiles** with names
- **Full screen mode**
- **Picture-in-picture** for multitasking
- **Connection quality indicators**
- **Noise suppression**
- **Auto-switching speaker view**

### What You Track:
- Call duration (via Firebase)
- Call history
- User profiles
- Call status (ringing, active, ended)
- Call type (video/audio)

---

## 🆚 Why Jitsi Meet?

### Comparison with Other Solutions:

| Feature | Jitsi Meet | Whereby | Daily.co | Agora |
|---------|------------|---------|----------|-------|
| **Free tier** | ♾️ Unlimited | 2000 min/mo | 10k min/mo | 10k min/mo |
| **Account needed** | ❌ No | ⚠️ Yes | ⚠️ Yes | ⚠️ Yes |
| **Expo Go** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Setup time** | 0 minutes | 5 minutes | 10 minutes | 30 minutes |
| **Open source** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Custom server** | ✅ Optional | ❌ No | ❌ No | ❌ No |

### Jitsi is Used By:
- 🏢 Fortune 500 companies
- 🎓 Universities worldwide
- 🏛️ Government organizations
- 💼 Remote teams
- 🏥 Telemedicine platforms

---

## 🔧 How It Works

### Architecture:

```
User A                 Firebase              User B
  |                      |                     |
  |-- initiateCall() -->|                     |
  |                      |-- notification --> |
  |                      |                     |
  |                      |<-- acceptCall() ---|
  |                      |                     |
  |                   status='active'          |
  |                      |                     |
  |-- navigate ActiveCallScreen -----------> |
  |                                            |
  |-- Load: meet.jit.si/callId ------------> |
  |                                            |
  |<========== Video/Audio Call ===========> |
  |         (handled by Jitsi Meet)           |
  |                                            |
  |<---------- End Call ----------------------|
  |                      |                     |
  |-- endCall() -------->|<-- endCall() ------|
```

### URL Format:

```
https://meet.jit.si/{roomName}#{config}

Example:
https://meet.jit.si/abc123#userInfo.displayName=John&config.prejoinPageEnabled=false
```

### Room Naming:
- Uses Firebase `callId` as room name
- Automatically cleaned (removes special characters)
- Both users use the same room name
- Rooms are created on-demand (no pre-creation needed)

---

## 🎯 Customization

### Basic Configuration

The app is configured in `src/config/jitsiConfig.js`:

```javascript
const JitsiConfig = {
  serverUrl: 'https://meet.jit.si', // Free public server

  defaultConfig: {
    prejoinPageEnabled: false,      // Skip pre-join screen
    startWithAudioMuted: false,     // Start with mic on
    startWithVideoMuted: false,     // Start with camera on (video calls)
    disableInviteFunctions: true,   // Hide invite button
    enableWelcomePage: false,       // Skip welcome page
    resolution: 720,                // 720p video quality
  },
};
```

### URL Parameters

You can customize calls by modifying `createJitsiUrl()` in `src/config/jitsiConfig.js`:

**Common parameters:**
- `userInfo.displayName` - User's name
- `config.prejoinPageEnabled` - Show/hide pre-join screen
- `config.startWithAudioMuted` - Start muted
- `config.startWithVideoMuted` - Start without video
- `config.resolution` - Video quality (360, 720, 1080)
- `config.disableInviteFunctions` - Hide invite buttons
- `config.enableNoisyMicDetection` - Detect noisy microphones
- `config.enableNoAudioDetection` - Detect audio issues
- `config.enableNoiseCancellation` - Background noise suppression

**Full list:** https://github.com/jitsi/jitsi-meet/blob/master/config.js

---

## 🏢 Advanced: Self-Hosted Server (Optional)

Want complete control? Host your own Jitsi server!

### Benefits:
- ✅ Your own domain (meet.yourcompany.com)
- ✅ Complete privacy control
- ✅ Custom branding
- ✅ No third-party servers
- ✅ Still 100% free!

### Quick Setup:

**Option 1: Docker (Easiest)**
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Run Jitsi Meet
docker run -d \
  -p 8000:80 \
  -p 8443:443 \
  jitsi/web:latest
```

**Option 2: Ubuntu Server**
```bash
# Add Jitsi repository
curl https://download.jitsi.org/jitsi-key.gpg.key | sudo sh -c 'gpg --dearmor > /usr/share/keyrings/jitsi-keyring.gpg'
echo 'deb [signed-by=/usr/share/keyrings/jitsi-keyring.gpg] https://download.jitsi.org stable/' | sudo tee /etc/apt/sources.list.d/jitsi-stable.list

# Install Jitsi Meet
sudo apt update
sudo apt install jitsi-meet
```

**Then update app config:**
```javascript
// src/config/jitsiConfig.js
const JitsiConfig = {
  serverUrl: 'https://meet.yourcompany.com',
  // ... rest of config
};
```

**Documentation:** https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart

---

## 🐛 Troubleshooting

### "Camera/Microphone not working"

**On iOS:**

Check `app.json` includes permissions:
```json
"ios": {
  "infoPlist": {
    "NSCameraUsageDescription": "This app needs camera access for video calls",
    "NSMicrophoneUsageDescription": "This app needs microphone access for voice and video calls"
  }
}
```

**On Android:**

Check `app.json` includes permissions:
```json
"android": {
  "permissions": [
    "CAMERA",
    "RECORD_AUDIO",
    "MODIFY_AUDIO_SETTINGS",
    "INTERNET"
  ]
}
```

### "WebView shows error" or "Black screen"

**Solutions:**
1. Check internet connection
2. Verify the room URL in console logs
3. Try the URL in a mobile browser first
4. Wait 10-15 seconds for Jitsi to load
5. Check Jitsi status: https://status.jitsi.io/

**Debug URL:**
```javascript
console.log('Jitsi URL:', roomUrl);
// Copy URL and test in Safari/Chrome
```

### "Video freezes" or "Poor quality"

**Solutions:**
1. Check internet speed (need 2+ Mbps)
2. Reduce video quality in config:
   ```javascript
   resolution: 360, // Lower quality
   ```
3. Switch to audio-only call
4. Check CPU usage on device
5. Close other apps

### "Can't hear other person"

**Solutions:**
1. Check device volume
2. Check if microphone is muted (red mic icon)
3. Test microphone in another app
4. Restart the call
5. Grant microphone permissions

### "Participant can't join"

**Solutions:**
1. Verify both users use exact same `callId`
2. Check console for room URL
3. Ensure both have internet connection
4. Check Firebase call status is 'active'
5. Try refreshing the call

---

## 🔐 Privacy & Security

### What Jitsi Handles:
- ✅ **End-to-end encryption** (E2EE available)
- ✅ **No data collection** (open source)
- ✅ **GDPR compliant**
- ✅ **Self-hostable** (full control)
- ✅ **Encrypted signaling**
- ✅ **Secure WebRTC**

### Your Firebase Data:
- Call metadata (callId, status, duration)
- User profiles (name, photo)
- **Does NOT include** video/audio data
- **Does NOT record** calls

### Jitsi's Privacy Policy:
- No call recording on public server
- Temporary room creation
- Automatic cleanup after call
- Anonymous usage (no tracking)

**Read more:** https://jitsi.org/security/

---

## 📊 Technical Details

### WebRTC Technology:
- **Peer-to-peer** when possible (lowest latency)
- **TURN servers** for NAT traversal
- **Simulcast** for bandwidth optimization
- **VP8/VP9/H.264** video codecs
- **Opus** audio codec (best quality)

### Browser Compatibility:
- ✅ Chrome/Chromium (best)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ✅ Edge
- ✅ React Native WebView

### System Requirements:
- **Internet:** 2+ Mbps upload/download
- **CPU:** Dual-core minimum
- **RAM:** 2GB minimum
- **OS:** iOS 12+, Android 6+

---

## 🎓 Best Practices

### 1. Room Naming
Always use Firebase `callId` for unique rooms:
```javascript
const roomUrl = createJitsiUrl(callId, displayName, isVideoCall);
```

### 2. Display Names
Pass user's actual name for better UX:
```javascript
const displayName = otherUser?.displayName || 'Guest';
```

### 3. Call Type
Respect user's preference (video vs audio):
```javascript
const isVideoCall = callType === 'video';
```

### 4. Network Quality
Monitor WebView errors and handle gracefully:
```javascript
onError={handleWebViewError}
```

### 5. Clean Up
Always end Firebase call when leaving:
```javascript
await callService.endCall(callId, duration);
```

### 6. Permissions
Request permissions early in the flow (already handled in IncomingCallScreen)

### 7. Error Handling
Provide clear error messages to users

### 8. Testing
Test on real devices with varying network conditions

---

## 🚀 Performance Tips

### Optimize Video Quality

**For slower connections:**
```javascript
// src/config/jitsiConfig.js
constraints: {
  video: {
    height: { ideal: 360, max: 480 }  // Lower resolution
  }
}
```

**For faster connections:**
```javascript
constraints: {
  video: {
    height: { ideal: 1080, max: 1080 }  // Higher resolution
  }
}
```

### Reduce Bandwidth

1. Use audio-only calls when video isn't needed
2. Lower video resolution
3. Disable screen sharing
4. Limit participants

### Improve Loading Speed

WebView loads faster with:
- Good internet connection
- Fewer URL parameters
- Simple room names

---

## 📚 Resources

### Official Documentation:
- **Jitsi Handbook:** https://jitsi.github.io/handbook/
- **API Documentation:** https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe
- **Configuration Options:** https://github.com/jitsi/jitsi-meet/blob/master/config.js
- **GitHub Repository:** https://github.com/jitsi/jitsi-meet

### Community:
- **Community Forum:** https://community.jitsi.org/
- **Stack Overflow:** https://stackoverflow.com/questions/tagged/jitsi
- **Reddit:** https://www.reddit.com/r/jitsi/

### Status & Support:
- **Service Status:** https://status.jitsi.io/
- **Report Issues:** https://github.com/jitsi/jitsi-meet/issues

---

## 💡 Advanced Features

### 1. Recording (Self-hosted only)

Enable recording on your own server:
```javascript
config.fileRecordingsEnabled: true,
config.dropbox: { appKey: 'YOUR_KEY' }
```

### 2. Live Streaming

Stream to YouTube/Facebook:
```javascript
config.liveStreamingEnabled: true
```

### 3. Dial-in Numbers

Add phone dial-in:
```javascript
config.dialInNumbersUrl: 'https://your-server/dial-in'
```

### 4. JWT Authentication

Secure rooms with tokens (self-hosted):
```javascript
config.enableUserRolesBasedOnToken: true
```

### 5. Breakout Rooms

Enable breakout rooms (experimental):
```javascript
config.breakoutRooms: { hideAddRoomButton: false }
```

---

## 🎁 Additional Features in Jitsi

### Built-in Extras:
- 💬 **In-call chat** - Text messages during call
- ✋ **Raise hand** - Signal you want to speak
- 🎨 **Virtual backgrounds** - Blur or custom background
- 📊 **Speaker stats** - See who spoke how much
- 🔇 **Noise suppression** - Filter background noise
- 📹 **Recording** - Record calls (self-hosted)
- 🖥️ **Screen sharing** - Share your screen
- 🎙️ **Push-to-talk** - Toggle mic with spacebar
- 📱 **Mobile optimized** - Great on phones
- 🌐 **100+ languages** - Automatic translation

---

## ✅ Summary

**You're all set!** Your video calling is powered by Jitsi Meet and works with pure Expo Go.

### What You Have:

✅ **100% FREE** video calls - No limits, ever!
✅ **Expo Go compatible** - Test immediately
✅ **Professional quality** - Enterprise-grade WebRTC
✅ **Zero setup** - Works out of the box
✅ **Open source** - No vendor lock-in
✅ **Privacy-focused** - No data collection
✅ **Self-hostable** - Optional full control

### Next Steps:

1. ✅ Test in Expo Go (works now!)
2. 📱 Make your first call
3. 🎊 Enjoy unlimited free video calls!

**Optional:**
- Host your own Jitsi server
- Customize UI/branding
- Add advanced features

---

## 🏆 Why This is the Best Solution

### For Your Use Case:
- ✅ You wanted **pure Expo Go** → Jitsi works!
- ✅ You wanted **free** → Jitsi is unlimited!
- ✅ You wanted **embedded in app** → WebView integration!
- ✅ You wanted **reliable** → Trusted by millions!

### No Compromises:
- ❌ No account needed
- ❌ No credit card
- ❌ No time limits
- ❌ No participant limits (reasonable use)
- ❌ No features locked behind paywall
- ❌ No vendor lock-in

---

**Happy calling! 🎉📞🎥**

---

**Need help?** Check troubleshooting section or visit https://community.jitsi.org/
