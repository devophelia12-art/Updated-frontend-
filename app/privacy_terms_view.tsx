import React from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

export default function PrivacyTermsViewScreen() {
  const { getText } = useLanguage();

  const handleBack = () => {
    router.back();
  };

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
          <Text style={styles.headerTitle}>Privacy & Terms</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {/* Main Title */}
          <Text style={styles.mainTitle}>Ophelia ClipOn Privacy Policy</Text>
          <Text style={styles.subtitle}>(U.S. Version)</Text>
          <Text style={styles.lastUpdated}>Last Updated: October 2025</Text>

          {/* Section 1: Introduction */}
          <Text style={styles.sectionNumber}>1. Introduction</Text>
          <Text style={styles.sectionText}>
            GLK Holdings LLC ("Ophelia," "we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use the Ophelia ClipOn smart glasses, the Ophelia mobile app, or any other related services (collectively, the "Services"). By using our Services, you consent to the terms of this Privacy Policy.
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
            Voice commands are processed securely to deliver real-time responses. Unless you explicitly enable "Conversation History," Ophelia does not store raw audio recordings.
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
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
});

