// _layout.tsx
import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '../hooks/use-color-scheme';

// Contexts
import { LanguageProvider } from '../contexts/LanguageContext';
import { UserProvider } from '../contexts/UserContext';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { WebSocketProvider } from '../contexts/SocketContext';
import  {ChatProvider}  from '../contexts/ChatContext';

// AsyncStorage keys
const TERMS_KEY = '@ophelia_terms_accepted';
const MODEL_KEY = '@ophelia_selected_model';

// ------------------------------
// Navigation Component
// ------------------------------
function AppNavigation() {
  const { isAuthenticated, loading } = useAuth(); // ✅ useAuth inside AuthProvider
  const colorScheme = useColorScheme();
  const [initialScreen, setInitialScreen] = useState<string | null>(null);

  useEffect(() => {
    const determineScreen = async () => {
      if (!isAuthenticated) {
        setInitialScreen('language');
        return;
      }

      const acceptedTerms = await AsyncStorage.getItem(TERMS_KEY);
      const selectedModel = await AsyncStorage.getItem(MODEL_KEY);

      if (!acceptedTerms) {
        setInitialScreen('privacy_terms');
      } else if (!selectedModel) {
        setInitialScreen('ai_model');
      } else {
        setInitialScreen('chat');
      }
    };

    determineScreen();
  }, [isAuthenticated]);

  if (loading || initialScreen === null) return null; // optional: render a splash screen

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName={initialScreen}>
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="language" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="ai_model" options={{ headerShown: false }} />
        <Stack.Screen name="privacy_terms" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

// ------------------------------
// Root Layout
// ------------------------------
export default function RootLayout() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <WebSocketProvider>
          <ChatProvider>
            <UserProvider>
              <AppNavigation />
            </UserProvider>
          </ChatProvider>
        </WebSocketProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

