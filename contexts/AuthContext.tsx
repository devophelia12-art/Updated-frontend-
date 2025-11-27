import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {jwtDecode} from 'jwt-decode';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const TOKEN_KEY = '@ophelia_auth_token';

// =======================
// Types
// =======================
export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { email: string; password: string; full_name: string; confirm_password: string; }
export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profileImageUri?: string;
}
export interface UpdateProfileRequest { full_name?: string; email?: string; phone_number?: string; }
export interface ChatMessage { sender: string; text: string; }
export interface ChatResponse { message: string; response?: string; }

// =======================
// Auth API
// =======================
class AuthAPI {
  private userId: string | null = null;

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = await this.getToken();
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };
    
    try {
      console.log('Making request to:', url);
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try { 
          const data = await response.json(); 
          errorMessage = data.detail || data.message || errorMessage; 
        } catch {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      return response.json();
    } catch (error) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error('Network error - Check if backend is running and URL is correct:', url);
        throw new Error('Network request failed. Please check your connection and ensure the backend server is running.');
      }
      // Re-throw other errors
      throw error;
    }
  }

  async login(credentials: LoginRequest) {
    const res = await this.makeRequest(API_ENDPOINTS.AUTH.LOGIN, { method: 'POST', body: JSON.stringify(credentials) });
    if (!res.user) throw new Error('Login failed');
    this.userId = res.user.id; // save user ID for chat
    await this.setToken(res.access_token || res.token);
    return res;
  }

  async register(data: RegisterRequest) {
    return this.makeRequest(API_ENDPOINTS.AUTH.REGISTER, { method: 'POST', body: JSON.stringify(data) });
  }

  async forgotPassword(email: string) {
    return this.makeRequest(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { method: 'POST', body: JSON.stringify({ email }) });
  }

  async verifyOTP(email: string, otp: string) {
    return this.makeRequest(API_ENDPOINTS.AUTH.VERIFY_OTP, { method: 'POST', body: JSON.stringify({ email, otp }) });
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    return this.makeRequest(API_ENDPOINTS.AUTH.RESET_PASSWORD, { method: 'POST', body: JSON.stringify({ email, otp, new_password: newPassword }) });
  }

  async sendConsentConfirmation(email: string, consentType: string) {
    return this.makeRequest(API_ENDPOINTS.AUTH.SEND_CONSENT_CONFIRMATION, { 
      method: 'POST', 
      body: JSON.stringify({ email, consent_type: consentType }) 
    });
  }

  async logout() {
    this.userId = null;
    await this.removeToken();
  }

  async getProfile(userId: string): Promise<User> {
    const profile = await this.makeRequest(API_ENDPOINTS.PROFILE(userId));
    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phoneNumber: profile.phone_number,
      profileImageUri: profile.profile_pic_url,
    };
  }

  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<User> {
    const profile = await this.makeRequest(API_ENDPOINTS.UPDATE_PROFILE(userId), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return {
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      phoneNumber: profile.phone_number,
      profileImageUri: profile.profile_pic_url,
    };
  }

// =======================
// AI Chat Functions
// =======================
async chatGPT(message: string, language: string = 'en') {
  const body = { message, language };
  return this.makeRequest(API_ENDPOINTS.CHAT.CHATGPT, { method: 'POST', body: JSON.stringify(body) });
}

async gemini(message: string, language: string = 'en') {
  const body = { message, language };
  return this.makeRequest(API_ENDPOINTS.CHAT.GEMINI, { method: 'POST', body: JSON.stringify(body) });
}

async grok(message: string, language: string = 'en') {
  const body = { message, language };
  return this.makeRequest(API_ENDPOINTS.CHAT.GROK, { method: 'POST', body: JSON.stringify(body) });
}

// Helper method to detect audio format from URI
private getAudioFormat(uri: string): { type: string; name: string } {
  const uriLower = uri.toLowerCase();
  if (uriLower.includes('.m4a') || uriLower.includes('.mp4')) {
    return { type: 'audio/m4a', name: 'recording.m4a' };
  } else if (uriLower.includes('.mp3')) {
    return { type: 'audio/mp3', name: 'recording.mp3' };
  } else if (uriLower.includes('.webm')) {
    return { type: 'audio/webm', name: 'recording.webm' };
  } else if (uriLower.includes('.ogg')) {
    return { type: 'audio/ogg', name: 'recording.ogg' };
  } else if (uriLower.includes('.flac')) {
    return { type: 'audio/flac', name: 'recording.flac' };
  } else if (uriLower.includes('.wav')) {
    return { type: 'audio/wav', name: 'recording.wav' };
  }
  // Default to m4a for mobile recordings (iOS/Android typically use M4A)
  return { type: 'audio/m4a', name: 'recording.m4a' };
}

async voiceChat(audioUri: string, voicePreference: string = 'male', language: string = 'en', conversationHistory?: string, retries: number = 2) {
  const audioFormat = this.getAudioFormat(audioUri);
  console.log('Detected audio format:', audioFormat, 'from URI:', audioUri);

  const formData = new FormData();
  formData.append('audio_file', {
    uri: audioUri,
    type: audioFormat.type,
    name: audioFormat.name,
  } as any);
  formData.append('voice', voicePreference);
  formData.append('language', language);
  if (conversationHistory) {
    formData.append('conversation_history', conversationHistory);
  }
  
  const url = `${API_BASE_URL}${API_ENDPOINTS.CHAT.VOICE_CHAT}`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retrying voice chat request (attempt ${attempt + 1}/${retries + 1})`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
      
      console.log('Making voice chat request to:', url, 'with voice:', voicePreference, 'language:', language);
      const token = await this.getToken();
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout (longer for voice chat)
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          headers: {
            // Don't set Content-Type - let fetch set it automatically with boundary
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const data = await response.json();
            errorMessage = data.detail || data.message || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        return response.json();
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // If aborted due to timeout
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout. The audio processing is taking too long. Please try again.');
        }
        throw fetchError;
      }
    } catch (error: any) {
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        console.error(`Network error (attempt ${attempt + 1}/${retries + 1}):`, error.message);
        if (attempt < retries) {
          continue; // Retry
        }
        throw new Error('Network request failed. Please check your connection and ensure the backend server is running.');
      }
      
      // If it's the last attempt or not a network error, throw
      if (attempt >= retries || !error.message.includes('Network request failed')) {
        console.error('Voice chat error:', error);
        throw error;
      }
    }
  }
  
  throw new Error('Failed to process voice chat after retries');
}

async voiceToText(audioUri: string, retries: number = 2): Promise<string> {
  const audioFormat = this.getAudioFormat(audioUri);
  console.log('Detected audio format:', audioFormat, 'from URI:', audioUri);

  // Ensure the URI is properly formatted for React Native
  // React Native FormData requires file:// prefix for local files
  let fileUri = audioUri;
  if (!fileUri.startsWith('file://') && !fileUri.startsWith('http://') && !fileUri.startsWith('https://')) {
    fileUri = `file://${fileUri}`;
  }
  console.log('Formatted file URI:', fileUri);

  const formData = new FormData();
  formData.append('audio_file', {
    uri: fileUri,
    type: audioFormat.type,
    name: audioFormat.name,
  } as any);
  
  const url = `${API_BASE_URL}${API_ENDPOINTS.CHAT.VOICE_TO_TEXT}`;
  console.log('Voice-to-text URL:', url);
  console.log('Audio format:', audioFormat);
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`Retrying voice-to-text request (attempt ${attempt + 1}/${retries + 1})`);
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
      
      console.log('Making voice-to-text request to:', url);
      const token = await this.getToken();
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35 second timeout (increased)
      
      try {
        // Check if backend is reachable first
        try {
          const healthCheck = await fetch(`${API_BASE_URL}/`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000), // 5 second timeout for health check
          });
          console.log('Backend health check:', healthCheck.status);
        } catch (healthError) {
          console.warn('Backend health check failed:', healthError);
          // Continue anyway, might be a CORS issue
        }

        const response = await fetch(url, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
          headers: {
            // Don't set Content-Type - let fetch set it automatically with boundary
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          try {
            const data = await response.json();
            errorMessage = data.detail || data.message || errorMessage;
          } catch {
            const text = await response.text();
            errorMessage = text || response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Voice-to-text response:', data);
        return data.text || ''; // Return the transcribed text
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        // If aborted due to timeout
        if (fetchError.name === 'AbortError' || fetchError.message?.includes('timeout')) {
          if (attempt < retries) {
            console.log('Request timeout, will retry...');
            continue;
          }
          throw new Error('Request timeout. The audio file may be too large or the server is busy. Please try again.');
        }
        
        // Check for network errors
        if (fetchError instanceof TypeError || 
            fetchError.message?.includes('Network request failed') ||
            fetchError.message?.includes('Failed to fetch') ||
            fetchError.message?.includes('network')) {
          console.error(`Network error (attempt ${attempt + 1}/${retries + 1}):`, fetchError.message);
          if (attempt < retries) {
            continue; // Retry
          }
          throw new Error('Network request failed. Please check:\n1. Backend server is running\n2. Your device is connected to the same network\n3. IP address is correct (192.168.1.28:8000)');
        }
        
        throw fetchError;
      }
    } catch (error: any) {
      // Handle network errors
      if (error instanceof TypeError && 
          (error.message.includes('Network request failed') || 
           error.message.includes('Failed to fetch'))) {
        console.error(`Network error (attempt ${attempt + 1}/${retries + 1}):`, error.message);
        if (attempt < retries) {
          continue; // Retry
        }
        throw new Error('Network request failed. Please check your connection and ensure the backend server is running at http://192.168.1.28:8000');
      }
      
      // If it's the last attempt or not a network error, throw
      if (attempt >= retries) {
        console.error('Voice-to-text error after all retries:', error);
        throw error;
      }
      
      // If it's a non-network error, throw immediately
      if (!error.message?.includes('Network request failed') && 
          !error.message?.includes('Failed to fetch')) {
        console.error('Voice-to-text error (non-network):', error);
        throw error;
      }
    }
  }
  
  throw new Error('Failed to transcribe audio after retries');
}

