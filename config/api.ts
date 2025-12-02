/**
 * API Configuration
 * Centralized configuration for backend API endpoints
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================
// IMPORTANT: For Physical Devices (Expo Go on iPhone/Android)
// ============================================
// If you're using Expo Go on a physical device, you MUST set your computer's local IP below.
// 
// To find your local IP address:
// - Mac: Run `ipconfig getifaddr en0` in terminal (or `ifconfig | grep "inet "`)
// - Windows: Run `ipconfig` in command prompt, look for "IPv4 Address"
// - Linux: Run `hostname -I` or `ip addr show`
// 
// Look for something like: 192.168.1.100 or 192.168.0.105
//
// Example: If your computer's IP is 192.168.1.100, change the line below to:
// const PHYSICAL_DEVICE_IP = '192.168.1.100';
// ============================================

// ⚠️ SET THIS TO YOUR COMPUTER'S LOCAL IP ADDRESS WHEN USING EXPO GO ON PHYSICAL DEVICE
// Leave as null for iOS Simulator or Android Emulator (they work with localhost/10.0.2.2)
// ⚠️ SET YOUR ACTUAL IP ADDRESS HERE
// To find your IP: Windows: ipconfig | Mac: ifconfig | Linux: hostname -I
const PHYSICAL_DEVICE_IP = '192.168.18.12'; // Your current IP - change if needed
 // 👈 Set to null to use localhost for testing

// Determine the correct base URL based on platform and environment
const getBaseURL = () => {
  // If physical device IP is set, always use it (for Expo Go on physical devices)
  if (PHYSICAL_DEVICE_IP) {
    return `http://${PHYSICAL_DEVICE_IP}:8000`;
  }

  // Check if running on physical device
  const isPhysicalDevice = Constants.isDevice && !Constants.isDeviceWeb;
  
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to access host machine's localhost
    return isPhysicalDevice 
      ? 'http://localhost:8000' // ⚠️ This won't work on physical device - set PHYSICAL_DEVICE_IP above!
      : 'http://10.0.2.2:8000';
  } else {
    // iOS simulator can use localhost
    return isPhysicalDevice
      ? 'http://localhost:8000' // ⚠️ This won't work on physical device - set PHYSICAL_DEVICE_IP above!
      : 'http://localhost:8000';
  }
};

// Backend base URL
export const API_BASE_URL = getBaseURL();

// WebSocket URL (converts http to ws)
export const WS_BASE_URL = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
export const WS_URL = `${WS_BASE_URL}/ws`;

// API endpoints - Matching backend API documentation
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    TOKEN: '/auth/token',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_OTP: '/auth/verify-otp',
    RESET_PASSWORD: '/auth/reset-password',
  },
  // Profile endpoints
  PROFILE: (userId: string) => `/user/profile/${userId}`,
  UPDATE_PROFILE: (userId: string) => `/user/profile/${userId}`,
  UPLOAD_PROFILE_PICTURE: (userId: string) => `/profile/${userId}/upload-pic`,
  // AI Chat endpoints
  CHAT: {
    CHATGPT: '/api/chatgpt/chat',
    GEMINI: '/api/gemini/chat',
    GROK: '/api/grok/chat',
    VOICE_CHAT: '/api/voice-chat',
    VOICE_TO_TEXT: '/api/voice-to-text',
  },
};

