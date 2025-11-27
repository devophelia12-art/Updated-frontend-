import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function VoiceSettingsScreen() {
  const [selectedVoice, setSelectedVoice] = useState<'female' | 'male' | null>(null);

  // Load saved voice preference
  React.useEffect(() => {
    loadVoicePreference();
  }, []);

  const loadVoicePreference = async () => {
    try {
      const savedVoice = await AsyncStorage.getItem('selectedVoice');
      if (savedVoice) {
        setSelectedVoice(savedVoice as 'female' | 'male');
      } else {
        // Default to male if no preference is saved
        setSelectedVoice('male');
      }
    } catch (error) {
      console.error('Error loading voice preference:', error);
      // Default to male on error
      setSelectedVoice('male');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleVoiceSelect = (voice: 'female' | 'male') => {
    setSelectedVoice(voice);
  };

  const handleSelect = async () => {
    if (!selectedVoice) {
      return;
    }

    try {
      // Save voice preference
      await AsyncStorage.setItem('selectedVoice', selectedVoice);
      
      // Navigate back to settings
      router.back();
    } catch (error) {
      console.error('Error saving voice preference:', error);
      Alert.alert('Error', 'Failed to save voice preference. Please try again.');
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Voice Settings</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.subtitle}>Customise voice output.</Text>
          </View>

          {/* Voice Selection Options */}
          <View style={styles.voiceOptions}>
          <TouchableOpacity
            style={[
              styles.voiceCard,
              selectedVoice === 'female' && styles.voiceCardSelected,
            ]}
            onPress={() => handleVoiceSelect('female')}
          >
            <Text style={styles.voiceCardText}>Female Voice</Text>
            {selectedVoice === 'female' && (
              <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.voiceCard,
              selectedVoice === 'male' && styles.voiceCardSelected,
            ]}
            onPress={() => handleVoiceSelect('male')}
          >
            <Text style={styles.voiceCardText}>Male Voice</Text>
            {selectedVoice === 'male' && (
              <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />
            )}
          </TouchableOpacity>
          </View>

          {/* Select Button - Fixed at bottom */}
          <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.selectButton,
              !selectedVoice && styles.selectButtonDisabled,
            ]}
            onPress={handleSelect}
            disabled={!selectedVoice}
          >
            <Text style={[
              styles.selectButtonText,
              !selectedVoice && styles.selectButtonTextDisabled,
            ]}>
              Select
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
  mainContainer: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginBottom: 0,
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
  titleSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#B0B0B0',
  },
  voiceOptions: {
    flex: 1,
    paddingHorizontal: 20,
  },
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  voiceCardSelected: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  voiceCardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  selectButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.5,
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  selectButtonTextDisabled: {
    color: '#999999',
  },
});

