import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { getText } = useLanguage();
  const { user, logout } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [localProfileImage, setLocalProfileImage] = useState<string | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleAccount = () => {
    router.push('/account_settings');
  };

  const handleAIModels = () => {
    router.push('/settings_ai_model');
  };

  const handleLanguage = () => {
    router.push('/settings_language');
  };

  const handleVoiceSettings = () => {
    router.push('/voice_settings');
  };

  const handleChoosePlan = () => {
    router.push('/choose_plan');
  };

  const handleUserConsent = () => {
    router.push('/user_consent');
  };

  const handlePrivacyTerms = () => {
    router.push('/privacy_terms_view');
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
      // Clear navigation stack and go to login
      router.dismissAll();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.dismissAll();
      router.replace('/(auth)/login');
    }
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user?.fullName) {
      const names = user.fullName.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[names.length - 1][0]).toUpperCase();
      }
      return user.fullName[0]?.toUpperCase() || 'U';
    }
    return 'U';
  };

  // Load local-saved profile image (if any). Key: local_profile_image_<userId>
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!user?.id) return;
        const key = `local_profile_image_${user.id}`;
        const local = await AsyncStorage.getItem(key);
        if (mounted && local) {
          setLocalProfileImage(local);
          return;
        }
        // Use server image if available
        if (mounted && user?.profileImageUri) {
          setLocalProfileImage(user.profileImageUri);
          return;
        }
        // final fallback: debug image path provided in conversation history
        if (mounted && !local && !user?.profileImageUri) {
          // dev/test only — this path exists on your dev container/environment
          setLocalProfileImage('/mnt/data/Screenshot_20251120_173935_OPHELIA.jpg');
        }
      } catch (err) {
        console.warn('Failed to load local profile image:', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id, user?.profileImageUri]); // Added user?.profileImageUri to dependencies

  return (
    <ImageBackground
      source={require('../assets/images/background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Section */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              {localProfileImage ? (
                <Image
                  source={{ uri: localProfileImage }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : user?.profileImageUri ? (
                <Image source={{ uri: user.profileImageUri }} style={styles.avatarImage} resizeMode="cover" />
              ) : (
                <Text style={styles.avatarText}>{getUserInitials()}</Text>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.fullName || 'User'}
              </Text>
              <Text style={styles.profileEmail}>
                {user?.email || 'No email'}
              </Text>
            </View>
            <Ionicons name="battery-full" size={24} color="white" />
          </View>

          {/* Settings Options */}
          <TouchableOpacity style={styles.settingCard} onPress={handleAccount}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Account</Text>
              <Text style={styles.settingSubtitle}>Manage your profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingCard} onPress={handleAIModels}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>AI Models</Text>
              <Text style={styles.settingSubtitle}>Select your AI Model</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingCard} onPress={handleLanguage}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Language</Text>
              <Text style={styles.settingSubtitle}>Select your language</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingCard} onPress={handleVoiceSettings}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Voice Settings</Text>
              <Text style={styles.settingSubtitle}>Select your voice output</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingCard} onPress={handleChoosePlan}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Choose Your Plan</Text>
              <Text style={styles.settingSubtitle}>Select a plan that works best for you.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingCard} onPress={handleUserConsent}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>User Consent Agreement</Text>
              <Text style={styles.settingSubtitle}>Read agreement</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingCard} onPress={handlePrivacyTerms}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Privacy & Terms</Text>
              <Text style={styles.settingSubtitle}>Read terms</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
          </TouchableOpacity>
        </ScrollView>

        {/* Log Out Button - Fixed at bottom */}
        <View style={styles.logoutButtonContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutButtonContent}>
              <Text style={styles.logoutButtonTitle}>Log Out</Text>
              <Text style={styles.logoutButtonSubtitle}>Log out your Account</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Confirmation Modal */}
        <Modal
          visible={showLogoutModal}
          transparent={true}
          animationType="fade"
          onRequestClose={cancelLogout}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Are you sure you want to log out?</Text>
              <Text style={styles.modalMessage}>
                You will need to log in again to access your OPHELIA account & use the voice assistant.
              </Text>
              <TouchableOpacity style={styles.modalLogoutButton} onPress={confirmLogout}>
                <Text style={styles.modalLogoutButtonText}>Log Out</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelButton} onPress={cancelLogout}>
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'rgba(0, 0, 0, 0.3)' },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12 },
  avatarContainer: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#4A4A4A', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  avatarImage: { width: 56, height: 56, borderRadius: 12 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  profileEmail: { fontSize: 14, color: '#B0B0B0' },
  settingCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  settingSubtitle: { fontSize: 14, color: '#B0B0B0' },
  logoutButtonContainer: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  logoutButton: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16 },
  logoutButtonContent: { alignItems: 'center' },
  logoutButtonTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  logoutButtonSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: '#2A2A2A', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12, textAlign: 'center' },
  modalMessage: { fontSize: 14, color: '#FFFFFF', lineHeight: 20, marginBottom: 24, textAlign: 'center' },
  modalLogoutButton: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  modalLogoutButtonText: { fontSize: 16, fontWeight: '600', color: '#000000' },
  modalCancelButton: { backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF' },
  modalCancelButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
