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
 * Generate Jitsi Meet room URL
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

  // Configuration as URL hash
  const config = {
    ...JitsiConfig.defaultConfig,
    // Start with video muted if audio-only call
    startWithVideoMuted: !isVideoCall,
  };

  // Build URL with config
  // Format: https://meet.jit.si/RoomName#config.prejoinPageEnabled=false&userInfo.displayName=John
  const params = new URLSearchParams();

  // Add display name
  params.append('userInfo.displayName', displayName);

  // Add config parameters
  params.append('config.prejoinPageEnabled', 'false');
  params.append('config.startWithAudioMuted', 'false');
  params.append('config.startWithVideoMuted', (!isVideoCall).toString());
  params.append('config.disableInviteFunctions', 'true');

  // Return full URL
  return `${baseUrl}#${params.toString()}`;
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
