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

  // Base URL with displayName as URL parameter (this sets the name automatically)
  const baseUrl = `${JitsiConfig.serverUrl}/${cleanRoomName}`;

  // Build config object - using proper configOverwrite format
  const config = {
    // CRITICAL: Skip pre-join page completely
    prejoinConfig: {
      enabled: false, // Disable pre-join screen
    },

    // Start settings
    startWithAudioMuted: false,
    startWithVideoMuted: !isVideoCall,

    // UI customization
    disableInviteFunctions: true,
    enableWelcomePage: false,
    hideConferenceSubject: true,

    // Mobile optimizations
    disableDeepLinking: true,
    enableClosePage: true,

    // Auto-join settings
    autoKnockLobby: false,
    enableLobbyChat: false,
  };

  const interfaceConfig = {
    SHOW_JITSI_WATERMARK: false,
    SHOW_WATERMARK_FOR_GUESTS: false,
    MOBILE_APP_PROMO: false,
    SHOW_CHROME_EXTENSION_BANNER: false,
    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
  };

  // Build URL with config using proper Jitsi format
  const configParams = [
    // User info - this sets display name
    `userInfo.displayName=${encodeURIComponent(displayName)}`,

    // Config overwrite - the key to skipping pre-join!
    `config.prejoinConfig.enabled=false`,
    `config.startWithAudioMuted=false`,
    `config.startWithVideoMuted=${!isVideoCall}`,
    `config.disableInviteFunctions=true`,
    `config.enableWelcomePage=false`,
    `config.disableDeepLinking=true`,

    // Interface config
    `interfaceConfig.SHOW_JITSI_WATERMARK=false`,
    `interfaceConfig.MOBILE_APP_PROMO=false`,
    `interfaceConfig.SHOW_CHROME_EXTENSION_BANNER=false`,
  ];

  const configString = configParams.join('&');

  // Return URL with hash config
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
