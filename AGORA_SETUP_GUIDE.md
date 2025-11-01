# Agora.io Setup Guide

This app now uses **Agora.io** for video and audio calls. Agora provides reliable, high-quality calling with a simple SDK.

---

## 📋 Table of Contents

1. [Get Your Free Agora Account](#1-get-your-free-agora-account)
2. [Configure Your App](#2-configure-your-app)
3. [Build & Test](#3-build--test)
4. [Pricing & Limits](#4-pricing--limits)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Get Your Free Agora Account

### Step 1: Sign Up
1. Go to **https://console.agora.io/**
2. Click **"Sign Up"**
3. Create your account (email or GitHub)

### Step 2: Create a Project
1. After login, click **"Project Management"** in the left sidebar
2. Click **"Create"** button
3. Enter project details:
   - **Project Name**: ChatApp (or your choice)
   - **Use Case**: Social
   - **Authentication**: Secured mode: APP ID + Token (Recommended for production)
     - For testing, you can use: **Testing mode: APP ID**
4. Click **"Submit"**

### Step 3: Get Your App ID
1. Your project will appear in the list
2. Click the **eye icon** 👁️ next to "App ID"
3. Copy the **App ID** (you'll need this!)

Example App ID format: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`

---

## 2. Configure Your App

### Update Agora Config

Open `src/config/agoraConfig.js` and replace with your App ID:

```javascript
const AgoraConfig = {
  // Replace with your actual Agora App ID
  appId: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',  // ← Paste your App ID here

  // Token server URL (optional, for production security)
  tokenServerUrl: null,  // Leave null for testing
};
```

**Important:**
- ✅ **Testing Mode**: Just add your App ID, that's it!
- ⚠️ **Production Mode**: You'll need a token server (see below)

---

## 3. Build & Test

### Install Dependencies

```bash
npm install
```

### Build Native App

Agora requires a native build (won't work in Expo Go).

#### Option A: EAS Build (Easiest)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Build development client
eas build --profile development --platform android
```

Wait for build to complete, then install the `.apk` on your device.

#### Option B: Local Build

```bash
# Android
npx expo run:android

# iOS (Mac only)
npx expo run:ios
```

### Test Calls

1. Open app on two devices
2. Start a call from one device
3. Answer on the other device
4. You should see/hear each other! 🎉

**Console logs to look for:**
```
✅ "Agora App ID: a1b2c3d4..."
✅ "Joining channel: [callId]"
✅ "Successfully joined channel"
✅ "Remote user joined: [uid]"
```

---

## 4. Pricing & Limits

### Free Tier
Agora provides a **generous free tier**:

- 🎁 **10,000 minutes/month FREE**
- ✅ Video calls
- ✅ Audio calls
- ✅ Up to 1080p quality
- ✅ Unlimited projects

**Usage Examples:**
- 333 calls @ 30 minutes each
- 10,000 calls @ 1 minute each
- Mix of video and audio counts toward total

### Paid Plans
After free tier:

| Type | Price |
|------|-------|
| Audio | $0.99 per 1,000 minutes |
| Video SD | $3.99 per 1,000 minutes |
| Video HD | $14.99 per 1,000 minutes |

**For a small app:** Free tier is usually enough!

### Check Your Usage

1. Go to **https://console.agora.io/**
2. Click **"Usage"** in sidebar
3. View your monthly usage

---

## 5. Troubleshooting

### Issue: "Agora App ID not configured"

**Solution:** Update `src/config/agoraConfig.js` with your App ID

```javascript
appId: 'YOUR_ACTUAL_APP_ID_HERE',  // Not 'YOUR_AGORA_APP_ID'
```

---

### Issue: "Authentication failed" or can't join channel

**Possible causes:**

1. **Wrong App ID**
   - Double-check you copied the correct App ID
   - Remove any spaces or quotes

2. **Project in wrong mode**
   - For testing: Use "Testing mode: APP ID" in Agora console
   - For production: Need token server (see Production Setup below)

3. **Network firewall**
   - Agora needs internet access
   - Try on different WiFi/cellular

---

### Issue: Can't see/hear other user

**Checklist:**

- ✅ Both users granted camera/microphone permissions
- ✅ Both users using same channel (same callId)
- ✅ Check console logs for "Remote user joined"
- ✅ Try switching from WiFi to cellular (or vice versa)
- ✅ Restart app on both devices

---

### Issue: Build fails

**Common fixes:**

```bash
# Clear cache
npx expo start -c

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Try different build command
npx expo run:android --no-build-cache
```

---

## 🔒 Production Setup (Optional)

### Why Use Tokens?

For **production apps**, you should use **token authentication** for security:
- Prevents unauthorized users from joining calls
- Adds expiration time to access
- More control over who can call whom

### Setup Token Server

You'll need a backend server to generate tokens.

#### Option 1: Use Agora's Token Server (Recommended)

Agora provides a simple token server you can deploy:

1. **Clone Agora Token Server:**
   ```bash
   git clone https://github.com/AgoraIO/Tools.git
   cd Tools/DynamicKey/AgoraDynamicKey/nodejs
   ```

2. **Deploy to Heroku/Vercel/AWS:**
   - Follow deployment instructions in repository
   - Set environment variables:
     - `APP_ID`: Your Agora App ID
     - `APP_CERTIFICATE`: From Agora console (Primary Certificate)

3. **Update your config:**
   ```javascript
   const AgoraConfig = {
     appId: 'your_app_id',
     tokenServerUrl: 'https://your-token-server.com/rtc-token',
   };
   ```

#### Option 2: Generate Tokens in Your Backend

Add token generation to your existing backend:

**Install Agora token library:**
```bash
npm install agora-access-token
```

**Create token endpoint:**
```javascript
import { RtcTokenBuilder, RtcRole } from 'agora-access-token';

app.get('/rtc-token', (req, res) => {
  const appId = 'YOUR_APP_ID';
  const appCertificate = 'YOUR_APP_CERTIFICATE';
  const channelName = req.query.channelName;
  const uid = req.query.uid || 0;
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    role,
    privilegeExpiredTs
  );

  res.json({ token });
});
```

---

## 📊 Feature Comparison

| Feature | Agora | Native WebRTC |
|---------|-------|---------------|
| Setup Time | ✅ 5 minutes | ⚠️ Hours |
| Code Complexity | ✅ Simple | ⚠️ Complex |
| Works on Mobile | ✅ Yes | ✅ Yes |
| NAT Traversal | ✅ Automatic | ⚠️ Need TURN servers |
| Reliability | ✅ Enterprise grade | ⚠️ Varies |
| Cost | 💰 Free tier generous | ✅ Free (self-hosted) |
| Quality | ✅ Excellent | ✅ Excellent |
| Scaling | ✅ Automatic | ⚠️ Manual |

---

## 🎯 Quick Start Checklist

For Testing:
- [ ] Create Agora account
- [ ] Create project in Agora console
- [ ] Copy App ID
- [ ] Paste App ID in `src/config/agoraConfig.js`
- [ ] Build app: `npx expo run:android`
- [ ] Test call between two devices
- [ ] Enjoy! 🎉

For Production:
- [ ] All testing steps above
- [ ] Set up token server
- [ ] Update `tokenServerUrl` in config
- [ ] Enable "Secured mode" in Agora console
- [ ] Test token authentication
- [ ] Monitor usage in Agora dashboard

---

## 📚 Resources

- **Agora Console**: https://console.agora.io/
- **Documentation**: https://docs.agora.io/en/video-calling/get-started/get-started-sdk
- **React Native SDK**: https://docs.agora.io/en/video-calling/get-started/get-started-sdk?platform=react-native
- **API Reference**: https://api-ref.agora.io/en/video-sdk/react-native/4.x/API/rtc_api_overview.html
- **Token Server Guide**: https://docs.agora.io/en/video-calling/develop/authentication-workflow

---

## 💡 Tips

### Best Practices
1. ✅ **Always use tokens in production** (not just App ID)
2. ✅ **Monitor your usage** in Agora console
3. ✅ **Set up alerts** for usage limits
4. ✅ **Test on real devices** (not emulators)
5. ✅ **Handle network changes** gracefully

### Common Pitfalls
- ❌ Forgetting to update App ID (default won't work)
- ❌ Using Testing mode in production (security risk)
- ❌ Not handling permissions properly
- ❌ Testing only on emulators (may not work)
- ❌ Not monitoring usage (unexpected bills)

---

## 🆘 Getting Help

### Check Console Logs
Always check console for error messages:
```bash
# Android
npx react-native log-android

# iOS
npx react-native log-ios
```

### Agora Support
- **Support Portal**: https://agora-ticket.agora.io/
- **Community**: https://www.agora.io/en/community/
- **Stack Overflow**: Tag [agora.io]

### App Issues
If you encounter issues with the implementation:
1. Check this guide first
2. Review console logs
3. Test with Agora demo app (to isolate SDK vs app issues)
4. Create GitHub issue with logs

---

## ✅ You're All Set!

Once you've:
1. ✅ Created Agora account
2. ✅ Got your App ID
3. ✅ Updated the config
4. ✅ Built the app

**Your video calls should work perfectly!** 🎊

The Agora SDK handles all the complex WebRTC stuff for you:
- NAT traversal
- Network quality
- Codec selection
- Error recovery
- Bandwidth optimization

Enjoy your working video calls! 📞✨

---

**Last Updated:** 2025-11-01
**Agora SDK Version:** 4.x
**React Native Agora Version:** Latest
