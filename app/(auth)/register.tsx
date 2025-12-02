import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';

export default function RegisterScreen() {
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { getText } = useLanguage();
  const { register } = useAuth();

  const isTablet = dimensions.width >= 768;
  const isSmallScreen = dimensions.width < 375;

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(email.trim(), password, fullName.trim(), confirmPassword);
      router.replace('/privacy_terms');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => router.back();
  const handleLogin = () => router.replace('./login');

  const getScrollContainerStyle = () => ({
    flexGrow: 1,
    paddingHorizontal: isTablet ? 40 : isSmallScreen ? 16 : 20,
    paddingTop: keyboardVisible ? 20 : (isTablet ? 60 : 90),
    paddingBottom: keyboardVisible ? 20 : 40,
    justifyContent: keyboardVisible ? 'flex-start' : 'center',
  });

  const getCardStyle = () => ({
    width: '100%',
    maxWidth: isTablet ? 500 : undefined,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: isTablet ? 24 : 20,
    padding: isTablet ? 32 : isSmallScreen ? 16 : 24,
    elevation: 8,
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require('@/assets/images/background.png')}
        style={styles.background}
        resizeMode="cover"
      >
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={isTablet ? 28 : 26} color="white" />
          <Text style={styles.backBtnText}>{getText('back')}</Text>
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={getScrollContainerStyle()}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={getCardStyle()}>
              {!keyboardVisible && (
                <View style={styles.brandingSection}>
                  <Image
                    source={require('@/assets/images/ophelia logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                  <Text style={styles.title}>{getText('createAccount')}</Text>
                  <Text style={styles.subtitle}>{getText('joinOphellia')}</Text>
                </View>
              )}

              <View style={styles.inputSection}>
                <InputField
                  label={getText('fullName')}
                  icon="person-outline"
                  value={fullName}
                  setValue={setFullName}
                  placeholder={getText('enterNamePlaceholder')}
                  isTablet={isTablet}
                  isSmallScreen={isSmallScreen}
                />

                <InputField
                  label={getText('email')}
                  icon="mail-outline"
                  value={email}
                  setValue={setEmail}
                  placeholder={getText('enterEmailPlaceholder')}
                  email
                  isTablet={isTablet}
                  isSmallScreen={isSmallScreen}
                />

                <PasswordField
                  label={getText('password')}
                  value={password}
                  setValue={setPassword}
                  visible={showPassword}
                  toggle={() => setShowPassword(!showPassword)}
                  placeholder={getText('enterPasswordPlaceholder')}
                  isTablet={isTablet}
                  isSmallScreen={isSmallScreen}
                />

                <PasswordField
                  label={getText('confirmPassword')}
                  value={confirmPassword}
                  setValue={setConfirmPassword}
                  visible={showConfirmPassword}
                  toggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  placeholder={getText('confirmPasswordPlaceholder')}
                  isTablet={isTablet}
                  isSmallScreen={isSmallScreen}
                />

                {!!error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.createBtn, loading && { opacity: 0.5 }]}
                onPress={handleRegister}
                disabled={loading}
              >
                <Text style={styles.createBtnText}>
                  {loading ? 'Creating Account...' : getText('createAccountButton')}
                </Text>
              </TouchableOpacity>

              <View style={styles.loginRow}>
                <Text style={styles.loginText}>{getText('alreadyHaveAccount')}</Text>
                <TouchableOpacity onPress={handleLogin}>
                  <Text style={styles.loginLink}>{getText('login')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );

  function InputField({ label, icon, value, setValue, placeholder, email, isTablet, isSmallScreen }) {
    return (
      <View style={[styles.inputContainer, { marginBottom: isTablet ? 20 : isSmallScreen ? 12 : 18 }]}>
        <Text style={[styles.inputLabel, { fontSize: isTablet ? 16 : isSmallScreen ? 14 : 15 }]}>{label}</Text>
        <View style={[styles.inputBox, {
          borderRadius: isTablet ? 16 : 12,
          paddingHorizontal: isTablet ? 20 : 15,
          paddingVertical: isTablet ? 18 : isSmallScreen ? 12 : 14,
        }]}>
          <Ionicons name={icon} size={isTablet ? 24 : 20} color="#9CA3AF" style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.textInput, { fontSize: isTablet ? 18 : isSmallScreen ? 14 : 16 }]}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={setValue}
            autoCapitalize={email ? 'none' : 'words'}
            keyboardType={email ? 'email-address' : 'default'}
          />
        </View>
      </View>
    );
  }

  function PasswordField({ label, value, setValue, visible, toggle, placeholder, isTablet, isSmallScreen }) {
    return (
      <View style={[styles.inputContainer, { marginBottom: isTablet ? 20 : isSmallScreen ? 12 : 18 }]}>
        <Text style={[styles.inputLabel, { fontSize: isTablet ? 16 : isSmallScreen ? 14 : 15 }]}>{label}</Text>
        <View style={[styles.inputBox, {
          borderRadius: isTablet ? 16 : 12,
          paddingHorizontal: isTablet ? 20 : 15,
          paddingVertical: isTablet ? 18 : isSmallScreen ? 12 : 14,
        }]}>
          <Ionicons name="lock-closed-outline" size={isTablet ? 24 : 20} color="#9CA3AF" style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.textInput, { fontSize: isTablet ? 18 : isSmallScreen ? 14 : 16 }]}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={value}
            onChangeText={setValue}
            secureTextEntry={!visible}
          />
          <TouchableOpacity onPress={toggle}>
            <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={isTablet ? 24 : 20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
  },
  backBtn: {
    position: 'absolute',
    top: 20,
    left: 15,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnText: { 
    color: 'white', 
    marginLeft: 8, 
    fontSize: 16 
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: { 
    width: 80, 
    height: 80 
  },
  title: { 
    color: '#FFF', 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginTop: 10 
  },
  subtitle: { 
    color: '#CCC', 
    fontSize: 14, 
    marginTop: 4 
  },
  inputSection: { 
    marginBottom: 30 
  },
  inputContainer: {},
  inputLabel: { 
    color: 'white', 
    marginBottom: 8 
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  textInput: { 
    flex: 1, 
    color: 'white' 
  },
  errorBox: {
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  errorText: { 
    color: 'white', 
    textAlign: 'center' 
  },
  createBtn: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  createBtnText: { 
    color: '#000', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  loginRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: { 
    color: '#FFF', 
    fontSize: 15 
  },
  loginLink: { 
    color: '#8B5CF6', 
    fontSize: 15, 
    marginLeft: 5 
  },
});