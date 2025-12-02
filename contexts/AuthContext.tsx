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

  async logout() {
    this.userId = null;
    await this.removeToken();
  }

  async getProfile(userId: string): Promise<User> {
    try {
      const profile = await this.makeRequest(API_ENDPOINTS.PROFILE(userId));
      return {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        phoneNumber: profile.phone_number,
        profileImageUri: profile.profile_pic_url,
      };
    } catch (error) {
      console.error('Profile fetch error:', error);
      // Return default user data if profile fetch fails
      return {
        id: userId,
        fullName: 'User',
        email: '',
        phoneNumber: '',
        profileImageUri: '',
      };
    }
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

  async uploadProfilePicture(userId: string, imageUri: string): Promise<User> {
    console.log('Uploading image:', imageUri, 'for user:', userId);
    
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as any);
    
    const url = `${API_BASE_URL}/user/profile/${userId}/upload-pic`;
    console.log('Upload URL:', url);
    
    try {
      const token = await this.getToken();
      console.log('Making upload request...');
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      
      console.log('Upload response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const data = await response.json();
          console.log('Upload error response:', data);
          errorMessage = data.detail || data.message || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const profile = await response.json();
      console.log('Upload success, profile:', profile);
      
      const updatedUser = {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        phoneNumber: profile.phone_number,
        profileImageUri: profile.profile_pic_url,
      };
      
      console.log('Returning updated user:', updatedUser);
      return updatedUser;
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Network request failed. Please check your connection and ensure the backend server is running.');
      }
      throw error;
    }
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

async voiceChat(audioUri: string, voicePreference: string = 'male', language: string = 'en') {
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
  
  const url = `${API_BASE_URL}${API_ENDPOINTS.CHAT.VOICE_CHAT}`;
  
  try {
    console.log('Making voice chat request to:', url, 'with voice:', voicePreference, 'language:', language);
    const token = await this.getToken();
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    
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
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      console.error('Network error - Check if backend is running and URL is correct:', url);
      throw new Error('Network request failed. Please check your connection and ensure the backend server is running.');
    }
    throw error;
  }
}

async voiceToText(audioUri: string) {
  const audioFormat = this.getAudioFormat(audioUri);
  console.log('Detected audio format:', audioFormat, 'from URI:', audioUri);

  const formData = new FormData();
  formData.append('audio_file', {
    uri: audioUri,
    type: audioFormat.type,
    name: audioFormat.name,
  } as any);
  
  const url = `${API_BASE_URL}${API_ENDPOINTS.CHAT.VOICE_TO_TEXT}`;
  
  try {
    console.log('Making voice-to-text request to:', url);
    const token = await this.getToken();
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    
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
    
    const data = await response.json();
    return data.text || ''; // Return the transcribed text
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      console.error('Network error - Check if backend is running and URL is correct:', url);
      throw new Error('Network request failed. Please check your connection and ensure the backend server is running.');
    }
    throw error;
  }
}

async uploadProfilePicture(userId: string, imageUri: string) {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'profile.jpg',
  } as any);
  
  const url = `${API_BASE_URL}${API_ENDPOINTS.UPLOAD_PROFILE_PICTURE(userId)}`;
  
  try {
    console.log('Uploading profile picture to:', url);
    const token = await this.getToken();
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });
    
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
    
    const data = await response.json();
    return {
      id: data.id,
      fullName: data.full_name,
      email: data.email,
      phoneNumber: data.phone_number,
      profileImageUri: data.profile_pic_url,
    } as User;
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Network request failed')) {
      console.error('Network error - Check if backend is running and URL is correct:', url);
      throw new Error('Network request failed. Please check your connection and ensure the backend server is running.');
    }
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
  uploadProfilePicture: (imageUri: string) => Promise<User>; // userId is taken from state.user.id
  forgotPassword: (email: string) => Promise<any>;
  verifyOTP: (email: string, otp: string) => Promise<any>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<any>;
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
    // Clear app-related storage but keep onboarding data
    await AsyncStorage.multiRemove([
      TOKEN_KEY, 
      '@ophelia_chat_history',
      '@ophelia_checkbox_state',
      'selectedVoice'
    ]);
    setState({ isAuthenticated: false, user: null, loading: false });
  };

  const updateProfile = async (data: UpdateProfileRequest) => {
    if (!state.user) throw new Error('No user logged in');
    const updated = await authAPI.updateProfile(state.user.id, data);
    setState(prev => ({ ...prev, user: updated }));
    return updated;
  };

  const uploadProfilePicture = async (imageUri: string) => {
    if (!state.user) throw new Error('No user logged in');
    const updated = await authAPI.uploadProfilePicture(state.user.id, imageUri);
    const updatedUser = {
      id: updated.id,
      fullName: updated.full_name || updated.fullName,
      email: updated.email,
      phoneNumber: updated.phone_number || updated.phoneNumber,
      profileImageUri: updated.profile_pic_url || updated.profileImageUri,
    };
    setState(prev => ({ ...prev, user: updatedUser }));
    return updatedUser;
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
