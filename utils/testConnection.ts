/**
 * Backend Connection Test Utility
 */

import { API_BASE_URL } from '../config/api';

export const testBackendConnection = async (): Promise<{
  success: boolean;
  message: string;
  url: string;
}> => {
  try {
    console.log('Testing connection to:', API_BASE_URL);
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: `Backend is running! Status: ${data.status || 'OK'}`,
        url: API_BASE_URL,
      };
    } else {
      return {
        success: false,
        message: `Backend responded with status: ${response.status}`,
        url: API_BASE_URL,
      };
    }
  } catch (error: any) {
    console.error('Connection test failed:', error);
    
    if (error.message.includes('Network request failed')) {
      return {
        success: false,
        message: 'Cannot connect to backend. Please check:\n1. Backend server is running\n2. IP address is correct\n3. Port 8000 is accessible',
        url: API_BASE_URL,
      };
    }
    
    return {
      success: false,
      message: `Connection error: ${error.message}`,
      url: API_BASE_URL,
    };
  }
};

export const getNetworkInfo = () => {
  return {
    currentURL: API_BASE_URL,
    platform: require('react-native').Platform.OS,
    isDevice: require('expo-constants').default.isDevice,
  };
};