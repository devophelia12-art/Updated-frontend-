import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../contexts/UserContext';

export default function PaymentScreen() {
  const { userData, loadUserData } = useUser();
  const [fullName, setFullName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<'monthly' | 'annual'>('annual');

  // Load user data on mount
  React.useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Update full name when userData loads
  React.useEffect(() => {
    if (userData?.fullName) {
      setFullName(userData.fullName);
    }
  }, [userData]);

  const handleBack = () => {
    router.back();
  };

  const handleSubscribe = () => {
    // TODO: Implement actual payment processing with Stripe
    console.log('Subscribe pressed', {
      fullName,
      cardNumber,
      expirationDate,
      cvc,
      subscription: selectedSubscription,
    });
    
    // Navigate back or to success screen
    Alert.alert('Success', 'Subscription activated successfully!', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  const formatCardNumber = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add space every 4 digits
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.substring(0, 19); // Max 16 digits + 3 spaces
  };

  const formatExpirationDate = (text: string) => {
    // Remove all non-digits
    const cleaned = text.replace(/\D/g, '');
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      return cleaned.substring(0, 2) + '/' + cleaned.substring(2, 4);
    }
    return cleaned;
  };

  return (
    <ImageBackground
      source={require('../assets/images/background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>OPHELIA</Text>
            <Text style={styles.subtitle}>Secure Payment</Text>
          </View>

          {/* Plan Selection Card */}
          <View style={styles.planCard}>
            <Ionicons name="card-outline" size={24} color="white" />
            <View style={styles.planCardContent}>
              <Text style={styles.planCardTitle}>Premium Plan (Omni)</Text>
              <Text style={styles.planCardSubtitle}>(No commitment, cancel anytime).</Text>
            </View>
          </View>

          {/* Payment Details Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Full name"
                placeholderTextColor="#B0B0B0"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Card Number</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Card Number"
                placeholderTextColor="#B0B0B0"
                value={cardNumber}
                onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                keyboardType="numeric"
                maxLength={19}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>Expiration Date</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="MM/YY"
                  placeholderTextColor="#B0B0B0"
                  value={expirationDate}
                  onChangeText={(text) => setExpirationDate(formatExpirationDate(text))}
                  keyboardType="numeric"
                  maxLength={5}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <Text style={styles.label}>CVC</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="CVC"
                  placeholderTextColor="#B0B0B0"
                  value={cvc}
                  onChangeText={(text) => setCvc(text.replace(/\D/g, '').substring(0, 3))}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>
          </View>

          {/* Secure Payment Card */}
          <View style={styles.secureCard}>
            <Ionicons name="shield-checkmark-outline" size={24} color="white" />
            <View style={styles.secureCardContent}>
              <Text style={styles.secureCardTitle}>Secure Payment via stripe</Text>
              <Text style={styles.secureCardSubtitle}>
                SSL encrypted transaction - your data is protected.
              </Text>
            </View>
          </View>

          {/* Subscription Buttons */}
          <View style={styles.subscriptionSection}>
            <TouchableOpacity
              style={[
                styles.subscriptionButton,
                selectedSubscription === 'monthly' && styles.subscriptionButtonSelected,
              ]}
              onPress={() => setSelectedSubscription('monthly')}
            >
              <Text style={[
                styles.subscriptionButtonText,
                selectedSubscription === 'monthly' && styles.subscriptionButtonTextSelected,
              ]}>
                Subscribe $18 / month now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.subscriptionButton,
                styles.subscriptionButtonAnnual,
                selectedSubscription === 'annual' && styles.subscriptionButtonSelected,
              ]}
              onPress={() => setSelectedSubscription('annual')}
            >
              <Text style={[
                styles.subscriptionButtonTextAnnual,
                selectedSubscription === 'annual' && styles.subscriptionButtonTextSelected,
              ]}>
                Subscribe $15 / month ($180 now)
              </Text>
              <Text style={styles.subscriptionButtonSubtext}>12 months included</Text>
            </TouchableOpacity>
          </View>

          {/* Subscribe Button */}
          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
            <Text style={styles.subscribeButtonText}>
              {selectedSubscription === 'monthly' ? 'Subscribe Now' : 'Subscribe Annual Plan'}
            </Text>
          </TouchableOpacity>

          {/* Terms Text */}
          <Text style={styles.termsText}>
            By subscribing, you agree to our Terms of Service and Privacy Policy. Cancel anytime from account settings.
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  titleSection: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  planCardContent: {
    marginLeft: 12,
    flex: 1,
  },
  planCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planCardSubtitle: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  secureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  secureCardContent: {
    marginLeft: 12,
    flex: 1,
  },
  secureCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  secureCardSubtitle: {
    fontSize: 12,
    color: '#B0B0B0',
  },
  subscriptionSection: {
    marginBottom: 24,
  },
  subscriptionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  subscriptionButtonAnnual: {
    backgroundColor: '#8B5CF6',
  },
  subscriptionButtonSelected: {
    borderColor: '#FFFFFF',
  },
  subscriptionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  subscriptionButtonTextAnnual: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subscriptionButtonTextSelected: {
    color: '#FFFFFF',
  },
  subscriptionButtonSubtext: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    opacity: 0.9,
  },
  subscribeButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  termsText: {
    fontSize: 12,
    color: '#B0B0B0',
    textAlign: 'center',
    lineHeight: 18,
  },
});

