/**
 * Whereby Embedded Configuration
 *
 * Whereby provides video calling that works in WebView (Expo Go compatible!)
 *
 * FREE TIER: 2000 participant minutes/month
 * Get your account at: https://whereby.com/org/signup
 *
 * How it works:
 * 1. We create room URLs using your subdomain
 * 2. Users join by loading the URL in WebView
 * 3. Whereby handles all WebRTC internally
 *
 * For production, get API key from: https://whereby.com/information/embedded/
 */

const WherebyConfig = {
  // Your Whereby subdomain (e.g., 'mycompany' -> mycompany.whereby.com)
  // For testing, you can use 'whereby.com/roomname' format without subdomain
  subdomain: '', // Leave empty for free rooms, or set your subdomain

  // API key (optional - needed for creating rooms via API)
  apiKey: '',

  // Room configuration
  roomConfig: {
    background: 'off', // Hide Whereby branding
    minimal: true, // Minimal UI
    embed: true, // Embedded mode
    precallReview: false, // Skip pre-call setup screen
    skipMediaPermissionPrompt: false, // Ask for permissions
  },
};

/**
 * Generate Whereby room URL
 * @param {string} roomName - Unique room identifier (use callId)
 * @param {object} options - Additional options
 * @returns {string} - Whereby room URL
 */
export const generateRoomUrl = (roomName, options = {}) => {
  const config = { ...WherebyConfig.roomConfig, ...options };

  // If no subdomain, use public whereby.com rooms
  const baseUrl = WherebyConfig.subdomain
    ? `https://${WherebyConfig.subdomain}.whereby.com/${roomName}`
    : `https://whereby.com/${roomName}`;

  // Add query parameters
  const params = new URLSearchParams();
  Object.entries(config).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, value.toString());
    }
  });

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Create room with display name
 * @param {string} roomName - Room identifier
 * @param {string} displayName - User's display name
 * @param {boolean} isVideoCall - true for video, false for audio only
 * @returns {string} - Full room URL with parameters
 */
export const createRoomUrl = (roomName, displayName = 'Guest', isVideoCall = true) => {
  return generateRoomUrl(roomName, {
    displayName,
    audio: true,
    video: isVideoCall,
    background: 'off',
    minimal: 'true',
    embed: '',
    precallReview: 'false',
  });
};

export default WherebyConfig;
