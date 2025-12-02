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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Audio } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from '../config/api';

const STORAGE_KEY = '@ophelia_selected_model';

// Quick responses
const QUICK_RESPONSES: Record<string, string> = {
  hello: 'Hi there!',
  hi: 'Hello!',
  'how are you': "I'm doing great!",
  'what time': new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  'thank you': "You're welcome!",
  thanks: 'No problem!',
  bye: 'Goodbye!',
  goodbye: 'See you later!',
  help: 'How can I assist you?',
  weather: 'Check your weather app!',
  name: "I'm Ophelia, your AI assistant.",
};

const getQuickResponse = (text: string): string | null => {
  const lower = text.toLowerCase().trim();
  for (const [key, value] of Object.entries(QUICK_RESPONSES)) {
    if (lower.includes(key)) return value;
  }
  return null;
};

const limitResponse = (text: string, max = 40): string => {
  if (text.length <= max) return text;
  const cut = text.substring(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return lastSpace > 10 ? cut.substring(0, lastSpace) + '...' : cut + '...';
};

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  isTyping?: boolean;
}

// Recording options with metering
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
    audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  ios: {
    extension: '.m4a',
    audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: 128000,
    outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
  },
  isMeteringEnabled: true,
};

// VAD thresholds
const VAD_THRESHOLD = -38;
const SILENCE_DURATION = 1500;
const MIN_RECORD_DURATION = 1800;
// When user speaks during playback (interruption)
const INTERRUPT_THRESHOLD = -25;

type RecordMode = 'idle' | 'simple' | 'assistant';

