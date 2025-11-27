import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { router } from 'expo-router';
import { useLanguage } from '../contexts/LanguageContext';

const languages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'fr', name: 'Français', nativeName: 'French' },
  { code: 'es', name: 'Español', nativeName: 'Spanish' },
  { code: 'de', name: 'Deutsch', nativeName: 'German' },
  { code: 'ko', name: '한국어', nativeName: 'Korean' },
  { code: 'it', name: 'Italiano', nativeName: 'Italian' },
];

export default function LanguageScreen() {
  const [localSelectedLanguage, setLocalSelectedLanguage] = useState('en');
  const { setSelectedLanguage } = useLanguage();

  const handleLanguageSelect = (languageCode: string) => {
    setLocalSelectedLanguage(languageCode);
  };

  const handleProceed = () => {
    setSelectedLanguage(localSelectedLanguage);
    // Navigate to login screen
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('@/assets/images/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Select Language</Text>
            <Text style={styles.subtitle}>Choose your preferred language</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Language Options */}
            <View style={styles.languageList}>
              {languages.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    localSelectedLanguage === language.code && styles.selectedLanguage
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                >
                  <Text style={[
                    styles.languageName,
                    localSelectedLanguage === language.code && styles.selectedLanguageText
                  ]}>
                    {language.name}
                  </Text>
                  <Text style={[
                    styles.languageNative,
                    localSelectedLanguage === language.code && styles.selectedLanguageSubtext
                  ]}>
                    {language.nativeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Proceed Button - Fixed at bottom */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.proceedButton} onPress={handleProceed}>
              <Text style={styles.proceedButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  mainContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.8,
  },
  languageList: {
    flex: 1,
    gap: 16,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  languageOption: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  selectedLanguage: {
    borderColor: '#FFFFFF',
    backgroundColor: '#2D1B69',
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  languageNative: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedLanguageText: {
    color: '#FFFFFF',
  },
  selectedLanguageSubtext: {
    color: '#D1D5DB',
  },
  proceedButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  proceedButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
