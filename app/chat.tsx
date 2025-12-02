// ChatScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../config/api';

const STORAGE_KEY = '@ophelia_selected_model';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Local quick responses for common queries
const QUICK_RESPONSES = {
  'hello': 'Hi there!',
  'hi': 'Hello!',
  'how are you': 'I\'m doing great!',
  'what time': new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  'thank you': 'You\'re welcome!',
  'thanks': 'No problem!',
  'bye': 'Goodbye!',
  'goodbye': 'See you later!',
  'help': 'How can I assist you?',
  'weather': 'Check your weather app!',
  'name': 'I\'m Ophelia, your AI assistant.',
};

const getQuickResponse = (text: string): string | null => {
  const lowerText = text.toLowerCase().trim();
  for (const [key, response] of Object.entries(QUICK_RESPONSES)) {
    if (lowerText.includes(key)) {
      return response;
    }
  }
  return null;
};

const limitResponse = (text: string, maxChars: number = 40): string => {
  if (text.length <= maxChars) return text;
  const truncated = text.substring(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  isTyping?: boolean;
}

/* Typing dots animation component */
const TypingDots: React.FC = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, [dot1, dot2, dot3]);

  const getStyle = (dot: Animated.Value) => ({
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Animated.Text style={[{ fontSize: 20, color: '#fff', marginHorizontal: 2 }, getStyle(dot1)]}>•</Animated.Text>
      <Animated.Text style={[{ fontSize: 20, color: '#fff', marginHorizontal: 2 }, getStyle(dot2)]}>•</Animated.Text>
      <Animated.Text style={[{ fontSize: 20, color: '#fff', marginHorizontal: 2 }, getStyle(dot3)]}>•</Animated.Text>
    </View>
  );
};

