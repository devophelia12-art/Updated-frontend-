import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;
const isSmallScreen = width < 375;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getText } = useLanguage();
  const { login } = useAuth();

  // Check if user already completed onboarding
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Check if there's a stored email from previous session
      const storedEmail = await AsyncStorage.getItem('@ophelia_user_email');
      if (storedEmail) {
        setEmail(storedEmail);
        
        // Check onboarding for this email
        const userKey = `@ophelia_onboarding_complete_${storedEmail.toLowerCase()}`;
        const onboardingComplete = await AsyncStorage.getItem(userKey);
        console.log('Found stored email:', storedEmail, 'Onboarding complete:', onboardingComplete);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Login and get user info
      const userData = await login(email.trim(), password);
      
      // Store user email for future reference (simplified approach)
      const userEmail = email.trim().toLowerCase();
      await AsyncStorage.setItem('@ophelia_user_email', userEmail);
      
      // Check if this user has completed onboarding
      const userKey = `@ophelia_onboarding_complete_${userEmail}`;
      const onboardingComplete = await AsyncStorage.getItem(userKey);
      
      console.log('Login successful. Onboarding complete?', onboardingComplete);

      if (onboardingComplete === 'true') {
        // User has completed onboarding before - go directly to chat
        console.log('Skipping onboarding, going directly to chat');
        router.replace('/chat');
      } else {
        // First time user - show terms
        console.log('First time user, showing terms');
        router.replace('/privacy_terms');
      }
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = () => router.push('./register');
  const handleForgotPassword = () => router.push('./forgot-password');

  // Get responsive styles
  const getContainerStyle = () => ({
    flexGrow: 1,
    paddingHorizontal: isTablet ? 40 : isSmallScreen ? 16 : 20,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  });

  const getBrandingSectionStyle = () => ({
    alignItems: 'center',
    marginBottom: isTablet ? 50 : 40,
  });

  const getLogoStyle = () => ({
    width: isTablet ? 100 : isSmallScreen ? 60 : 80,
    height: isTablet ? 100 : isSmallScreen ? 60 : 80,
  });

  const getAppNameStyle = () => ({
    fontSize: isTablet ? 28 : isSmallScreen ? 20 : 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 1,
  });

  const getWelcomeTextStyle = () => ({
    fontSize: isTablet ? 18 : isSmallScreen ? 14 : 16,
    color: '#FFFFFF',
    opacity: 0.8,
  });

  const getInputSectionStyle = () => ({
    width: '100%',
    maxWidth: isTablet ? 500 : 400,
  });

  const getInputContainerStyle = () => ({
    marginBottom: isTablet ? 24 : 20,
  });

  const getInputLabelStyle = () => ({
    fontSize: isTablet ? 18 : isSmallScreen ? 14 : 16,
    color: '#FFFFFF',
    marginBottom: 8,
    fontWeight: '500',
  });

  const getInputWrapperStyle = () => ({
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: isTablet ? 16 : 12,
    paddingHorizontal: isTablet ? 20 : 16,
    paddingVertical: isTablet ? 18 : 16,
    borderWidth: 1,
    borderColor: '#374151',
  });

  const getTextInputStyle = () => ({
    flex: 1,
    fontSize: isTablet ? 18 : isSmallScreen ? 14 : 16,
    color: '#FFFFFF',
  });

  return (
    <ImageBackground 
      source={require('@/assets/images/background.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={getContainerStyle()}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => router.back()} 
              style={styles.backButton}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="white" />
              <Text style={[styles.backButtonText, { fontSize: isTablet ? 18 : 16 }]}>
                {getText('back')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Branding & Inputs */}
          <View style={styles.content}>
            {/* Logo and Branding */}
            <View style={getBrandingSectionStyle()}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/ophelia logo.png')}
                  style={getLogoStyle()}
                  resizeMode="contain"
                />
              </View>
              <Text style={getAppNameStyle()}>OPHELIA</Text>
              <Text style={getWelcomeTextStyle()}>{getText('welcomeBack')}</Text>
            </View>

            {/* Input Fields */}
            <View style={getInputSectionStyle()}>
              {/* Email Input */}
              <View style={getInputContainerStyle()}>
                <Text style={getInputLabelStyle()}>{getText('email')}</Text>
                <View style={getInputWrapperStyle()}>
                  <Ionicons 
                    name="mail-outline" 
                    size={isTablet ? 24 : 20} 
                    color="#9CA3AF" 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={getTextInputStyle()}
                    placeholder={getText('enterEmailPlaceholder')}
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={getInputContainerStyle()}>
                <Text style={getInputLabelStyle()}>{getText('password')}</Text>
                <View style={getInputWrapperStyle()}>
                  <Ionicons 
                    name="lock-closed-outline" 
                    size={isTablet ? 24 : 20} 
                    color="#9CA3AF" 
                    style={styles.inputIcon} 
                  />
                  <TextInput
                    style={getTextInputStyle()}
                    placeholder={getText('enterPasswordPlaceholder')}
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!loading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    disabled={loading}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={isTablet ? 24 : 20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* Forgot Password */}
              <TouchableOpacity 
                onPress={handleForgotPassword} 
                style={styles.forgotPasswordContainer}
                disabled={loading}
              >
                <Text style={styles.forgotPasswordText}>{getText('forgotPasswordLink')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Buttons */}
          <View style={[styles.buttonSection, { maxWidth: isTablet ? 500 : 400 }]}>
            <TouchableOpacity 
              style={[
                styles.loginButton, 
                loading && styles.loginButtonDisabled,
                { borderRadius: isTablet ? 16 : 12, paddingVertical: isTablet ? 18 : 16 }
              ]} 
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={[styles.loginButtonText, { fontSize: isTablet ? 18 : 16 }]}>
                {loading ? 'Logging in...' : getText('login')}
              </Text>
            </TouchableOpacity>

            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={[styles.separatorText, { fontSize: isTablet ? 16 : 14 }]}>or</Text>
              <View style={styles.separatorLine} />
            </View>

            <TouchableOpacity 
              style={[
                styles.createAccountButton, 
                { borderRadius: isTablet ? 16 : 12, paddingVertical: isTablet ? 18 : 16 }
              ]} 
              onPress={handleCreateAccount}
              disabled={loading}
            >
              <Text style={[styles.createAccountButtonText, { fontSize: isTablet ? 18 : 16 }]}>
                {getText('createAccountButton')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { 
    flex: 1, 
    width: '100%', 
    height: '100%' 
  },
  header: { 
    position: 'absolute', 
    top: 60, 
    left: 20, 
    zIndex: 1 
  },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  backButtonText: { 
    color: 'white', 
    marginLeft: 8 
  },
  content: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  logoContainer: { 
    marginBottom: 16 
  },
  inputIcon: { 
    marginRight: 12 
  },
  eyeIcon: { 
    padding: 4 
  },
  forgotPasswordContainer: { 
    alignSelf: 'flex-end', 
    marginTop: 8 
  },
  forgotPasswordText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    textDecorationLine: 'underline' 
  },
  errorContainer: { 
    backgroundColor: 'rgba(239, 68, 68, 0.9)', 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  errorText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    flex: 1 
  },
  loginButtonDisabled: { 
    opacity: 0.6 
  },
  buttonSection: { 
    width: '100%', 
    alignSelf: 'center',
    gap: 16 
  },
  loginButton: { 
    backgroundColor: '#FFFFFF', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: { 
    color: '#000000', 
    fontWeight: 'bold' 
  },
  separator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginVertical: 8 
  },
  separatorLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: '#374151' 
  },
  separatorText: { 
    color: '#FFFFFF', 
    marginHorizontal: 16 
  },
  createAccountButton: {
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createAccountButtonText: { 
    color: '#FFFFFF', 
    fontWeight: 'bold' 
  },
});