async uploadProfilePicture(userId: string, file: { uri: string; name: string; type: string }) {
  const formData = new FormData();

  formData.append('file', {  // <-- must match FastAPI
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any);

  const url = `${API_BASE_URL}/profile/${userId}/upload-pic`;

  const token = await this.getToken();

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let fetch set it automatically with boundary
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      phoneNumber: data.phone_number,
      profileImageUri: data.profile_pic_url,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}



  async setToken(token: string) { await AsyncStorage.setItem(TOKEN_KEY, token); }
  async getToken(): Promise<string | null> { return AsyncStorage.getItem(TOKEN_KEY); }
  async removeToken() { await AsyncStorage.removeItem(TOKEN_KEY); }
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token && token.trim() !== '';
  }
}

const authAPI = new AuthAPI();

// =======================
// Auth Context
// =======================
interface AuthState { isAuthenticated: boolean; user: User | null; loading: boolean; }
interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: UpdateProfileRequest) => Promise<any>;
  uploadProfilePicture: (file: { uri: string; name: string; type: string }) => Promise<User>; // userId is taken from state.user.id
  forgotPassword: (email: string) => Promise<any>;
  verifyOTP: (email: string, otp: string) => Promise<any>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<any>;
  sendConsentConfirmation: (email: string, consentType: string) => Promise<any>;
  chatGPT: (message: string, language?: string) => Promise<ChatResponse>;
  gemini: (message: string, language?: string) => Promise<ChatResponse>;
  grok: (message: string, language?: string) => Promise<ChatResponse>;
  voiceChat: (audioUri: string, voicePreference?: string, language?: string) => Promise<any>;
  voiceToText: (audioUri: string) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<AuthState>({ isAuthenticated: false, user: null, loading: true });


  useEffect(() => { checkAuthStatus(); }, []);

  const checkAuthStatus = async () => {
    try {
      const auth = await authAPI.isAuthenticated();
      if (!auth) return setState(prev => ({ ...prev, loading: false }));
      const token = await authAPI.getToken();
      if (!token) return setState(prev => ({ ...prev, loading: false }));
      const payload: any = jwtDecode(token);
      const profile = await authAPI.getProfile(payload.sub);
      setState({ isAuthenticated: true, user: profile, loading: false });
    } catch { setState(prev => ({ ...prev, loading: false })); }
  };

  const refreshProfile = async () => {
    if (!state.user) return;
    const updated = await authAPI.getProfile(state.user.id);
    setState(prev => ({ ...prev, user: updated }));
  };

  const login = async (email: string, password: string) => {
    const res = await authAPI.login({ email, password });
    const user: User = { id: res.user.id, fullName: res.user.full_name, email: res.user.email, phoneNumber: res.user.phone_number, profileImageUri: res.user.profile_pic_url };
    setState({ isAuthenticated: true, user, loading: false });
  };

  const register = async (email: string, password: string, fullName: string, confirmPassword: string) => {
    await authAPI.register({ email, password, full_name: fullName, confirm_password: confirmPassword });
    await login(email, password);
  };

  const logout = async () => {
    await authAPI.logout();
    // Clear all user-related data from AsyncStorage
    await AsyncStorage.multiRemove([
      TOKEN_KEY, 
      '@ophelia_chat_history',
      '@ophelia_user_data',
      '@ophelia_terms_accepted',
      '@ophelia_selected_model',
      '@ophelia_consent_checkbox_state',
      'selectedVoice',
      '@ophelia_selected_model'
    ]);
    setState({ isAuthenticated: false, user: null, loading: false });
  };

  const updateProfile = async (data: UpdateProfileRequest) => {
    if (!state.user) throw new Error('No user logged in');
    const updated = await authAPI.updateProfile(state.user.id, data);
    setState(prev => ({ ...prev, user: updated }));
    return updated;
  };

