/**
 * API Configuration
 * Centralized configuration for backend API endpoints
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ===============================
// PRODUCTION URL (LIVE SERVER)
// ===============================
const PRODUCTION_URL = "https://api.opheliaomni.ai";


// ===============================
// DEVELOPMENT (LOCAL DEVICE)
// ===============================
// ⚠️ Your computer's local IP for Expo Go on real device
const PHYSICAL_DEVICE_IP: string | null = "192.168.18.12";


// Base URL selector
const getBaseURL = () => {
  // 👉 If app is running in PRODUCTION (APK / IPA / EAS Build)
  if (!__DEV__) {
    return PRODUCTION_URL;
  }

  // 👉 DEVELOPMENT mode below ↓↓↓↓↓↓↓↓↓↓

  // Use local IP when testing on phone via Expo Go
  if (PHYSICAL_DEVICE_IP) {
    return `http://${PHYSICAL_DEVICE_IP}:8000`;
  }

  const isPhysicalDevice = Constants.isDevice && !Constants.isDeviceWeb;

  if (Platform.OS === "android") {
    return isPhysicalDevice
      ? "http://localhost:8000"
      : "http://10.0.2.2:8000";
  } else {
    return isPhysicalDevice
      ? "http://localhost:8000"
      : "http://localhost:8000";
  }
};

// Final BASE URL
export const API_BASE_URL = getBaseURL();

// WebSocket URLs
export const WS_BASE_URL = API_BASE_URL
  .replace("http://", "ws://")
  .replace("https://", "wss://");

export const WS_URL = `${WS_BASE_URL}/ws`;


// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    TOKEN: "/auth/token",
    ME: "/auth/me",
    FORGOT_PASSWORD: "/auth/forgot-password",
    VERIFY_OTP: "/auth/verify-otp",
    RESET_PASSWORD: "/auth/reset-password",
  },

  PROFILE: (userId: string) => `/user/profile/${userId}`,
  UPDATE_PROFILE: (userId: string) => `/user/profile/${userId}`,
  UPLOAD_PROFILE_PICTURE: (userId: string) =>
    `/profile/${userId}/upload-pic`,

  CHAT: {
    CHATGPT: "/api/chatgpt/chat",
    GEMINI: "/api/gemini/chat",
    GROK: "/api/grok/chat",
    VOICE_CHAT: "/api/voice-chat",
    VOICE_TO_TEXT: "/api/voice-to-text",
  },
};
