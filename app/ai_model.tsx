import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// AI Models List
const AI_MODELS = [
  {
    id: 'gpt4',
    name: 'GPT-4',
    description: 'English',
    icon: require('../assets/images/openai.png'),
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Google - Most capable',
    icon: require('../assets/images/gemini.png'),
  },
  {
    id: 'grok',
    name: 'Grok',
    description: 'xAI - Latest model',
    icon: require('../assets/images/Grok.png'),
  },
];

export default function AIModelScreen() {
  const [selectedModel, setSelectedModel] = useState('grok'); // Default model
  const { getText } = useLanguage();

  // Handle selection of AI model
  const handleSelect = async () => {
    try {
      await AsyncStorage.setItem('@ophelia_selected_model', selectedModel);
      console.log('Model saved successfully:', selectedModel);
      router.replace('/chat');
    } catch (error) {
      console.error('Error saving selected AI model:', error);
      router.replace('/chat');
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
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{getText('chooseAIModel')}</Text>
            <Text style={styles.subtitle}>{getText('selectPreferredAI')}</Text>
          </View>

          {/* AI Models List */}
          <View style={styles.modelsContainer}>
            {AI_MODELS.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.modelCard,
                  selectedModel === model.id && styles.selectedCard,
                ]}
                onPress={() => setSelectedModel(model.id)}
              >
                <View style={styles.modelContent}>
                  <View style={styles.iconContainer}>
                    <Image
                      source={require('../assets/images/Rectangle-AI-Model.png')}
                      style={styles.rectangleBackground}
                      resizeMode="contain"
                    />
                    <Image
                      source={model.icon}
                      style={styles.modelIcon}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.modelText}>
                    <Text style={styles.modelName}>{model.name}</Text>
                    <Text style={styles.modelDescription}>{model.description}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.infoText}>{getText('aiModelInfo')}</Text>
          </View>

          {/* Select Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.selectButton} onPress={handleSelect}>
              <Text style={styles.selectButtonText}>{getText('select')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  header: { marginBottom: 40 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: '#B0B0B0', textAlign: 'center' },
  modelsContainer: { marginBottom: 30 },
  modelCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: { borderColor: '#007AFF', backgroundColor: '#2A2A2A' },
  modelContent: { flexDirection: 'row', alignItems: 'center' },
  iconContainer: { position: 'relative', marginRight: 12, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  rectangleBackground: { position: 'absolute', width: 40, height: 40 },
  modelIcon: { width: 24, height: 24, zIndex: 1 },
  modelText: { flex: 1 },
  modelName: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  modelDescription: { fontSize: 14, color: '#B0B0B0' },
  infoContainer: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 10, marginBottom: 20 },
  infoIcon: { fontSize: 16, marginRight: 8, marginTop: 2 },
  infoText: { fontSize: 14, color: '#FFFFFF', flex: 1, lineHeight: 20 },
  buttonContainer: { paddingBottom: 20 },
  selectButton: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  selectButtonText: { fontSize: 16, fontWeight: '600', color: '#000000' },
});