/* Typing dots */
const TypingDots: React.FC = () => {
  const dots = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  useEffect(() => {
    dots.forEach((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      ).start()
    );
  }, []);

  const style = (dot: Animated.Value) => ({
    opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [{ translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {dots.map((d, i) => (
        <Animated.Text key={i} style={[{ fontSize: 20, color: '#fff', marginHorizontal: 2 }, style(d)]}>
          •
        </Animated.Text>
      ))}
    </View>
  );
};

/* Animated message */
const AnimatedMessage: React.FC<{ message: Message; isUser: boolean }> = ({ message, isUser }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    if (!isUser && !message.isTyping) {
      opacity.setValue(0);
      translateY.setValue(30);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, friction: 7, useNativeDriver: true }),
      ]).start();
    }
  }, [message.id]);

  const animatedStyle = isUser || message.isTyping ? {} : { opacity, transform: [{ translateY }] };

  return (
    <Animated.View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage, animatedStyle]}>
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {message.isTyping ? (
          <TypingDots />
        ) : (
          <>
            <Text style={styles.messageText}>{message.text}</Text>
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

  // Voice assistant modal
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Simple mic→text UI state
  const [isRecordingSimpleUI, setIsRecordingSimpleUI] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Single global recording + mode (assistant or simple)
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [recordMode, setRecordMode] = useState<RecordMode>('idle');
  const isCreatingRecordingRef = useRef(false);

  // Separate recording just for interruption detection during playback
  const monitorRecRef = useRef<Audio.Recording | null>(null);
  const isHandlingInterruptRef = useRef(false);

  const currentSound = useRef<Audio.Sound | null>(null);

  const [lastVoiceActivity, setLastVoiceActivity] = useState(0);
  const [recordStartTime, setRecordStartTime] = useState(0);

  const auth = useAuth();
  const { selectedLanguage } = useLanguage();
  const { voiceChat, voiceToText } = auth || {};
  const [selectedVoice] = useState<'female' | 'male'>('male');

  // Load saved model
  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        const savedModel = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedModel) setSelectedModel(savedModel);
      };
      load();
    }, [])
  );

  // Scroll helpers
  const scrollToEnd = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
  };

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      scrollToEnd
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {}
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length]);

  // Pulse animation for center orb in modal
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (showVoiceModal && (isListening || isThinking || isSpeaking)) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    return () => {
      loop?.stop();
    };
  }, [showVoiceModal, isListening, isThinking, isSpeaking, pulseAnim]);

  // Silence detection (assistant mode only)
  useEffect(() => {
    if (!isListening || recordMode !== 'assistant') return;
    const id = setInterval(() => {
      const silentFor = Date.now() - lastVoiceActivity;
      const duration = Date.now() - recordStartTime;
      if (silentFor > SILENCE_DURATION && duration > MIN_RECORD_DURATION) {
        stopAndProcessAssistant();
      }
    }, 250);
    return () => clearInterval(id);
  }, [isListening, recordMode, lastVoiceActivity, recordStartTime]);

  // Auto-start listening when modal open
  useEffect(() => {
    if (showVoiceModal && !isListening && !isThinking && !isSpeaking) {
      startListeningAssistant();
    }
  }, [showVoiceModal]);

  // ============== CLEANUP HELPERS ==============

  const destroyRecording = async () => {
    const rec = recordingRef.current;
    recordingRef.current = null;
    setRecordMode('idle');

    if (!rec) return;

    try {
      let status: Audio.RecordingStatus | null = null;
      try {
        status = await rec.getStatusAsync();
      } catch (e) {
        console.log('getStatusAsync failed (safe to ignore):', e);
      }

      if (status && status.isRecording) {
        try {
          await rec.stopAndUnloadAsync();
        } catch (e) {
          console.log('stopAndUnloadAsync failed (safe):', e);
        }
      } else {
        try {
          await rec.unloadAsync();
        } catch (e) {
          console.log('unloadAsync failed (safe):', e);
        }
      }
    } catch (e) {
      console.log('destroyRecording outer error (ignored):', e);
    }
  };

  const destroyMonitorRecording = async () => {
    const rec = monitorRecRef.current;
    monitorRecRef.current = null;
    if (!rec) return;
    try {
      let status: Audio.RecordingStatus | null = null;
      try {
        status = await rec.getStatusAsync();
      } catch (e) {
        console.log('monitor getStatusAsync failed:', e);
      }
      if (status && status.isRecording) {
        try {
          await rec.stopAndUnloadAsync();
        } catch (e) {
          console.log('monitor stopAndUnloadAsync failed:', e);
        }
      } else {
        try {
          await rec.unloadAsync();
        } catch (e) {
          console.log('monitor unloadAsync failed:', e);
        }
      }
    } catch (e) {
      console.log('destroyMonitorRecording error:', e);
    }
  };

  const destroySound = async () => {
    if (!currentSound.current) return;
    try {
      await currentSound.current.stopAsync();
      await currentSound.current.unloadAsync();
    } catch (e) {
      console.log('destroySound error:', e);
    } finally {
      currentSound.current = null;
    }
  };

  // ============== TEXT CHAT (UNCHANGED) ==============

  const handleSendMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    Keyboard.dismiss();

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: Date.now().toString(), text, isUser: true, timestamp: now };

    const quick = getQuickResponse(text);
    const aiText = quick || limitResponse(`You said: ${text}`, 80);
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: aiText,
      isUser: false,
      timestamp: now,
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setInputText('');
  };

  const handleSettings = () => router.push('/settings');

  // ============== SIMPLE MIC → TEXT (MIC ICON) ==============

  const handleMicPress = async () => {
    if (isTranscribing) return;

    if (isRecordingSimpleUI) {
      await stopSimpleRecordingAndTranscribe();
    } else {
      await startSimpleRecording();
    }
  };

  const startSimpleRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Not supported', 'Recording is not supported on web browser.');
        return;
      }

      if (showVoiceModal) {
        Alert.alert('Busy', 'Voice assistant is active. Close it first.');
        return;
      }

      await destroyRecording();
      await destroyMonitorRecording();

      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Mic Permission', 'Please allow microphone access.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2,
        interruptionModeAndroid: 2,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecordMode('simple');
      setIsRecordingSimpleUI(true);
    } catch (err) {
      console.error('startSimpleRecording error:', err);
      Alert.alert('Error', 'Failed to start recording.');
      setIsRecordingSimpleUI(false);
      await destroyRecording();
    }
  };

  const stopSimpleRecordingAndTranscribe = async () => {
    if (!recordingRef.current || recordMode !== 'simple') {
      setIsRecordingSimpleUI(false);
      return;
    }

    const rec = recordingRef.current;
    recordingRef.current = null;
    setRecordMode('idle');
    setIsRecordingSimpleUI(false);

    try {
      const s = await rec.getStatusAsync();
      if (s.isRecording) await rec.stopAndUnloadAsync();
      else await rec.unloadAsync();

      const uri = rec.getURI();
      if (!uri) {
        Alert.alert('Error', 'Recording URI missing.');
        return;
      }

      if (!voiceToText) {
        Alert.alert('Not configured', 'voiceToText is not available.');
        return;
      }

      setIsTranscribing(true);
      const text = await voiceToText(uri);
      if (text && text.trim()) {
        setInputText(text.trim());
      } else {
        Alert.alert('No text', 'Could not detect speech. Try again.');
      }
    } catch (err) {
      console.error('stopSimpleRecordingAndTranscribe error:', err);
      Alert.alert('Error', 'Failed to process recording.');
    } finally {
      setIsTranscribing(false);
      await destroyRecording();
    }
  };

  // ============== VOICE ASSISTANT (WAVEFORM ICON) ==============

  const handleVocalPress = () => {
    Keyboard.dismiss();
    setTimeout(() => setShowVoiceModal(true), 200);
  };

  const startListeningAssistant = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Not supported', 'Voice assistant only works on Android/iOS.');
        return;
      }

      if (isCreatingRecordingRef.current) {
        console.log('⚠️ startListeningAssistant: already starting, skip');
        return;
      }
      isCreatingRecordingRef.current = true;

      if (recordMode !== 'idle') {
        await destroyRecording();
      }
      await destroyMonitorRecording();

      const existing = await Audio.getPermissionsAsync();
      let perm = existing;
      if (existing.status !== 'granted') {
        perm = await Audio.requestPermissionsAsync();
      }

      if (perm.status !== 'granted') {
        Alert.alert(
          'Microphone Permission',
          `Microphone access is not granted (status: ${perm.status}). Please enable it in settings.`
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2,
        interruptionModeAndroid: 2,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      console.log('🎙 Creating assistant recording…');
      const { recording } = await Audio.Recording.createAsync(RECORDING_OPTIONS);

      recording.setOnRecordingStatusUpdate((status: Audio.RecordingStatus) => {
        if (
          status.isRecording &&
          typeof status.metering === 'number' &&
          status.metering > VAD_THRESHOLD
        ) {
          setLastVoiceActivity(Date.now());
        }
      });

      recordingRef.current = recording;
      setRecordMode('assistant');
      setRecordStartTime(Date.now());
      setLastVoiceActivity(Date.now());
      setIsListening(true);
      setIsThinking(false);
      setIsSpeaking(false);
      console.log('✅ Assistant listening started');
    } catch (err: any) {
      console.error('❌ Failed to start listening assistant:', err);
      Alert.alert(
        'Microphone Error',
        'Unable to start listening.\n\n' + (err?.message || 'Unknown error')
      );
      await destroyRecording();
      setIsListening(false);
    } finally {
      isCreatingRecordingRef.current = false;
    }
  };

  const stopAndProcessAssistant = async () => {
    if (!recordingRef.current || recordMode !== 'assistant') return;

    const rec = recordingRef.current;
    recordingRef.current = null;
    setRecordMode('idle');
    setIsListening(false);
    setIsThinking(true);

    try {
      const s = await rec.getStatusAsync();
      if (s.isRecording) await rec.stopAndUnloadAsync();
      else await rec.unloadAsync();

      const uri = rec.getURI();
      if (!uri || !voiceChat) {
        setIsThinking(false);
        return;
      }

      const language = selectedLanguage || 'en';
      const result = await voiceChat(uri, selectedVoice, language);

      const userText = result.user_text || '…';
      let aiText = result.response_text || "I didn't catch that.";

      const quick = getQuickResponse(userText);
      if (quick) aiText = quick;
      else aiText = limitResponse(aiText);

      setVoiceTranscript(userText);
      setVoiceResponse(aiText);

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), text: userText, isUser: true, timestamp: now },
        { id: (Date.now() + 1).toString(), text: aiText, isUser: false, timestamp: now },
      ]);

      if (result.audio_url) {
        await playAIResponseAssistant(`${API_BASE_URL}${result.audio_url}`);
      } else {
        setIsThinking(false);
        setVoiceTranscript('');
        setVoiceResponse('');
        if (showVoiceModal) startListeningAssistant();
      }
    } catch (err) {
      console.error('Voice assistant error:', err);
      setIsThinking(false);
      if (showVoiceModal) startListeningAssistant();
    }
  };

  const handlePlaybackInterrupted = async () => {
    if (isHandlingInterruptRef.current) return;
    isHandlingInterruptRef.current = true;
    console.log('🛑 User interruption detected during playback');
    try {
      await destroySound();
      await destroyMonitorRecording();
      setIsSpeaking(false);
      setVoiceTranscript('');
      setVoiceResponse('');
      if (showVoiceModal) {
        await startListeningAssistant();
      }
    } catch (e) {
      console.log('handlePlaybackInterrupted error:', e);
    } finally {
      isHandlingInterruptRef.current = false;
    }
  };

  const playAIResponseAssistant = async (url: string) => {
    try {
      await destroyRecording();        // no assistant recording while speaking
      await destroySound();
      await destroyMonitorRecording();

      setIsSpeaking(true);
      setIsThinking(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 2,
        interruptionModeAndroid: 2,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: true,
      });

      console.log('🎧 Playing URL:', url);

      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      currentSound.current = sound;

      // Start a separate recording just to detect user talking (interruption)
      const { recording: monitorRec } = await Audio.Recording.createAsync({
        ...RECORDING_OPTIONS,
        isMeteringEnabled: true,
      });
      monitorRecRef.current = monitorRec;

      monitorRec.setOnRecordingStatusUpdate((status: Audio.RecordingStatus) => {
        if (
          status.isRecording &&
          typeof status.metering === 'number' &&
          status.metering > INTERRUPT_THRESHOLD
        ) {
          // User started talking → interrupt
          handlePlaybackInterrupted();
        }
      });

      sound.setOnPlaybackStatusUpdate(async (status: any) => {
        if (!status.isLoaded) return;
        if (status.didJustFinish) {
          console.log('🔚 Playback finished');
          await destroyMonitorRecording();
          await destroySound();
          setIsSpeaking(false);
          setVoiceTranscript('');
          setVoiceResponse('');
          if (showVoiceModal) {
            startListeningAssistant();
          }
        }
      });
    } catch (err) {
      console.log('playAIResponseAssistant error:', err);
      setIsSpeaking(false);
      await destroyMonitorRecording();
      await destroySound();
      if (showVoiceModal) startListeningAssistant();
    }
  };

  const closeVoiceModal = async () => {
    try {
      await destroyRecording();
      await destroyMonitorRecording();
      await destroySound();
    } catch (e) {
      console.log('Error closing voice modal:', e);
    } finally {
      setShowVoiceModal(false);
      setIsListening(false);
      setIsThinking(false);
      setIsSpeaking(false);
      setVoiceTranscript('');
      setVoiceResponse('');
    }
  };

  // ============== RENDER ==============

  return (
    <ImageBackground
      source={require('../assets/images/background.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.centerOrbWrapper} pointerEvents="none">
        <Image
          source={require('../assets/images/vocal_circle.png')}
          style={styles.centerOrb}
          resizeMode="contain"
        />
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

        {/* Chat + Input */}
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.messagesContainer}
            contentContainerStyle={{ paddingBottom: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(msg => (
              <AnimatedMessage key={msg.id} message={msg} isUser={msg.isUser} />
            ))}
          </ScrollView>

          {/* Input bar with 3 icons */}
          <View style={styles.inputWrapperBar}>
            <LinearGradient colors={['transparent', 'transparent']} style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Ask here..."
                placeholderTextColor="#FFFFFF"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
              />

              {/* Send icon */}
              <TouchableOpacity
                style={[styles.iconButton, !inputText.trim() && styles.disabledButton]}
                onPress={handleSendMessage}
                disabled={!inputText.trim()}
              >
                <Ionicons
                  name="paper-plane-outline"
                  size={22}
                  color={!inputText.trim() ? '#999' : '#212121'}
                />
              </TouchableOpacity>

              {/* Mic icon (simple voice→text) */}
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  isRecordingSimpleUI && { backgroundColor: '#ffdede' },
                ]}
                onPress={handleMicPress}
                disabled={isTranscribing}
              >
                <Ionicons
                  name={isRecordingSimpleUI ? 'mic' : 'mic-outline'}
                  size={22}
                  color="#212121"
                />
              </TouchableOpacity>

              {/* Waveform icon (full voice assistant) */}
              <TouchableOpacity style={styles.vocalButton} onPress={handleVocalPress}>
                <View className="wave">
                  <View style={styles.waveformContainer}>
                    <View style={[styles.waveBar, styles.waveBar1, { marginRight: 3 }]} />
                    <View style={[styles.waveBar, styles.waveBar2, { marginRight: 3 }]} />
                    <View style={[styles.waveBar, styles.waveBar3]} />
                  </View>
                </View>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </KeyboardAvoidingView>

        {/* Voice Assistant Modal */}
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

              {voiceResponse ? (
                <View style={styles.responseContainer}>
                  <Text style={styles.responseLabel}>Ophelia:</Text>
                  <Text style={styles.responseText}>{voiceResponse}</Text>
                </View>
              ) : null}

              <Animated.View
                style={[styles.voiceCircle, { transform: [{ scale: pulseAnim }] }]}
              />

              <Text style={styles.voiceStatus}>
                {isListening
                  ? 'Listening...'
                  : isThinking
                  ? 'Thinking...'
                  : isSpeaking
                  ? 'Speaking...'
                  : 'Ready'}
              </Text>
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

  chatContainer: { flex: 1 },
  messagesContainer: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },

  messageContainer: { marginBottom: 12 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
  userMessage: { alignSelf: 'flex-end' },
  aiMessage: { alignSelf: 'flex-start' },
  userBubble: { backgroundColor: '#8B5CF6' },
  aiBubble: { backgroundColor: 'rgba(42,42,42,0.9)' },
  messageText: { color: '#fff', fontSize: 16, lineHeight: 22 },
  messageTime: { color: '#B0B0B0', fontSize: 12, marginTop: 6 },

  inputWrapperBar: {
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: '100%',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    paddingHorizontal: 12,
    maxHeight: 120,
  },

  iconButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.5 },

  vocalButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  waveBar: { width: 3, backgroundColor: '#212121', borderRadius: 2 },
  waveBar1: { height: 12 },
  waveBar2: { height: 18 },
  waveBar3: { height: 14 },

  voiceModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButton: { position: 'absolute', top: 48, right: 20, padding: 10 },
  voiceContent: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },

  voiceTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 20 },
  voiceCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(139,92,246,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    borderWidth: 2,
    borderColor: 'rgba(139,92,246,0.36)',
  },
  voiceStatus: { fontSize: 16, color: 'white', marginTop: 20, textAlign: 'center' },

  transcriptContainer: {
    backgroundColor: 'rgba(139,92,246,0.12)',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    maxWidth: '90%',
  },
  transcriptLabel: { fontSize: 13, color: '#D0CDEB', marginBottom: 6 },
  transcriptText: { fontSize: 15, color: 'white', lineHeight: 20 },

  responseContainer: {
    backgroundColor: 'rgba(42,42,42,0.85)',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
    maxWidth: '90%',
  },
  responseLabel: { fontSize: 13, color: '#B0B0B0', marginBottom: 6 },
  responseText: { fontSize: 15, color: 'white', lineHeight: 20 },

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
