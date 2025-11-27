import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Animated,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SplashScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // Reset animation values
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.5);
    rotateAnim.setValue(0);

    // Start animations immediately when component mounts
    // Use parallel for simultaneous fade, scale, and rotate
    Animated.parallel([
      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      // Scale animation with spring effect
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      // Rotation animation
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate based on auth status after animation completes (2.5 seconds)
    const timer = setTimeout(async () => {
      if (!loading) {
        const TERMS_KEY = '@ophelia_terms_accepted';
        const MODEL_KEY = '@ophelia_selected_model';

        if (!isAuthenticated) {
          router.replace('/language');
        } else {
          const acceptedTerms = await AsyncStorage.getItem(TERMS_KEY);
          const selectedModel = await AsyncStorage.getItem(MODEL_KEY);

          if (!acceptedTerms) {
            router.replace('/privacy_terms');
          } else if (!selectedModel) {
            router.replace('/ai_model');
          } else {
            router.replace('/chat');
          }
        }
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
      // Clean up animations
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
      rotateAnim.stopAnimation();
    };
  }, [fadeAnim, scaleAnim, rotateAnim, isAuthenticated, loading]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('@/assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.content}>
          {/* Animated Logo */}
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { rotate: rotate }
                ]
              }
            ]}
          >
            <Image 
              source={require('@/assets/images/ophelia logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* Brand Name */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.brandName}>OPHELIA</Text>
            <Text style={styles.versionText}>V 6.0</Text>
          </Animated.View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  brandName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
  },
  versionText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
});
