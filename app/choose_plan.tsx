import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState } from 'react';
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

export default function ChoosePlanScreen() {
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium' | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleGetStarted = (planType: 'basic' | 'premium') => {
    if (planType === 'basic') {
      // For Basic Plan (Free), just navigate back or to chat
      router.back();
    } else {
      // For Premium Plan, navigate to payment screen
      setSelectedPlan('premium');
      router.push('/payment');
    }
  };

  const handleSelectPlan = (plan: 'basic' | 'premium') => {
    setSelectedPlan(plan);
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
            <Text style={styles.title}>Choose Your Plan</Text>
            <Text style={styles.subtitle}>Select a plan that works best for you.</Text>
          </View>

          {/* Basic Plan Card */}
          <TouchableOpacity
            style={[
              styles.planCard,
              selectedPlan === 'basic' && styles.planCardSelected,
            ]}
            onPress={() => handleSelectPlan('basic')}
            activeOpacity={0.9}
          >
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Basic Plan</Text>
              <Text style={styles.planPrice}>Free</Text>
            </View>
            
            <View style={styles.featuresSection}>
              <Text style={styles.featuresLabel}>Voice Commands:</Text>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#C77DFF" />
                <Text style={styles.featureText}>Talk with my AI</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#C77DFF" />
                <Text style={styles.featureText}>Make phone calls</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#C77DFF" />
                <Text style={styles.featureText}>Listen to music</Text>
              </View>
            </View>

            <View style={styles.priceSection}>
              <Text style={styles.priceText}>Price: Free</Text>
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleGetStarted('basic')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Get Started</Text>
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Premium Plan Card */}
          <TouchableOpacity
            style={styles.premiumCardContainer}
            onPress={() => handleSelectPlan('premium')}
            activeOpacity={0.9}
          >
            <View
              style={[
                styles.planCard,
                styles.premiumCard,
                selectedPlan === 'premium' && styles.planCardSelected,
              ]}
            >
            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planTitle}>Premium Plan</Text>
                <Text style={styles.planSubtitle}>(Omni)</Text>
              </View>
            </View>
            
            <View style={styles.featuresSection}>
              <Text style={styles.featuresLabel}>Voice Commands:</Text>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#C77DFF" />
                <Text style={styles.featureText}>Talk with multiple AIs</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#C77DFF" />
                <Text style={styles.featureText}>Make phone calls</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#C77DFF" />
                <Text style={styles.featureText}>Listen to music</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#C77DFF" />
                <Text style={styles.featureText}>Check and read emails</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#C77DFF" />
                <Text style={styles.featureText}>Real-time conversation translation</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color="#C77DFF" />
                <Text style={styles.featureText}>Record and summarise conversations</Text>
              </View>
            </View>

            <View style={styles.priceSection}>
              <Text style={styles.premiumPrice}>$18/month</Text>
              <Text style={styles.premiumPriceSubtext}>or $15/month (annual payment)</Text>
            </View>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleGetStarted('premium')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionButtonText}>Get Omni (Cancel Anytime)</Text>
            </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </ScrollView>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  planCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  premiumCardContainer: {
    marginBottom: 16,
  },
  premiumCard: {
    backgroundColor: 'transparent',
  },
  planCardSelected: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
  },
  planHeader: {
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C77DFF', // Medium purple/magenta as shown in design
  },
  planSubtitle: {
    fontSize: 18,
    color: '#C77DFF', // Medium purple/magenta as shown in design
    fontWeight: '600',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featuresLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  priceSection: {
    marginBottom: 16,
  },
  priceText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  premiumPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  premiumPriceSubtext: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

