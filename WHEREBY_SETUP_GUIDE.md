# Whereby Embedded Video Calls - Setup Guide

## 🎉 Works with Expo Go! No Native Build Required!

Your chat app now uses **Whereby Embedded** for video and audio calls. This solution works perfectly with **pure Expo Go** - no custom development builds needed!

---

## ✅ What You Get

- **✅ Expo Go Compatible** - Test directly with `expo start`
- **✅ Professional UI** - Built-in video call interface
- **✅ Free Tier** - 2000 participant minutes/month
- **✅ No Setup Required** - Works immediately with public rooms
- **✅ WebRTC Quality** - Same technology as Zoom/Google Meet
- **✅ Mobile Optimized** - Works great on iOS and Android

---

## 🚀 Quick Start (No Account Needed)

Your app is **ready to use immediately** with public Whereby rooms!

### Test Right Now:

```bash
# Start Expo
expo start

# Scan QR code with Expo Go
# Make a call - it just works! 🎊
```

**How it works:**
- Public rooms are created automatically using your `callId`
- Anyone with the same `callId` joins the same room
- No configuration required!

---

## 📱 How to Use

### 1. Start a Call
- Tap a contact
- Choose Video or Voice call
- Call screen opens with Whereby embedded

### 2. Join a Call
- Receive incoming call notification
- Accept the call
- Both users join the same Whereby room
- Video/audio works automatically!

### 3. During the Call
- Whereby provides built-in controls:
  - Mute/unmute microphone
  - Toggle camera on/off
  - Switch front/back camera
  - End call

### 4. End Call
- Tap the red "Leave" button in Whereby UI
- Or use your app's end call button
- Call duration is saved

---

## 🔧 Optional: Custom Subdomain (For Branding)

Want your own branded video calls? Get a free Whereby account:

### Step 1: Create Free Account

1. Visit https://whereby.com/org/signup
2. Sign up (email + password)
3. Choose free plan (2000 minutes/month)

### Step 2: Get Your Subdomain

1. After signup, you'll get a subdomain like: `yourcompany.whereby.com`
2. Copy your subdomain name

### Step 3: Configure App

Open `src/config/wherebyConfig.js`:

```javascript
const WherebyConfig = {
  subdomain: 'yourcompany', // Add your subdomain here
  apiKey: '', // Optional - for API features
  // ... rest of config
};
```

### Step 4: Test

```bash
expo start
```

Now your calls use: `https://yourcompany.whereby.com/roomname` 🎊

---

## 🎨 Customization Options

### Available URL Parameters

You can customize the call experience in `src/config/wherebyConfig.js`:

```javascript
roomConfig: {
  background: 'off',        // Hide Whereby branding
  minimal: true,            // Minimal UI
  embed: true,              // Embedded mode
  precallReview: false,     // Skip pre-call setup
  skipMediaPermissionPrompt: false, // Ask for permissions
}
```

### Additional Options:

- `displayName` - User's name in the call
- `audio` - Enable/disable audio (default: true)
- `video` - Enable/disable video (default: true based on call type)
- `background` - Show/hide Whereby branding
- `minimal` - Minimal UI mode
- `floatSelf` - Floating self-view

**Documentation:** https://docs.whereby.com/whereby-101/customizing-rooms/using-url-parameters

---

## 💰 Pricing

### Free Tier (Perfect for Testing)
- **2000 participant minutes/month**
- Unlimited rooms
- Up to 4 participants per room
- Whereby branding visible

**Example:**
- 1 call with 2 people for 10 minutes = 20 participant minutes used
- You can do ~100 calls of 10 minutes each per month!

### Paid Plans (Optional)

**Starter ($9.99/month):**
- 10,000 participant minutes
- Up to 12 participants
- Remove Whereby branding
- Custom subdomain

**Business ($59/month):**
- Unlimited minutes
- Up to 200 participants
- API access
- Advanced features

**Compare plans:** https://whereby.com/information/embedded/pricing/

---

## 🔐 Privacy & Security

### What Whereby Handles:
- ✅ End-to-end encryption for video/audio
- ✅ GDPR compliant
- ✅ No call recording by default
- ✅ Automatic room cleanup

### Your Firebase Data:
- Call metadata (callId, status, duration)
- User profiles (name, photo)
- Does NOT include video/audio data

---

## 🐛 Troubleshooting

### "Camera/Microphone not working"

**On iOS:**
1. Check `app.json` has permissions:
```json
"ios": {
  "infoPlist": {
    "NSCameraUsageDescription": "This app needs camera access for video calls",
    "NSMicrophoneUsageDescription": "This app needs microphone access for voice and video calls"
  }
}
```

