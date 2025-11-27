import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import { router, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSearchParams } from 'expo-router/build/hooks';

export default function PrivacyTermsScreen() {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToVoiceProcessing, setAgreedToVoiceProcessing] = useState(false);
  const { getText } = useLanguage();
  const { user, sendConsentConfirmation } = useAuth();
  const router = useRouter();
  
  const handleAcceptTerms = async () => {
    if (!agreedToTerms || !agreedToVoiceProcessing) return;
    
    await AsyncStorage.setItem('@ophelia_terms_accepted', 'true');
    
    // Send email confirmation if user is logged in
    if (user?.email) {
      try {
        await sendConsentConfirmation(user.email, 'Privacy Terms');
      } catch (error) {
        console.error('Failed to send consent confirmation email:', error);
        // Don't block the flow if email fails
      }
    }
    
    router.replace('/ai_model');
  };



  const isButtonEnabled = agreedToTerms && agreedToVoiceProcessing;

  return (
    <ImageBackground
      source={require('../assets/images/background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{getText('privacyTerms')}</Text>
          </View>

          {/* Scrollable Privacy Policy Content */}
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {/* Main Title */}
            <Text style={styles.mainTitle}>Ophelia ClipOn Privacy Policy</Text>
            <Text style={styles.subtitle}>(U.S. Version)</Text>
            <Text style={styles.lastUpdated}>Last Updated: October 2025</Text>

            {/* Section 1: Introduction */}
            <Text style={styles.sectionNumber}>1. Introduction</Text>
            <Text style={styles.sectionText}>
              GLK Holdings LLC (&quot;Ophelia,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use the Ophelia ClipOn smart glasses, the Ophelia mobile app, or any other related services (collectively, the &quot;Services&quot;). By using our Services, you consent to the terms of this Privacy Policy.
            </Text>

            {/* Section 2: Information We Collect */}
            <Text style={styles.sectionNumber}>2. Information We Collect</Text>
            <Text style={styles.subsectionTitle}>(a) Personal Information</Text>
            <Text style={styles.sectionText}>
              Name, email address, and phone number (when registering or subscribing). Payment information (processed securely via Stripe — we never store your full card number).
            </Text>
            
            <Text style={styles.subsectionTitle}>(b) Device and Usage Information</Text>
            <Text style={styles.sectionText}>
              Device model, OS version, unique device identifiers, battery level, and firmware data. Bluetooth and microphone activity (for connection and voice features).
            </Text>
            
            <Text style={styles.subsectionTitle}>(c) Audio and Voice Data</Text>
            <Text style={styles.sectionText}>
              Voice commands are processed securely to deliver real-time responses. Unless you explicitly enable &quot;Conversation History,&quot; Ophelia does not store raw audio recordings.
            </Text>
            
            <Text style={styles.subsectionTitle}>(d) Diagnostic and Performance Data</Text>
            <Text style={styles.sectionText}>
              Error logs, crash reports, and performance metrics to maintain system stability.
            </Text>

            {/* Section 3: How We Use Your Information */}
            <Text style={styles.sectionNumber}>3. How We Use Your Information</Text>
            <Text style={styles.sectionText}>
              We use your data to: Operate and improve the ClipOn and mobile app experience. Provide personalized voice interactions and translations. Process payments and manage subscriptions. Detect and resolve technical issues. Comply with legal obligations or enforce our terms of service. We do not sell your personal information.
            </Text>

            {/* Section 4: Data Sharing and Transfers */}
            <Text style={styles.sectionNumber}>4. Data Sharing and Transfers</Text>
            <Text style={styles.sectionText}>
              We may share your data only in the following cases: Service providers: e.g., cloud hosting (AWS), analytics, and payment processors (Stripe). Legal compliance: if required by law, subpoena, or court order. Corporate events: in case of merger, acquisition, or asset transfer (your data remains protected). All transfers use SSL encryption and secure U.S.-based or compliant data centers.
            </Text>

            {/* Section 5: Data Retention */}
            <Text style={styles.sectionNumber}>5. Data Retention</Text>
            <Text style={styles.sectionText}>
              We retain personal data only as long as needed to provide our Services or comply with legal requirements. Voice data (if enabled) is automatically deleted after 30 days unless you choose to keep a history in your settings.
            </Text>

            {/* Section 6: Your Rights */}
            <Text style={styles.sectionNumber}>6. Your Rights (U.S. & State Privacy Laws)</Text>
            <Text style={styles.sectionText}>
              Depending on where you live, you may have rights under U.S. laws such as CCPA/CPRA (California) or Virginia CDPA, including: Request access to or deletion of your personal data. Opt out of data sharing or targeted advertising. Correct inaccurate data. You can submit requests to: privacy@ashel.ai
            </Text>

            {/* Section 7: Data Security */}
            <Text style={styles.sectionNumber}>7. Data Security</Text>
            <Text style={styles.sectionText}>
              We use strong encryption, firewalls, and secure servers to protect your data. Payments are processed via Stripe using SSL and PCI-DSS standards. However, no online platform can guarantee 100% security — please use your device responsibly.
            </Text>

            {/* Section 8: Children's Privacy */}
            <Text style={styles.sectionNumber}>8. Children's Privacy</Text>
            <Text style={styles.sectionText}>
              Ophelia ClipOn is not designed for users under 16. We do not knowingly collect information from minors. If a parent believes their child has used our Services, please contact us for deletion.
            </Text>

            {/* Section 9: Updates to This Policy */}
            <Text style={styles.sectionNumber}>9. Updates to This Policy</Text>
            <Text style={styles.sectionText}>
              We may update this Privacy Policy periodically. Any significant changes will be communicated through the app or email. Continued use of Ophelia ClipOn after updates means you accept the revised terms.
            </Text>

            {/* Section 10: Contact Us */}
            <Text style={styles.sectionNumber}>10. Contact Us</Text>
            <Text style={styles.sectionText}>
              GLK Holdings LLC{'\n'}
              Email: privacy@ashel.ai{'\n'}
              Address: Las Vegas, Nevada, USA
            </Text>
          </ScrollView>

          {/* Checkboxes Section - Fixed at bottom */}
          <View style={styles.checkboxSection}>
            <Text style={styles.sectionTitle}>{getText('informationWeCollect')}</Text>
            
            {/* Checkbox 1 */}
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
            >
              <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
                {agreedToTerms && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.checkboxText}>{getText('agreeToTerms')}</Text>
            </TouchableOpacity>

            {/* Checkbox 2 */}
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setAgreedToVoiceProcessing(!agreedToVoiceProcessing)}
            >
              <View style={[styles.checkbox, agreedToVoiceProcessing && styles.checkboxChecked]}>
                {agreedToVoiceProcessing && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.checkboxText}>{getText('agreeToVoiceProcessing')}</Text>
            </TouchableOpacity>
          </View>

          {/* Accept Button - Fixed at bottom */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.acceptButton,
                !isButtonEnabled && styles.acceptButtonDisabled
              ]} 
              onPress={handleAcceptTerms}
              disabled={!isButtonEnabled}
            >
              <Text style={[
                styles.acceptButtonText,
                !isButtonEnabled && styles.acceptButtonTextDisabled
              ]}>
                {getText('acceptContinue')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    marginBottom: 4,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 24,
  },
  sectionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 22,
    marginBottom: 12,
  },
  checkboxSection: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxText: {
    fontSize: 14,
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 20,
  },
  acceptButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  acceptButtonDisabled: {
    backgroundColor: '#666666',
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
  acceptButtonTextDisabled: {
    color: '#999999',
  },
});