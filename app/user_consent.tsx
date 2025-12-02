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

const TERMS_KEY = '@ophelia_terms_accepted';
const CHECKBOX_KEY = '@ophelia_checkbox_state';

export default function UserConsentScreen() {
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    const loadCheckboxState = async () => {
      try {
        const saved = await AsyncStorage.getItem(CHECKBOX_KEY);
        if (saved === 'true') setIsChecked(true);
      } catch (error) {
        console.log('Error loading checkbox state:', error);
      }
    };
    loadCheckboxState();
  }, []);

  const handleCheckboxToggle = async () => {
    const newState = !isChecked;
    setIsChecked(newState);
    try {
      await AsyncStorage.setItem(CHECKBOX_KEY, newState.toString());
    } catch (error) {
      console.log('Error saving checkbox state:', error);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleAccept = async () => {
    if (isChecked) {
      try {
        await AsyncStorage.setItem(TERMS_KEY, 'true');
        const selectedModel = await AsyncStorage.getItem('@ophelia_selected_model');
        if (selectedModel) {
          router.replace('/chat');
        } else {
          router.replace('/ai_model');
        }
      } catch (error) {
        console.log('Error saving consent:', error);
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
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={handleCheckboxToggle}
            activeOpacity={0.7}
          >
            <View style={styles.checkboxContainer}>
              <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                {isChecked && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
            </View>
            <Text style={styles.consentTextInline}>
              By accepting, you confirm that you have read and agree to the above terms.
            </Text>
          </TouchableOpacity>

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
});
