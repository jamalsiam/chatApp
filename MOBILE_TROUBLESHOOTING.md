# Mobile Call Troubleshooting Guide

## Common Issues and Solutions

### ❌ Issue: "Failed to start call" on Mobile

#### Symptoms
- Call screen shows but immediately fails
- Error message appears when trying to start a call
- Camera or microphone doesn't activate

#### Solutions

##### 1. Check Permissions
**The app needs camera and microphone permissions to work.**

**Android:**
1. Go to **Settings** → **Apps** → **ChatApp**
2. Tap **Permissions**
3. Enable:
   - 📷 **Camera** (for video calls)
   - 🎤 **Microphone** (for all calls)
4. Restart the app

**iOS:**
1. Go to **Settings** → **ChatApp**
2. Enable:
   - 📷 **Camera** (for video calls)
   - 🎤 **Microphone** (for all calls)
3. Restart the app

##### 2. Grant Permissions When Prompted
When you start or answer a call, the app will ask for permissions:
- Tap **Allow** or **While using the app**
- If you accidentally denied permission, follow step 1 above

##### 3. Check Network Connection
- Ensure you have a stable internet connection
- Try switching between WiFi and cellular data
- Test your connection speed (minimum 1.5 Mbps recommended)

##### 4. Clear App Cache (Android)
1. Go to **Settings** → **Apps** → **ChatApp**
2. Tap **Storage**
3. Tap **Clear Cache** (NOT Clear Data)
4. Restart the app

---

### 🔇 Issue: No Audio During Call

#### Solutions
1. **Check microphone permission** (see above)
2. **Unmute yourself**: Tap the microphone icon during the call
3. **Check volume**: Increase device volume
4. **Restart the call**
5. **Check for conflicting apps**: Close other apps using the microphone

---

### 📹 Issue: No Video During Call

#### Solutions
1. **Check camera permission** (see above)
2. **Enable camera**: Tap the camera icon during the call
3. **Check if camera is in use**: Close other apps using the camera
4. **Try switching cameras**: Tap the camera flip icon
5. **Restart your device**

---

### 🌐 Issue: Call Connection Problems

#### Symptoms
- Call connects but video/audio is choppy
- "Connection lost" error
- Poor call quality indicator (red/yellow)

#### Solutions
1. **Check internet speed**: Use speed test app (need 1.5+ Mbps)
2. **Move closer to WiFi router**
3. **Switch to WiFi** if on cellular data
4. **Close background apps** consuming bandwidth
5. **Restart your router**
6. **Try audio-only call** (uses less bandwidth)

---

### 🔔 Issue: Not Receiving Call Notifications

#### Solutions
1. **Check notification permissions**:
   - Android: Settings → Apps → ChatApp → Notifications → Enable all
   - iOS: Settings → ChatApp → Notifications → Allow Notifications

2. **Check battery optimization**:
   - Android: Settings → Apps → ChatApp → Battery → Unrestricted
   - iOS: No action needed

3. **Keep app running in background** for best results

4. **Ensure push token is registered**:
   - Log out and log back in
   - This will re-register your device for notifications

---

### 📱 Issue: App Crashes During Call

#### Solutions
1. **Update the app** to the latest version
2. **Clear app cache** (Android)
3. **Restart your device**
4. **Free up device storage** (need at least 500 MB free)
5. **Close other apps** to free up memory
6. **Check for OS updates**

---

### 🎥 Issue: Black Screen During Video Call

#### Solutions
1. **Enable camera permission** (see step 1)
2. **Tap the camera icon** to turn on video
3. **Check if another app is using the camera**
4. **Restart the app**
5. **Try the front camera** (tap flip icon)

---

## Platform-Specific Issues

### Android-Specific

#### WebView Issues
If the call interface doesn't load:
1. Update **Android System WebView**:
   - Open Play Store
   - Search "Android System WebView"
   - Tap Update
2. Update **Google Chrome** (used by WebView)
3. Restart device

#### Permission Dialogs Not Showing
1. Check if permissions are permanently denied:
   - Go to Settings → Apps → ChatApp → Permissions
   - If permissions show as "Denied", manually enable them
2. Reinstall the app (as last resort)

