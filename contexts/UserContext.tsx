import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UserData {
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImageUri?: string;
}

interface UserContextType {
  userData: UserData | null;
  setUserData: (data: UserData) => Promise<void>;
  updateUserData: (updates: Partial<UserData>) => Promise<void>;
  clearUserData: () => Promise<void>;
  loadUserData: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_DATA_KEY = '@ophelia_user_data';

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userData, setUserDataState] = useState<UserData | null>(null);

  const loadUserData = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(USER_DATA_KEY);
      if (stored) {
        setUserDataState(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const setUserData = async (data: UserData) => {
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(data));
      setUserDataState(data);
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  };

  const updateUserData = async (updates: Partial<UserData>) => {
    try {
      const currentData = userData || {
        fullName: '',
        email: '',
        phoneNumber: '',
      };
      const updatedData = { ...currentData, ...updates };
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedData));
      setUserDataState(updatedData);
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };

  const clearUserData = async () => {
    try {
      await AsyncStorage.removeItem(USER_DATA_KEY);
      setUserDataState(null);
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        userData,
        setUserData,
        updateUserData,
        clearUserData,
        loadUserData,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

