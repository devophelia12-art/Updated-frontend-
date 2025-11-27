import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, SafeAreaView, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useLanguage } from '../contexts/LanguageContext';

const STORAGE_KEY = '@ophelia_selected_model';
const AI_MODELS = [
  { id: 'gpt4', name: 'GPT-4', description: 'English', icon: require('../assets/images/openai.png') },
  { id: 'gemini-pro', name: 'Gemini Pro', description: 'Google - Most capable', icon: require('../assets/images/gemini.png') },
  { id: 'grok', name: 'Grok', description: 'xAI - Latest model', icon: require('../assets/images/Grok.png') },
];

export default function SettingsAIModelScreen() {
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const { getText } = useLanguage();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => setSelectedModel(saved || 'grok'));
  }, []);

  const handleSave = async () => {
    if (!selectedModel) return;
    await AsyncStorage.setItem(STORAGE_KEY, selectedModel);
    router.back();
  };

  return (
    <ImageBackground source={require('../assets/images/background.png')} style={styles.background}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.mainContainer}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{getText('chooseAIModel')}</Text>
            <View style={styles.placeholder} />
          </View>

          {AI_MODELS.map(model => (
          <TouchableOpacity key={model.id} style={[styles.modelCard, selectedModel === model.id && styles.selectedCard]} onPress={() => setSelectedModel(model.id)}>
            <Image source={model.icon} style={styles.modelIcon} />
            <View>
              <Text style={styles.modelName}>{model.name}</Text>
              <Text style={styles.modelDescription}>{model.description}</Text>
            </View>
            {selectedModel === model.id && <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />}
          </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.selectButton} onPress={handleSave}>
            <Text style={styles.selectButtonText}>{getText('select')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  mainContainer: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 20,
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
  modelCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, marginBottom: 12 },
  selectedCard: { borderColor: '#8B5CF6', borderWidth: 2, backgroundColor: 'rgba(139,92,246,0.1)' },
  modelIcon: { width: 40, height: 40, marginRight: 12 },
  modelName: { fontSize: 16, color: '#fff' },
  modelDescription: { fontSize: 14, color: '#B0B0B0' },
  selectButton: { backgroundColor: '#8B5CF6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  selectButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
