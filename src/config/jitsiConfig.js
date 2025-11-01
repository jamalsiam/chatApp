/**
 * Jitsi Meet Configuration
 *
 * Jitsi Meet provides FREE video calling that works in WebView (Expo Go compatible!)
 *
 * 100% FREE: Unlimited calls, unlimited minutes, no account needed!
 * Public server: https://meet.jit.si
 *
 * How it works:
 * 1. We create room URLs using callId as room name
 * 2. Users join by loading the URL in WebView
 * 3. Jitsi handles all WebRTC internally
 * 4. Completely free, open source, no limits!
 */

const JitsiConfig = {
  // Jitsi Meet server URL (free public server)
  serverUrl: 'https://meet.jit.si',

  // Room configuration
  defaultConfig: {
    // Disable pre-join page (join immediately)
    prejoinPageEnabled: false,

    // Start with audio/video based on call type
    startWithAudioMuted: false,
    startWithVideoMuted: false,

    // UI customization
    disableInviteFunctions: true, // Hide invite button
    enableWelcomePage: false, // Skip welcome page

    // Quality settings
    resolution: 720, // 720p video quality
    constraints: {
      video: {
        height: { ideal: 720, max: 720, min: 360 }
      }
    },
  },
};

/**
 * Generate Jitsi Meet room URL for direct call entry
 * @param {string} roomName - Unique room identifier (use callId)
 * @param {string} displayName - User's display name
 * @param {boolean} isVideoCall - true for video, false for audio only
 * @returns {string} - Jitsi Meet room URL
 */
export const createJitsiUrl = (roomName, displayName = 'Guest', isVideoCall = true) => {
  // Clean room name (remove special characters)
  const cleanRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '');

  // Base URL
  const baseUrl = `${JitsiConfig.serverUrl}/${cleanRoomName}`;

  // Configuration parameters for direct entry
  const configParams = [
    // User info
    `userInfo.displayName=${encodeURIComponent(displayName)}`,

    // CRITICAL: Skip pre-join page - join directly!
    'config.prejoinPageEnabled=false',

    // Auto-start settings
    'config.startWithAudioMuted=false',
    `config.startWithVideoMuted=${!isVideoCall}`,

    // UI customization - cleaner interface
    'config.disableInviteFunctions=true',
    'config.enableWelcomePage=false',
    'config.hideConferenceSubject=true',
    'config.hideConferenceTimer=false',

    // Toolbar - show essential buttons only
    'config.toolbarButtons=["microphone","camera","hangup","chat","tileview"]',

    // Mobile optimizations
    'config.disableDeepLinking=true',
    'config.enableClosePage=true', // Enable close page event

    // Interface options
    'interfaceConfig.SHOW_JITSI_WATERMARK=false',
    'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
    'interfaceConfig.MOBILE_APP_PROMO=false',
    'interfaceConfig.SHOW_CHROME_EXTENSION_BANNER=false',
  ];

  // Join config params with &
  const configString = configParams.join('&');

  // Return URL with hash fragment
  return `${baseUrl}#${configString}`;
};

/**
 * Get simple Jitsi URL (without config)
 * @param {string} roomName - Room identifier
 * @returns {string} - Simple Jitsi room URL
 */
export const getSimpleJitsiUrl = (roomName) => {
  const cleanRoomName = roomName.replace(/[^a-zA-Z0-9-_]/g, '');
  return `${JitsiConfig.serverUrl}/${cleanRoomName}`;
};

export default JitsiConfig;