/* Minimal markdown renderer for **bold** text */
const MarkdownText: React.FC<{ text: string; style?: any }> = ({ text, style }) => {
  const parseMarkdown = (txt: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    const boldRegex = /\*\*([^*]+?)\*\*/g;
    let match;
    while ((match = boldRegex.exec(txt)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = txt.substring(lastIndex, match.index);
        if (beforeText) parts.push(beforeText);
      }
      parts.push(
        <Text key={key++} style={{ fontWeight: 'bold' }}>
          {match[1]}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < txt.length) {
      parts.push(txt.substring(lastIndex));
    }
    if (parts.length === 0) return [txt];
    return parts;
  };
  return <Text style={style}>{parseMarkdown(text)}</Text>;
};

/* Animated message wrapper */
const AnimatedMessage: React.FC<{ message: Message; isUser: boolean }> = ({ message, isUser }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!isUser && !message.isTyping) {
      opacity.setValue(0);
      translateY.setValue(30);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 6, tension: 100, useNativeDriver: true }),
      ]).start();
    }
  }, [message.id, isUser, message.isTyping, opacity, translateY]);

  const animatedStyle = isUser || message.isTyping ? {} : { opacity, transform: [{ translateY }] };

  return (
    <Animated.View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage, animatedStyle]}>
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {message.isTyping ? (
          <TypingDots />
        ) : (
          <>
            <MarkdownText text={message.text} style={styles.messageText} />
            <Text style={styles.messageTime}>{message.timestamp}</Text>
          </>
        )}
      </View>
    </Animated.View>
  );
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedModel, setSelectedModel] = useState('grok');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showFullScreenVocal, setShowFullScreenVocal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const scrollViewRef = useRef<ScrollView | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const textInputRef = useRef<TextInput | null>(null);

  const auth = useAuth();
  const { selectedLanguage } = useLanguage();
  const { chatGPT, gemini, grok, voiceChat, voiceToText } = auth || {};
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'female' | 'male'>('male');

  // Load saved preferences
  useFocusEffect(
    React.useCallback(() => {
      const loadPreferences = async () => {
        try {
          const savedModel = await AsyncStorage.getItem(STORAGE_KEY);
          if (savedModel) setSelectedModel(savedModel);
          const savedVoice = await AsyncStorage.getItem('selectedVoice');
          if (savedVoice === 'female' || savedVoice === 'male') setSelectedVoice(savedVoice);
        } catch (err) {
          console.error('Failed to load preferences', err);
        }
      };
      loadPreferences();
    }, [])
  );

  // helper: scroll to end (multiple tries for keyboard)
  const scrollToEnd = () => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 80);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 250);
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 450);
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      scrollToEnd();
    });
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => {
      // no-op
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length]);

  // Send message
  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || !chatGPT) return;

    Keyboard.dismiss();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMessage]);
    scrollToEnd();

    const typingId = (Date.now() + 1).toString();
    const typingMsg: Message = { id: typingId, text: '', isUser: false, timestamp: '', isTyping: true };
    setMessages(prev => [...prev, typingMsg]);
    scrollToEnd();

    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      let response;
      const language = selectedLanguage || 'en';
      if (selectedModel === 'gpt4' && chatGPT) response = await chatGPT(messageText, language);
      else if (selectedModel === 'gemini-pro' && gemini) response = await gemini(messageText, language);
      else if (selectedModel === 'grok' && grok) response = await grok(messageText, language);

      const aiResponse: Message = {
        id: (Date.now() + 2).toString(),
        text: response?.response || response?.message || 'Sorry, I could not process your request.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => prev.filter(m => m.id !== typingId).concat(aiResponse));
      scrollToEnd();
    } catch (err) {
      console.error('Chat API Error:', err);
      const errMsg: Message = {
        id: (Date.now() + 2).toString(),
        text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => prev.filter(m => m.id !== typingId).concat(errMsg));
    } finally {
      setIsLoading(false);
    }
  };

  // Settings navigation
  const handleSettings = () => router.push('/settings');

  // Voice modal open
  const handleVocalPress = () => {
    Keyboard.dismiss();
    setTimeout(() => setShowVoiceModal(true), Platform.OS === 'ios' ? 300 : 200);
  };

  // Close modal + cleanup
  const closeVoiceModal = async () => {
    try {
      Speech.stop();
    } catch (e) {}
    try {
      if (currentSoundRef.current) {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
        currentSoundRef.current = null;
      }
    } catch (e) {}
    setShowVoiceModal(false);
    setVoiceTranscript('');
    setVoiceResponse('');
    if (isRecording && recording) {
      try {
        setIsRecording(false);
        const status = await recording.getStatusAsync();
        if (status.isRecording) await recording.stopAndUnloadAsync();
        else await recording.unloadAsync();
      } catch (err) {
        console.error('Error stopping recording on modal close:', err);
      }
      setRecording(null);
    }
  };

  // Pulse animation for recording
  useEffect(() => {
    if (isRecording && (showVoiceModal || showFullScreenVocal)) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isRecording, showVoiceModal, showFullScreenVocal, pulseAnim]);

  // Voice helpers (start/stop) - keep your original behavior (use auth.voiceChat/voiceToText)
  const handleVoicePress = async () => {
    if (showVoiceModal) return;
    if (isLoading || isTranscribing) return;
    try {
      if (isRecording) await stopRecordingAndTranscribe();
      else await startRecording();
    } catch (err) {
      console.error('Voice error:', err);
      setIsRecording(false);
      setRecording(null);
      setIsTranscribing(false);
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!recording) {
      setIsRecording(false);
      return;
    }
    const r = recording;
    setIsRecording(false);
    setRecording(null);
    setIsTranscribing(true);

    try {
      const status = await r.getStatusAsync();
      if (status.isRecording) await r.stopAndUnloadAsync();
      else await r.unloadAsync();

      const uri = r.getURI();
      if (uri) {
        try {
          const transcribedText = await (voiceToText ? voiceToText(uri) : Promise.resolve(''));
          if (transcribedText && transcribedText.trim()) {
            setInputText(transcribedText.trim());
            textInputRef.current?.focus();
          } else {
            Alert.alert('No text', 'No text was transcribed. Please try again.');
          }
        } catch (transErr) {
          console.error('Voice-to-text error:', transErr);
          Alert.alert('Transcription failed', transErr instanceof Error ? transErr.message : 'Failed to transcribe audio');
        }
      } else {
        Alert.alert('Recording failed', 'Recording URI missing. Try again.');
      }
    } catch (err) {
      console.error('Failed to process voice recording:', err);
      Alert.alert('Error', 'Failed to process recording. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      if (isRecording) return;

      try {
        Speech.stop();
      } catch (e) {}

      try {
        if (currentSoundRef.current) {
          await currentSoundRef.current.stopAsync();
          await currentSoundRef.current.unloadAsync();
          currentSoundRef.current = null;
        }
      } catch (e) {}

      if (recording) {
        try {
          const s = await recording.getStatusAsync();
          if (s.isRecording) await recording.stopAndUnloadAsync();
          else await recording.unloadAsync();
        } catch (e) {}
        setRecording(null);
        setIsRecording(false);
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Microphone permission required', 'Please grant microphone permission in settings.');
        return;
      }

      // setup audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // small delay to stabilize
      await new Promise(res => setTimeout(res, 100));

      const { recording: newRecording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setIsRecording(false);
      setRecording(null);
      try {
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false });
      } catch (e) {}
      if (err instanceof Error && /Only one Recording/.test(err.message)) {
        Alert.alert('Please wait', 'Previous recording is still cleaning up. Try again in a moment.');
      }
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      setIsRecording(false);
      return;
    }

    const r = recording;
    setIsRecording(false);
    setRecording(null);

    try {
      const status = await r.getStatusAsync();
      if (status.isRecording) await r.stopAndUnloadAsync();
      else await r.unloadAsync();

      const uri = r.getURI();
      if (uri && voiceChat) {
        setIsLoading(true);
        try {
          const language = selectedLanguage || 'en';
          const result = await voiceChat(uri, selectedVoice, language);

          const userText = result.user_text || 'Voice message';
          let responseText = result.response_text || 'Sorry, I could not process your voice message.';
          
          // Check for quick local response first
          const quickResponse = getQuickResponse(userText);
          if (quickResponse) {
            responseText = quickResponse;
          } else {
            // Limit response to 40 characters for faster voice synthesis
            responseText = limitResponse(responseText, 40);
          }

          setVoiceTranscript(userText);
          setVoiceResponse(responseText);

          const userMessage: Message = {
            id: Date.now().toString(),
            text: userText,
            isUser: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: responseText,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages(prev => [...prev, userMessage, aiMessage]);

          if (result.audio_url) {
            try {
              if (currentSoundRef.current) {
                try {
                  await currentSoundRef.current.stopAsync();
                  await currentSoundRef.current.unloadAsync();
                } catch (e) {}
              }
              const audioUrl = `${API_BASE_URL}${result.audio_url}`;
              await Audio.setAudioModeAsync({
                allowsRecordingIOS: false,
                playsInSilentModeIOS: true,
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
                playThroughEarpieceAndroid: false,
              });
              const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true, volume: 1.0 });
              currentSoundRef.current = sound;
              sound.setOnPlaybackStatusUpdate(status => {
                if (status.isLoaded && status.didJustFinish) {
                  sound.unloadAsync();
                  if (currentSoundRef.current === sound) currentSoundRef.current = null;
                }
              });
            } catch (audioErr) {
              console.error('Failed to play audio:', audioErr);
            }
          }
          setTimeout(() => {
            setVoiceTranscript('');
            setVoiceResponse('');
          }, 500);
        } catch (voiceErr) {
          console.error('Voice chat error:', voiceErr);
          
          // Fallback to local response on network error
          const fallbackResponse = 'Sorry, network issue. Try again.';
          setVoiceResponse(fallbackResponse);
          
          const errorMessage: Message = {
            id: Date.now().toString(),
            text: fallbackResponse,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages(prev => [...prev, errorMessage]);
          
          setTimeout(() => {
            setVoiceTranscript('');
            setVoiceResponse('');
          }, 2000);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('Missing URI or voiceChat', { uri: !!uri, voiceChat: !!voiceChat });
      }
    } catch (err) {
      console.error('Failed to stop recording:', err);
      setIsLoading(false);
    }
  };

  // UI
  return (
    <ImageBackground source={require('../assets/images/background.png')} style={styles.background} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      <View style={styles.centerOrbWrapper} pointerEvents="none">
        <Image source={require('../assets/images/vocal_circle.png')} style={styles.centerOrb} resizeMode="contain" />
      </View>

      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>OPHELIA</Text>
            <Text style={styles.headerSubtitle}>{selectedModel.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={handleSettings} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <View style={styles.messagesWrapper}>
          <ScrollView ref={scrollViewRef} style={styles.messagesContainer} contentContainerStyle={{ paddingBottom: 16 }} keyboardShouldPersistTaps="handled">
            {messages.map(msg => <AnimatedMessage key={msg.id} message={msg} isUser={msg.isUser} />)}
          </ScrollView>
        </View>

        {/* Input bar - Fixed at bottom */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <View style={styles.inputWrapperBar}>
            <LinearGradient colors={['transparent', 'transparent']} style={styles.inputContainer}>
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                placeholder="Ask here..."
                placeholderTextColor="#FFFFFF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendDisabled]} 
                onPress={handleSendMessage} 
                disabled={!inputText.trim() || isLoading}
              >
                <Ionicons 
                  name="paper-plane-outline" 
                  size={22} 
                  color={(!inputText.trim() || isLoading) ? "#999" : "#212121"} 
                />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.voiceButton, isRecording && styles.recordingButton]} onPress={handleVoicePress}>
                <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={22} color="#212121" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.vocalButton} onPress={handleVocalPress}>
                <View style={styles.waveformContainer}>
                  <View style={[styles.waveBar, styles.waveBar1, { marginRight: 3 }]} />
                  <View style={[styles.waveBar, styles.waveBar2, { marginRight: 3 }]} />
                  <View style={[styles.waveBar, styles.waveBar3]} />
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>

        {/* Voice Modal */}
        {showVoiceModal && (
          <View style={styles.voiceModal}>
            <TouchableOpacity style={styles.closeButton} onPress={closeVoiceModal}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>

            <View style={styles.voiceContent}>
              <Text style={styles.voiceTitle}>Voice Assistant</Text>

              {voiceTranscript ? (
                <View style={styles.transcriptContainer}>
                  <Text style={styles.transcriptLabel}>You said:</Text>
                  <Text style={styles.transcriptText}>{voiceTranscript}</Text>
                </View>
              ) : null}

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Animated.View style={[styles.loadingDot, { opacity: pulseAnim }]} />
                  <Text style={styles.loadingText}>Processing...</Text>
                </View>
              ) : voiceResponse ? (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseLabel}>Ophelia:</Text>
                  <Text style={styles.responseText}>{voiceResponse}</Text>
                </View>
              ) : (
                <>
                  <Animated.View style={[styles.voiceCircle, { transform: [{ scale: pulseAnim }] }]} />

                  <Text style={styles.voiceStatus}>{isRecording ? 'Listening...' : 'Tap to speak'}</Text>

                  <TouchableOpacity style={[styles.voiceRecordButton, isRecording && styles.voiceRecordingButton]} onPress={isRecording ? stopRecording : startRecording}>
                    <Ionicons name={isRecording ? 'stop-circle' : 'mic'} size={40} color="white" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

/* Styles */
const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#D1D1D1', marginTop: 2 },
  settingsButton: { padding: 8 },

  messagesWrapper: { flex: 1 },
  messagesContainer: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },

  messageContainer: { marginBottom: 12 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  userMessage: { alignSelf: 'flex-end' },
  aiMessage: { alignSelf: 'flex-start' },
  userBubble: { backgroundColor: '#8B5CF6' },
  aiBubble: { backgroundColor: 'rgba(42,42,42,0.9)' },

  messageText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  messageTime: { color: '#B0B0B0', fontSize: 12, marginTop: 6 },

  /* Input bar wrapper fixed at bottom */
  inputWrapperBar: {
    paddingHorizontal: 0,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: 'transparent',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', // semi-transparent input background
    width: '100%',
  },

  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    maxHeight: 120,
  },

  sendButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.5,
  },

  voiceButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: '#ffdede',
    borderColor: '#ff4444',
  },

  vocalButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 20 },
  waveBar: { width: 3, backgroundColor: '#212121', borderRadius: 2 },
  waveBar1: { height: 12 },
  waveBar2: { height: 18 },
  waveBar3: { height: 14 },

  /* Voice modal */
  voiceModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButton: { position: 'absolute', top: 48, right: 20, padding: 10, zIndex: 1001 },
  voiceContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },

  voiceTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 28 },
  voiceCircle: { width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(139,92,246,0.18)', justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: 'rgba(139,92,246,0.36)' },
  voiceStatus: { fontSize: 16, color: 'white', marginBottom: 20, textAlign: 'center' },
  voiceRecordButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(139,92,246,0.84)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.28)' },
  voiceRecordingButton: { backgroundColor: '#ff4444' },

  transcriptContainer: { backgroundColor: 'rgba(139,92,246,0.12)', padding: 14, borderRadius: 10, marginBottom: 14, maxWidth: '90%' },
  transcriptLabel: { fontSize: 13, color: '#D0CDEB', marginBottom: 6 },
  transcriptText: { fontSize: 15, color: 'white', lineHeight: 20 },

  loadingContainer: { alignItems: 'center', marginVertical: 18 },
  loadingDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#8B5CF6', marginBottom: 8 },
  loadingText: { fontSize: 14, color: 'white' },

  responseContainer: { backgroundColor: 'rgba(42,42,42,0.85)', padding: 14, borderRadius: 10, marginTop: 12, maxWidth: '90%' },
  responseLabel: { fontSize: 13, color: '#B0B0B0', marginBottom: 6 },
  responseText: { fontSize: 15, color: 'white', lineHeight: 20 },

  /* center orb background */
  centerOrbWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -75 }],
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  centerOrb: { width: 150, height: 150, opacity: 0.85 },
});
