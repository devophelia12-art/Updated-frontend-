import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const TERMS_KEY = '@ophelia_terms_accepted';
const CONSENT_CHECKBOX_KEY = '@ophelia_consent_checkbox_state';

export default function UserConsentScreen() {
  const [isChecked, setIsChecked] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const { user, sendConsentConfirmation } = useAuth();

  // Load consent status and checkbox state from AsyncStorage when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const loadConsentStatus = async () => {
        try {
          const consentAccepted = await AsyncStorage.getItem(TERMS_KEY);
          const savedState = await AsyncStorage.getItem(CONSENT_CHECKBOX_KEY);
          
          if (consentAccepted === 'true') {
            setIsAccepted(true);
            setIsChecked(true);
          } else if (savedState === 'true') {
            setIsChecked(true);
          }
        } catch (error) {
          console.error('Error loading consent status:', error);
        }
      };
      loadConsentStatus();
    }, [])
  );

  const handleBack = () => {
    router.back();
  };

  const handleAccept = async () => {
    if (isChecked) {
      try {
        await AsyncStorage.setItem(TERMS_KEY, 'true');
        await AsyncStorage.setItem(CONSENT_CHECKBOX_KEY, 'true'); // Persist checkbox state
        setIsAccepted(true);
        
        // Send email confirmation if user is logged in
        if (user?.email) {
          try {
            await sendConsentConfirmation(user.email, 'User Consent Agreement');
          } catch (error) {
            console.error('Failed to send consent confirmation email:', error);
            // Don't block the flow if email fails
          }
        }
        // Only navigate if this is the first time accepting (not from settings)
        // If user came from settings, just update the UI and stay on the page
        // We'll check if we can go back - if we can, it means we came from settings
        try {
          // Try to check if we came from settings by checking navigation state
          // If we can't go back, it means this is the initial screen
          if (typeof router.canGoBack === 'function' && router.canGoBack()) {
            // User came from settings, just update UI
            return;
          }
        } catch (e) {
          // If canGoBack doesn't work, assume it's first time
        }
        // First time accepting, navigate to AI model selection
        router.replace('/ai_model');
      } catch (error) {
        console.log('Error saving consent:', error);
        // On error, still try to navigate if it's first time
        try {
          if (typeof router.canGoBack === 'function' && router.canGoBack()) {
            return;
          }
        } catch (e) {
          // Continue with navigation
        }
        router.replace('/ai_model');
      }
    }
  };

  const handleDecline = () => {
    router.back();
  };

  return (
    <LinearGradient
      colors={['#000000', '#000000', '#E00080']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.background}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContainer}>
          <View style={styles.contentWrapper}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>User Consent Agreement</Text>
              <View style={styles.placeholder} />
            </View>

            <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.mainTitle}>OPHELIA ClipOn - User Consent Agreement</Text>

            <Text style={styles.paragraph}>
              Welcome to OPHELIA ClipOn. Before using this app, please read this User Consent Agreement carefully.
              Your continued use of the app signifies that you agree to the following terms and conditions:
            </Text>

            <Text style={styles.sectionTitle}>1. Data Collection and Usage</Text>
            <Text style={styles.paragraph}>
              OPHELIA may collect and process personal information such as your voice, chat messages, and preferences
              to improve app performance and provide AI-based responses.
            </Text>

            <Text style={styles.sectionTitle}>2. Voice and Chat Data</Text>
            <Text style={styles.paragraph}>
              By using voice or chat features, you consent to the recording, processing, and storage of data necessary
              to provide the requested service. Data is handled securely and not shared with third parties without consent.
            </Text>

            <Text style={styles.sectionTitle}>3. AI Model Behavior</Text>
            <Text style={styles.paragraph}>
              The AI models used (GPT, Gemini, Grok, etc.) may generate text that does not always reflect accurate or verified
              information. Please use discretion when acting on AI-generated responses.
            </Text>

            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.paragraph}>
              OPHELIA uses encryption and secure storage for all user data. However, you acknowledge that no system is
              100% secure, and OPHELIA cannot guarantee absolute protection against data breaches.
            </Text>

            <Text style={styles.sectionTitle}>5. User Responsibilities</Text>
            <Text style={styles.paragraph}>
              Users agree not to use the app for unlawful purposes, to spread harmful content, or to impersonate others.
            </Text>

            <Text style={styles.sectionTitle}>6. Updates to Agreement</Text>
            <Text style={styles.paragraph}>
              OPHELIA reserves the right to update this agreement periodically. Continued use after updates constitutes
              acceptance of the new terms.
            </Text>

            <Text style={styles.sectionTitle}>7. Contact</Text>
            <Text style={styles.paragraph}>
              For questions regarding this agreement, please contact: support@ophelia.ai
            </Text>
            </ScrollView>
          </View>

          <View style={styles.bottomSection}>
          {isAccepted ? (
            // Show accepted status if consent was already given
            <View style={styles.acceptedContainer}>
              <View style={styles.acceptedRow}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.acceptedText}>Consent Accepted</Text>
              </View>
              <Text style={styles.acceptedDateText}>
                You have already accepted the User Consent Agreement.
              </Text>
            </View>
          ) : (
            // Show checkbox and buttons if not yet accepted
            <>
              <View style={styles.checkboxRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={async () => {
                    const newState = !isChecked;
                    setIsChecked(newState);
                    // Save checkbox state to AsyncStorage
                    try {
                      await AsyncStorage.setItem(CONSENT_CHECKBOX_KEY, newState ? 'true' : 'false');
                    } catch (error) {
                      console.error('Error saving checkbox state:', error);
                    }
                  }}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                    {isChecked && <Ionicons name="checkmark" size={16} color="black" />}
                  </View>
                </TouchableOpacity>
                <Text style={styles.consentTextInline}>
                  By accepting, you confirm that you have read and agree to the above terms.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.acceptButton, !isChecked && styles.acceptButtonDisabled]}
                onPress={handleAccept}
                disabled={!isChecked}
              >
                <Text style={[styles.acceptButtonText, !isChecked && styles.acceptButtonTextDisabled]}>
                  Accept & Continue
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.declineButton} onPress={handleDecline}>
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 24,
  },
  scrollView: {
    marginTop: 10,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  mainTitle: {
    color: '#E00080',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  sectionTitle: {
    color: '#E00080',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  paragraph: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
    lineHeight: 20,
  },
  bottomSection: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkboxContainer: {
    marginRight: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#E00080',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#E00080',
  },
  consentTextInline: {
    flex: 1,
    color: 'white',
    fontSize: 13,
  },
  acceptButton: {
    backgroundColor: '#E00080',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptButtonDisabled: {
    backgroundColor: 'gray',
  },
  acceptButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  acceptButtonTextDisabled: {
    color: '#ddd',
  },
  declineButton: {
    marginTop: 10,
    alignItems: 'center',
  },
  declineButtonText: {
    color: 'white',
    fontSize: 15,
  },
  acceptedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  acceptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  acceptedText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  acceptedDateText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});
