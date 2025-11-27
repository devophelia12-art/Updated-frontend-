// _layout.tsx
import React, { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
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
      // Always show splash screen first
      setInitialScreen('splash');
    };

    determineScreen();
  }, []);

  // Show splash screen while loading or determining initial screen
  if (loading || initialScreen === null) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="splash">
          <Stack.Screen name="splash" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

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
        <Stack.Screen name="account_settings" options={{ headerShown: false }} />
        <Stack.Screen name="settings_ai_model" options={{ headerShown: false }} />
        <Stack.Screen name="settings_language" options={{ headerShown: false }} />
        <Stack.Screen name="voice_settings" options={{ headerShown: false }} />
        <Stack.Screen name="user_consent" options={{ headerShown: false }} />
        <Stack.Screen name="privacy_terms_view" options={{ headerShown: false }} />
        <Stack.Screen name="choose_plan" options={{ headerShown: false }} />
        <Stack.Screen name="payment" options={{ headerShown: false }} />
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