**On Android:**
1. Check `app.json` has permissions:
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

### "WebView shows error"

1. Check internet connection
2. Verify the room URL in console logs
3. Try opening the URL in a browser first
4. Check if Whereby is down: https://status.whereby.com/

### "Call connects but no video/audio"

1. Grant camera/microphone permissions when prompted
2. Check device camera/mic work in other apps
3. Try refreshing the WebView
4. Check Whereby service status

### "Black screen on load"

1. Wait 5-10 seconds for WebView to load
2. Check console for error messages
3. Verify `roomUrl` is generated correctly
4. Test the URL directly in mobile Safari/Chrome

---

## 📊 How It Works

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
  |<---------- Join Whereby Room -----------> |
  |                                            |
  |<========== Video/Audio Call ===========> |
  |         (handled by Whereby)              |
  |                                            |
  |<---------- End Call ----------------------|
  |                      |                     |
  |-- endCall() -------->|<-- endCall() ------|
```

### Call Flow:

1. **Initiate:** User A calls User B
   - Create call document in Firebase
   - Generate Whereby room URL from `callId`
   - Send notification to User B

2. **Accept:** User B accepts
   - Update call status to 'active'
   - Both navigate to ActiveCallScreen

3. **Connect:** WebView loads Whereby
   - Both users load same room URL
   - Whereby handles WebRTC connection
   - Video/audio streams established

4. **End:** Either user ends call
   - Call status updated to 'ended'
   - Duration saved to Firebase
   - Both navigate back

---

## 🔄 Migration from Agora

### What Changed:

**Removed:**
- ❌ `react-native-agora` package
- ❌ `src/components/AgoraVideoCall.js`
- ❌ `src/config/agoraConfig.js`
- ❌ Native build requirement

**Added:**
- ✅ `src/config/wherebyConfig.js`
- ✅ WebView-based ActiveCallScreen
- ✅ Whereby URL generation
- ✅ Expo Go compatibility

**Still Works:**
- ✅ Firebase call signaling
- ✅ Notifications
- ✅ Call history
- ✅ Duration tracking
- ✅ All UI/UX features

---

## 🎯 Best Practices

### 1. Room Naming
Use unique `callId` from Firebase:
```javascript
const roomUrl = createRoomUrl(callId, displayName, isVideoCall);
```

### 2. Display Names
Pass user's display name for better UX:
```javascript
const displayName = otherUser?.displayName || 'Guest';
```

### 3. Call Type
Respect user's call type preference:
```javascript
const isVideoCall = callType === 'video'; // true or false
```

### 4. Error Handling
Monitor WebView errors:
```javascript
onError={handleWebViewError}
```

### 5. Clean Up
Always end Firebase call when leaving:
```javascript
await callService.endCall(callId, duration);
```

---

## 🚀 Advanced Features (Optional)

### 1. API Integration

Get API key from Whereby to:
- Create rooms programmatically
- Set expiration times
- Lock rooms
- Recording

**API Docs:** https://docs.whereby.com/reference/whereby-rest-api-reference

### 2. Custom UI

Inject JavaScript to customize Whereby UI:
```javascript
<WebView
  injectedJavaScript={`
    // Custom styling or behavior
  `}
/>
```

### 3. Event Handling

Listen to Whereby events:
```javascript
const handleWebViewMessage = (event) => {
  const data = JSON.parse(event.nativeEvent.data);
  if (data.type === 'app.room_left') {
    handleEndCall();
  }
};
```

### 4. Quality Settings

Adjust video quality via URL params:
```javascript
createRoomUrl(callId, displayName, isVideoCall, {
  quality: 'low', // 'low', 'medium', 'high'
});
```

---

## 📚 Resources

- **Whereby Docs:** https://docs.whereby.com/
- **Embedded Docs:** https://docs.whereby.com/whereby-101/create-your-video/in-a-web-page
- **URL Parameters:** https://docs.whereby.com/whereby-101/customizing-rooms/using-url-parameters
- **API Reference:** https://docs.whereby.com/reference/whereby-rest-api-reference
- **Support:** https://whereby.com/information/support/

---

## ✅ Summary

**You're all set!** Your video calling is powered by Whereby and works with pure Expo Go.

### Next Steps:

1. ✅ Test in Expo Go (works now!)
2. 📱 Install on device
3. 🎥 Make your first call
4. 🎊 Enjoy hassle-free video calls!

**Optional:**
- Create Whereby account for custom subdomain
- Upgrade plan for more minutes
- Use API for advanced features

---

**Need help?** Check troubleshooting section or Whereby documentation!