const uploadProfilePicture = async (file: { uri: string; name: string; type: string }) => {
  if (!state.user) throw new Error("No user logged in");

  const fileUri = file.uri.startsWith('file://') ? file.uri : `file://${file.uri}`;
  const formData = new FormData();
  formData.append('file', { uri: fileUri, name: file.name, type: file.type } as any);

  const url = `${API_BASE_URL}/user/profile/${state.user.id}/upload-pic`;
  const token = await authAPI.getToken();

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type - let fetch set it automatically with boundary
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) throw new Error('Upload failed');

    const data = await response.json();

    // Backend returns flat object with profile_pic_url, not nested in user
    const profilePicUrl = data.profile_pic_url || data.url;
    if (!profilePicUrl) {
      throw new Error('Upload succeeded but no profile picture URL returned');
    }

    // Add timestamp to force reload
    const uploadedUrl = `${profilePicUrl}?t=${Date.now()}`;

    setState(prev => ({
      ...prev,
      user: { ...prev.user!, profileImageUri: uploadedUrl },
    }));

    return { ...state.user!, profileImageUri: uploadedUrl };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error('Upload failed. Check network and backend server.');
  }
};






  // =======================
  // AI Chat Functions
  // =======================
  const chatGPT = async (message: string, language?: string) => {
    if (!state.user) throw new Error('User not logged in');
    const res = await authAPI.chatGPT(message, language);
    return { message, response: res.response };
  };
  
  const gemini = async (message: string, language?: string) => {
    if (!state.user) throw new Error('User not logged in');
    const res = await authAPI.gemini(message, language);
    return { message, response: res.response };
  };
  
  const grok = async (message: string, language?: string) => {
    if (!state.user) throw new Error('User not logged in');
    const res = await authAPI.grok(message, language);
    return { message, response: res.response };
  };
  
  const voiceChat = async (audioUri: string, voicePreference?: string, language?: string) => {
    if (!state.user) throw new Error('User not logged in');
    return await authAPI.voiceChat(audioUri, voicePreference, language);
  };

  const voiceToText = async (audioUri: string) => {
    if (!state.user) throw new Error('User not logged in');
    return await authAPI.voiceToText(audioUri);
  };

  const forgotPassword = async (email: string) => {
    return await authAPI.forgotPassword(email);
  };

  const verifyOTP = async (email: string, otp: string) => {
    return await authAPI.verifyOTP(email, otp);
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    return await authAPI.resetPassword(email, otp, newPassword);
  };

  const sendConsentConfirmation = async (email: string, consentType: string) => {
    return await authAPI.sendConsentConfirmation(email, consentType);
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
        uploadProfilePicture,
        forgotPassword,
        verifyOTP,
        resetPassword,
        sendConsentConfirmation,
        chatGPT,
        gemini,
        grok,
        voiceChat,
        voiceToText,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