### iOS-Specific

#### Screen Sharing Not Available
- Screen sharing is **not supported on iOS** due to platform limitations
- Use iOS's built-in screen recording instead

#### CallKit Integration
- iOS handles calls differently
- Make sure "Allow Calls" is enabled in iOS Settings → ChatApp

---

## Debug Mode

### Enable Console Logs
The app now includes detailed logging. To view logs:

**Using Expo:**
```bash
npx expo start
# Press 'j' to open debugger
# View console logs in browser
```

**Using React Native CLI:**
```bash
# Android
adb logcat | grep "chatapp"

# iOS
react-native log-ios
```

### What to Look For
Check console for these messages:
- ✅ "Requesting camera and microphone permissions..."
- ✅ "All permissions granted"
- ✅ "WebView ready, initializing call..."
- ✅ "Call initialized successfully"

If you see errors, they will indicate the specific problem.

---

## Testing Checklist

Before reporting an issue, please test:

- [ ] Permissions are granted (Camera + Microphone)
- [ ] Internet connection is stable
- [ ] App is updated to latest version
- [ ] Device has sufficient storage
- [ ] Other apps are closed
- [ ] Device is restarted
- [ ] WiFi is being used (not cellular)
- [ ] Tried audio-only call (to isolate video issues)

---

## Still Having Issues?

### Collect Debug Information

1. **Screenshot the error message**
2. **Check console logs** (see Debug Mode above)
3. **Note when the error occurs**:
   - When starting a call?
   - When answering a call?
   - During the call?
4. **Device information**:
   - Device model
   - OS version
   - App version
5. **Network information**:
   - WiFi or cellular?
   - Speed test results

### Report the Issue

Create an issue with:
- Error message/screenshot
- Console logs
- Steps to reproduce
- Device information
- When it started happening

---

## Quick Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| Failed to start call | Check permissions in Settings |
| No audio | Unmute microphone during call |
| No video | Enable camera during call |
| Choppy call | Switch to WiFi, close other apps |
| No notifications | Check notification permissions |
| Black screen | Grant camera permission, restart app |
| App crashes | Clear cache, restart device |
| WebView not loading (Android) | Update System WebView and Chrome |

---

## Prevention Tips

### For Best Call Quality:
1. ✅ **Use WiFi** whenever possible
2. ✅ **Close background apps** before calls
3. ✅ **Keep app updated** to latest version
4. ✅ **Grant all permissions** when prompted
5. ✅ **Maintain good internet speed** (1.5+ Mbps)
6. ✅ **Keep device charged** (calls use battery)
7. ✅ **Stay near WiFi router** during calls

### For Reliable Notifications:
1. ✅ **Keep app running** in background
2. ✅ **Disable battery optimization** for the app
3. ✅ **Enable all notification types**
4. ✅ **Keep device online**

---

## Understanding Call Quality Indicators

During calls, you'll see a quality indicator:

- 🟢 **GOOD**: Everything working well
- 🟡 **FAIR**: Minor issues, call may be choppy
- 🔴 **POOR**: Serious issues, consider switching networks

If quality is poor:
1. Move closer to WiFi router
2. Close other apps
3. Switch from cellular to WiFi
4. Turn off video (use audio only)

---

## Technical Details

### Permissions Required

**Android manifest permissions:**
- `CAMERA` - For video calls
- `RECORD_AUDIO` - For audio in calls
- `MODIFY_AUDIO_SETTINGS` - For audio routing
- `INTERNET` - For call connectivity

**iOS Info.plist permissions:**
- `NSCameraUsageDescription` - For video calls
- `NSMicrophoneUsageDescription` - For audio calls

### Network Requirements

**Minimum:**
- 50 Kbps for audio only
- 500 Kbps for video (SD quality)

**Recommended:**
- 1.5 Mbps for video (HD quality)
- Low latency (<150ms)

### Supported Platforms

- ✅ Android 7.0+ (API level 24+)
- ✅ iOS 13.0+
- ⚠️ Android 6.0 (limited support)
- ❌ iOS 12 and below (not supported)

---

**Need more help?** Check the [Advanced Calling Features documentation](ADVANCED_CALLING_FEATURES.md) for detailed technical information.
