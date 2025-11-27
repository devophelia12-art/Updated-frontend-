import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

// Get screen dimensions for responsive design
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 375;
const isLargeScreen = SCREEN_WIDTH > 414;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  isTyping?: boolean;
}

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
  }, []);

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

// Component to render markdown-formatted text
const MarkdownText: React.FC<{ text: string; style?: any }> = ({ text, style }) => {
  // Parse markdown and create Text components
  const parseMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let key = 0;
    
    // Regex to match **bold** text (non-greedy to handle multiple instances)
    // Pattern: **text** where text doesn't contain *
    const boldRegex = /\*\*([^*]+?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = text.substring(lastIndex, match.index);
        if (beforeText) {
          parts.push(beforeText);
        }
      }
      
      // Add bold text (without the ** markers) as a nested Text component
      parts.push(
        <Text key={key++} style={{ fontWeight: 'bold' }}>
          {match[1]}
        </Text>
      );
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text after last match
    if (lastIndex < text.length) {
      const remainingText = text.substring(lastIndex);
      if (remainingText) {
        parts.push(remainingText);
      }
    }
    
    // If no markdown was found, return original text
    if (parts.length === 0) {
      return [text];
    }
    
    return parts;
  };

  const parsedContent = parseMarkdown(text);
  
  // Return a single Text component with nested Text components for formatting
  // React Native Text components handle \n naturally for line breaks
  return (
    <Text style={style}>
      {parsedContent}
    </Text>
  );
};

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
  }, [message.id, isUser, message.isTyping]);

  const animatedStyle = isUser || message.isTyping ? {} : { opacity, transform: [{ translateY }] };

  return (
    <Animated.View style={[styles.messageContainer, isUser ? styles.userMessage : styles.aiMessage, animatedStyle]}>
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {message.isTyping ? <TypingDots /> : (
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
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResponse, setVoiceResponse] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAudioTimeRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const isContinuousModeRef = useRef(false);
  const showVoiceModalRef = useRef(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  // VAD state for proper voice activity detection
  const vadStateRef = useRef({
    lastDuration: 0,
    lastActivityTime: 0,
    speechDetected: false,
    silenceStartTime: 0,
    isProcessing: false,
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const textInputRef = useRef<TextInput>(null);
  // Debounce refs to prevent double-clicks
  const lastMicButtonPressRef = useRef<number>(0);
  const isStoppingRef = useRef(false);
  const recordingStartTimeRef = useRef<number | null>(null);
  const isRecordingReadyRef = useRef(false);
  const isStartingRecordingRef = useRef(false);

  const auth = useAuth();
  const { selectedLanguage } = useLanguage();
  const { chatGPT, gemini, grok, voiceChat, voiceToText } = auth || {};
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'female' | 'male'>('male');

  // Load selected model and voice from AsyncStorage
  useFocusEffect(
    React.useCallback(() => {
      const loadPreferences = async () => {
        try {
          const savedModel = await AsyncStorage.getItem(STORAGE_KEY);
          if (savedModel) setSelectedModel(savedModel);
          
          const savedVoice = await AsyncStorage.getItem('selectedVoice');
          if (savedVoice === 'female' || savedVoice === 'male') {
            setSelectedVoice(savedVoice);
          }
        } catch (error) {
          console.error('Failed to load preferences:', error);
        }
      };
      loadPreferences();
    }, [])
  );

  // Helper function to scroll to end with multiple attempts for reliability
  const scrollToEnd = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 500);
  };

  // Auto-scroll when keyboard opens
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        scrollToEnd();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
    };
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToEnd();
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading || !chatGPT) return;

    // Dismiss keyboard when sending
    Keyboard.dismiss();

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMessage]);
    // Scroll to show user message
    scrollToEnd();

    // Add typing indicator
    const typingId = (Date.now() + 1).toString();
    const typingMsg: Message = { id: typingId, text: '', isUser: false, timestamp: '', isTyping: true };
    setMessages(prev => [...prev, typingMsg]);
    // Scroll to show typing indicator
    scrollToEnd();

    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);

    try {
      let response;
      const language = selectedLanguage || 'en';
      if (selectedModel === 'gpt4') response = await chatGPT(messageText, language);
      else if (selectedModel === 'gemini-pro' && gemini) response = await gemini(messageText, language);
      else if (selectedModel === 'grok' && grok) response = await grok(messageText, language);

      const aiResponse: Message = {
        id: (Date.now() + 2).toString(),
        text: response?.response || response?.message || 'Sorry, I could not process your request.',
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      // Remove typing indicator and add AI response
      setMessages(prev => prev.filter(m => m.id !== typingId).concat(aiResponse));
      // Auto-scroll to show new message with multiple attempts
      scrollToEnd();
    } catch (error) {
      console.error('Chat API Error:', error);
      const errMsg: Message = {
        id: (Date.now() + 2).toString(),
        text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => prev.filter(m => m.id !== typingId).concat(errMsg));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettings = () => router.push('/settings');

  const handleVocalPress = () => {
    // Close keyboard when opening vocal modal
    Keyboard.dismiss();
    // Enable continuous mode
    setIsContinuousMode(true);
    isContinuousModeRef.current = true;
    // Wait for keyboard to fully dismiss before opening modal
    setTimeout(() => {
      setShowVoiceModal(true);
      showVoiceModalRef.current = true;
      // Auto-start recording immediately when modal opens
      setTimeout(() => {
        if (!isRecording && !isRecordingRef.current && !vadStateRef.current.isProcessing) {
          console.log('🎤 Auto-starting recording when vocal modal opens...');
          startRecording();
        }
      }, 500);
    }, Platform.OS === 'ios' ? 300 : 200);
  };

  // Handle microphone button press - toggle recording with debouncing
  const handleMicButtonPress = async () => {
    const now = Date.now();
    const timeSinceLastPress = now - lastMicButtonPressRef.current;
    
    // Debounce: prevent double-clicks (minimum 500ms between presses)
    if (timeSinceLastPress < 500) {
      console.log('⚠️ Mic button press ignored (too soon after last press)');
      return;
    }
    
    lastMicButtonPressRef.current = now;
    
    // Prevent if already processing or stopping
    if (vadStateRef.current.isProcessing || isStoppingRef.current || isLoading) {
      console.log('⚠️ Mic button press ignored (already processing/stopping)');
      return;
    }
    
    if (isRecording || isRecordingRef.current) {
      // Stop recording and process
      console.log('🛑 Mic button pressed - stopping recording and processing...');
      
      // Prevent multiple stop calls
      if (isStoppingRef.current) {
        console.log('⚠️ Already stopping, ignoring duplicate press');
        return;
      }
      
      // Check if recording is ready (has been initialized and capturing audio)
      if (!isRecordingReadyRef.current) {
        const timeSinceStart = recordingStartTimeRef.current ? now - recordingStartTimeRef.current : 0;
        if (timeSinceStart < 800) {
          // Recording just started, wait a bit more
          console.log('⚠️ Recording not ready yet, waiting...', { timeSinceStart });
          alert('Please wait a moment for the recording to start. Speak clearly.');
          return;
        } else {
          // Force ready if enough time has passed
          isRecordingReadyRef.current = true;
        }
      }
      
      // Check minimum recording duration before allowing stop
      if (recordingStartTimeRef.current) {
        const recordingDuration = now - recordingStartTimeRef.current;
        const MIN_RECORDING_DURATION = 800; // Minimum 800ms before allowing stop
        
        if (recordingDuration < MIN_RECORDING_DURATION) {
          console.log('⚠️ Recording too short, waiting...', { recordingDuration });
          alert('Please speak for at least 0.8 seconds before stopping.');
          return;
        }
      }
      
      isStoppingRef.current = true;
      
      try {
        // Clear any automatic silence detection
        clearSilenceDetection();
        // Stop recording and process
        await stopRecording();
      } finally {
        // Reset stopping flag after a delay
        setTimeout(() => {
          isStoppingRef.current = false;
        }, 1000);
      }
    } else {
      // Start recording
      console.log('🎤 Mic button pressed - starting recording...');
      if (!vadStateRef.current.isProcessing && !isLoading && !isStoppingRef.current) {
        // Clear any existing detection before starting
        clearSilenceDetection();
        // Reset ready flag
        isRecordingReadyRef.current = false;
        await startRecording();
        // Don't start automatic silence detection - user will manually stop
      }
    }
  };

  const closeVoiceModal = async () => {
    // Stop continuous mode
    setIsContinuousMode(false);
    isContinuousModeRef.current = false;
    showVoiceModalRef.current = false;
    
    // Clear silence detection timer
    clearSilenceDetection();
    
    // Stop any ongoing speech
    try {
      Speech.stop();
      console.log('Stopped speech on modal close');
    } catch (error) {
      console.log('Error stopping speech:', error);
    }
    
    // Stop any ongoing audio playback
    try {
      if (currentSoundRef.current) {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
        currentSoundRef.current = null;
        console.log('Stopped audio playback on modal close');
      }
    } catch (error) {
      console.log('Error stopping audio playback:', error);
    }
    
    setShowVoiceModal(false);
    setVoiceTranscript('');
    setVoiceResponse('');
    if (isRecording && recording) {
      try {
        setIsRecording(false);
        const status = await recording.getStatusAsync();
        if (status.isRecording) {
          if (recording.stopAndUnloadAsync && typeof recording.stopAndUnloadAsync === 'function') {
            await recording.stopAndUnloadAsync();
          } else if ((recording as any).stopAsync && typeof (recording as any).stopAsync === 'function') {
            await (recording as any).stopAsync();
          }
        }
        // Don't call unloadAsync separately - stopAndUnloadAsync already does it
        setRecording(null);
      } catch (error) {
        console.error('Error stopping recording on modal close:', error);
        setRecording(null);
        setIsRecording(false);
      }
    }
  };

  // Pulse animation for voice modal
  useEffect(() => {
    if (isRecording && showVoiceModal) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [isRecording, showVoiceModal]);

  // Handler for main chat mic button (between send and vocal) - only transcribes
  const handleVoicePress = async () => {
    // Don't allow main chat mic when voice modal is open
    if (showVoiceModal) {
      return;
    }
    
    // Prevent multiple simultaneous calls
    if (isLoading || isTranscribing) {
      return;
    }
    
    try {
      if (isRecording) {
        // Stop recording and transcribe (only, no AI response)
        await stopRecordingAndTranscribe();
      } else {
        // Start recording
        await startRecording();
      }
    } catch (error) {
      console.error('Voice error:', error);
      setIsRecording(false);
      setRecording(null);
      setIsTranscribing(false);
    }
  };

  // Handler for voice modal mic button - does full voice chat flow
  const handleVoiceModalPress = async () => {
    // Prevent multiple simultaneous calls
    if (isLoading || isTranscribing) {
      return;
    }
    
    try {
      if (isRecording) {
        // Stop recording and do full voice chat (transcribe + AI + voice response)
        await stopRecording();
      } else {
        // Start recording
        await startRecording();
      }
    } catch (error) {
      console.error('Voice modal error:', error);
      setIsRecording(false);
      setRecording(null);
      setIsTranscribing(false);
      setIsLoading(false);
    }
  };

  const stopRecordingAndTranscribe = async () => {
    if (!recording) {
      setIsRecording(false);
      return;
    }

    // Store the recording reference before clearing state
    const recordingToStop = recording;
    setIsRecording(false);
    setRecording(null);
    setIsTranscribing(true);

    try {
      // Get status to check if recording is active
      let uri: string | null = null;
      
      try {
        const status = await recordingToStop.getStatusAsync();
        if (status.isRecording) {
          // Stop and unload if recording
          if (recordingToStop.stopAndUnloadAsync && typeof recordingToStop.stopAndUnloadAsync === 'function') {
            await recordingToStop.stopAndUnloadAsync();
            uri = recordingToStop.getURI();
          } else if ((recordingToStop as any).stopAsync && typeof (recordingToStop as any).stopAsync === 'function') {
            await (recordingToStop as any).stopAsync();
            uri = recordingToStop.getURI();
          }
        } else {
          // Recording already stopped, just get URI
          uri = recordingToStop.getURI();
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        // Try to get URI anyway
        try {
          uri = recordingToStop.getURI();
        } catch (uriError) {
          console.error('Could not get URI:', uriError);
        }
      }
      
      if (!uri) {
        throw new Error('Could not get audio file URI');
      }

      if (uri) {
        console.log('Transcribing voice with URI:', uri);
        
        try {
          // Only transcribe the audio - don't send to AI
          const transcribedText = await voiceToText(uri);
          console.log('Transcribed text:', transcribedText);
          
          if (transcribedText && transcribedText.trim()) {
            // Just populate the input field with transcribed text
            // User can review and send manually
            setInputText(transcribedText.trim());
            // Focus the input so user can see the transcribed text
            textInputRef.current?.focus();
          } else {
            alert('No text was transcribed. Please try again.');
          }
        } catch (transcribeError) {
          console.error('Voice-to-text error:', transcribeError);
          const errorMessage = transcribeError instanceof Error 
            ? transcribeError.message 
            : 'Failed to transcribe audio. Please try again.';
          alert(errorMessage);
        }
      } else {
        console.log('No URI found for recording');
        alert('Recording failed. Please try again.');
      }
    } catch (error) {
      console.error('Failed to process voice recording:', error);
      alert('Failed to process recording. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    // Prevent multiple simultaneous calls
    if (isStartingRecordingRef.current) {
      console.log('⚠️ Already starting a recording, ignoring duplicate call');
      return;
    }
    
    if (isRecording || isRecordingRef.current) {
      console.log('⚠️ Recording already in progress');
      return;
    }

    isStartingRecordingRef.current = true;

    try {
      // Stop any ongoing speech before starting to record
      try {
        Speech.stop();
        console.log('Stopped speech before starting recording');
      } catch (error) {
        console.log('Error stopping speech:', error);
      }

      // Stop any ongoing audio playback before starting to record
      try {
        if (currentSoundRef.current) {
          await currentSoundRef.current.stopAsync();
          await currentSoundRef.current.unloadAsync();
          currentSoundRef.current = null;
          console.log('Stopped audio playback before starting recording');
        }
      } catch (error) {
        console.log('Error stopping audio playback:', error);
      }

      // Clean up any existing recording first - check both state and ref
      const recordingToCleanup = recording || recordingRef.current;
      if (recordingToCleanup) {
        try {
          console.log('🧹 Cleaning up previous recording...');
          const status = await recordingToCleanup.getStatusAsync();
          if (status.isRecording) {
            await recordingToCleanup.stopAndUnloadAsync();
            console.log('✅ Stopped and unloaded previous recording');
          } else {
            if ((recordingToCleanup as any).unloadAsync && typeof (recordingToCleanup as any).unloadAsync === 'function') {
              await (recordingToCleanup as any).unloadAsync();
              console.log('✅ Unloaded previous recording');
            }
          }
        } catch (cleanupError) {
          console.log('⚠️ Error cleaning up previous recording:', cleanupError);
          // Try to unload anyway
          try {
            if ((recordingToCleanup as any).unloadAsync && typeof (recordingToCleanup as any).unloadAsync === 'function') {
              await (recordingToCleanup as any).unloadAsync();
            }
          } catch (unloadError) {
            console.log('⚠️ Could not unload recording:', unloadError);
          }
        }
        setRecording(null);
        setIsRecording(false);
        recordingRef.current = null;
        isRecordingRef.current = false;
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        alert('Microphone permission is required for voice chat');
        return;
      }

      // Reset audio mode to ensure clean state
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Wait longer to ensure previous recording is fully released
      // Increased delay to prevent "Only one Recording" error
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set audio mode for recording with background support
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true, // Allow background recording for continuous mode
      });

      // Additional delay after setting audio mode to ensure it's ready
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('🎙️ Creating new recording...');
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      console.log('✅ New recording created successfully');

      setRecording(newRecording);
      setIsRecording(true);
      
      // Update refs for silence detection
      isRecordingRef.current = true;
      recordingRef.current = newRecording;
      const startTime = Date.now();
      recordingStartTimeRef.current = startTime;
      lastAudioTimeRef.current = startTime;
      
      // Mark recording as not ready yet - need to wait for it to initialize
      isRecordingReadyRef.current = false;
      
      // Wait a bit to ensure recording has actually started capturing audio
      // This prevents empty/invalid audio files on first click
      setTimeout(async () => {
        try {
          if (newRecording && typeof newRecording.getStatusAsync === 'function') {
            const status = await newRecording.getStatusAsync();
            if (status.isRecording && status.durationMillis !== undefined) {
              isRecordingReadyRef.current = true;
              console.log('✅ Recording ready, duration:', status.durationMillis, 'ms');
            }
          }
        } catch (error) {
          console.warn('⚠️ Could not verify recording status:', error);
          // Still mark as ready after delay to prevent blocking
          setTimeout(() => {
            isRecordingReadyRef.current = true;
          }, 500);
        }
      }, 500); // Wait 500ms for recording to initialize
      
      // Reset starting flag after successful creation
      isStartingRecordingRef.current = false;
    } catch (error) {
      console.error('Failed to start recording:', error);
      setIsRecording(false);
      setRecording(null);
      recordingRef.current = null;
      isRecordingRef.current = false;
      isStartingRecordingRef.current = false;
      
      // Reset audio mode on error
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch (audioError) {
        console.error('Error resetting audio mode:', audioError);
      }
      
      // Show user-friendly error message
      if (error instanceof Error && error.message.includes('Only one Recording')) {
        alert('Please wait a moment before recording again. The previous recording is still being cleaned up.');
        // Wait a bit longer and try to clean up more thoroughly
        setTimeout(async () => {
          try {
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: false,
              playsInSilentModeIOS: true,
              staysActiveInBackground: false,
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            await Audio.setAudioModeAsync({
              allowsRecordingIOS: true,
              playsInSilentModeIOS: true,
              staysActiveInBackground: true,
            });
          } catch (retryError) {
            console.error('Error during retry cleanup:', retryError);
          }
        }, 100);
      } else {
        alert('Failed to start recording. Please try again.');
      }
    }
  };

  // Voice Activity Detection (VAD) - Real-time chunk-based detection
  // Implements proper VAD: monitors audio activity, buffers speech, detects silence (500ms threshold)
  const startSilenceDetection = () => {
    // Clear any existing timers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (silenceCheckIntervalRef.current) {
      clearInterval(silenceCheckIntervalRef.current);
      silenceCheckIntervalRef.current = null;
    }
    
    // VAD Configuration (matching user's technical spec)
    const CHUNK_INTERVAL = 50; // Check every 50ms (20-50ms range as per spec)
    const SILENCE_THRESHOLD = 500; // 500ms of silence = sentence complete (as per spec)
    const MIN_SPEECH_DURATION = 300; // Minimum 300ms of speech before considering it valid
    const MAX_RECORDING_DURATION = 30000; // Max 30 seconds safety limit
    const NO_SPEECH_TIMEOUT = 3000; // 3 seconds - stop if no speech detected
    
    // Initialize VAD state
    const recordingStartTime = Date.now();
    vadStateRef.current = {
      lastDuration: 0,
      lastActivityTime: recordingStartTime,
      speechDetected: false,
      silenceStartTime: 0,
      isProcessing: false,
    };
    
    console.log('🎤 Starting VAD (Voice Activity Detection)...');
    
    // Start monitoring immediately (no delay for faster response)
    silenceCheckIntervalRef.current = setInterval(async () => {
      // Safety check: verify all conditions are met
      if (!isRecordingRef.current || !isContinuousModeRef.current || !showVoiceModalRef.current || !recordingRef.current) {
        console.log('⚠️ VAD stopped: conditions not met', {
          isRecording: isRecordingRef.current,
          isContinuous: isContinuousModeRef.current,
          showModal: showVoiceModalRef.current,
          hasRecording: !!recordingRef.current
        });
        if (silenceCheckIntervalRef.current) {
          clearInterval(silenceCheckIntervalRef.current);
          silenceCheckIntervalRef.current = null;
        }
        return;
      }
      
      // Prevent processing if already processing
      if (vadStateRef.current.isProcessing) {
        console.log('⚠️ Already processing, skipping VAD check');
        return;
      }
      
      try {
        const status = await recordingRef.current.getStatusAsync();
        const now = Date.now();
        
        // Check if recording is still active
        if (!status.isRecording) {
          console.log('⚠️ Recording stopped unexpectedly');
          if (silenceCheckIntervalRef.current) {
            clearInterval(silenceCheckIntervalRef.current);
            silenceCheckIntervalRef.current = null;
          }
          return;
        }
        
        // Safety: Force stop if recording too long
        if (status.durationMillis && status.durationMillis >= MAX_RECORDING_DURATION) {
          console.log('⏱️ Max recording duration reached (30s), stopping...');
          if (silenceCheckIntervalRef.current) {
            clearInterval(silenceCheckIntervalRef.current);
            silenceCheckIntervalRef.current = null;
          }
          vadStateRef.current.isProcessing = true;
          stopRecording();
          return;
        }
        
        if (status.durationMillis !== undefined) {
          const currentDuration = status.durationMillis;
          const vad = vadStateRef.current;
          
          // Detect speech activity: duration increased = audio is being captured
          // Check if duration has increased (even by 1ms means audio is being captured)
          const durationIncreased = currentDuration > vad.lastDuration;
          
          if (durationIncreased) {
            // Speech detected - audio is being captured
            vad.lastDuration = currentDuration;
            vad.lastActivityTime = now;
            
            if (!vad.speechDetected) {
              // Speech just started
              vad.speechDetected = true;
              vad.silenceStartTime = 0; // Reset silence timer
              console.log('🗣️ Speech started, duration:', Math.round(currentDuration / 1000 * 10) / 10 + 's');
            } else {
              // Speech continuing - reset silence timer if it was set
              if (vad.silenceStartTime > 0) {
                console.log('🗣️ Speech resumed after silence, resetting silence timer');
                vad.silenceStartTime = 0;
              }
            }
          } else {
            // No duration increase = potential silence
            if (vad.speechDetected) {
              // We had speech before, now checking for silence
              if (vad.silenceStartTime === 0) {
                // Silence just started - mark the time
                vad.silenceStartTime = now;
                console.log('🔇 Silence detected after speech, duration:', Math.round(currentDuration / 1000 * 10) / 10 + 's', 'waiting for', SILENCE_THRESHOLD + 'ms...');
              } else {
                // Calculate silence duration
                const silenceDuration = now - vad.silenceStartTime;
                
                // Log progress every 200ms
                if (silenceDuration % 200 < 50) {
                  console.log('🔇 Silence continuing...', Math.round(silenceDuration) + 'ms / ' + SILENCE_THRESHOLD + 'ms');
                }
                
                // Check if silence threshold exceeded (500ms as per spec)
                if (silenceDuration >= SILENCE_THRESHOLD) {
                  // Minimum speech duration check - ensure we had actual speech
                  if (currentDuration >= MIN_SPEECH_DURATION) {
                    console.log('✅✅✅ Silence threshold exceeded! Processing audio NOW...', {
                      totalDuration: Math.round(currentDuration / 1000 * 10) / 10 + 's',
                      silenceDuration: Math.round(silenceDuration / 1000 * 10) / 10 + 's',
                      meetsMinDuration: currentDuration >= MIN_SPEECH_DURATION
                    });
                    
                    // Mark as processing to prevent multiple triggers
                    vad.isProcessing = true;
                    
                    // Clear interval BEFORE calling stopRecording to prevent race conditions
                    if (silenceCheckIntervalRef.current) {
                      clearInterval(silenceCheckIntervalRef.current);
                      silenceCheckIntervalRef.current = null;
                    }
                    
                    // IMPORTANT: Stop recording and process - this will trigger the backend call
                    console.log('🛑🛑🛑 Calling stopRecording() NOW to process audio...');
                    // Use setTimeout(0) to ensure interval is cleared first
                    setTimeout(() => {
                      stopRecording();
                    }, 0);
                    return;
                  } else {
                    // Speech was too short, might be noise - reset
                    console.log('⚠️ Speech too short (' + Math.round(currentDuration) + 'ms < ' + MIN_SPEECH_DURATION + 'ms), resetting...');
                    vad.speechDetected = false;
                    vad.silenceStartTime = 0;
                    vad.lastActivityTime = now;
                    vad.lastDuration = currentDuration; // Update to prevent false positives
                  }
                }
              }
            } else {
              // No speech detected yet - check if we should timeout
              const timeSinceStart = now - recordingStartTime;
              if (timeSinceStart >= NO_SPEECH_TIMEOUT) {
                // No speech after 3 seconds, stop recording
                console.log('🔇 No speech detected after 3s, stopping...', {
                  timeSinceStart: Math.round(timeSinceStart / 1000 * 10) / 10 + 's',
                  currentDuration: Math.round(currentDuration / 1000 * 10) / 10 + 's'
                });
                
                vad.isProcessing = true;
                
                if (silenceCheckIntervalRef.current) {
                  clearInterval(silenceCheckIntervalRef.current);
                  silenceCheckIntervalRef.current = null;
                }
                
                setTimeout(() => {
                  stopRecording();
                }, 0);
                return;
              }
            }
          }
        } else {
          console.warn('⚠️ durationMillis is undefined - recording may not be active');
        }
      } catch (error) {
        console.error('❌ VAD error:', error);
        // On error, stop the interval to prevent infinite loops
        if (silenceCheckIntervalRef.current) {
          clearInterval(silenceCheckIntervalRef.current);
          silenceCheckIntervalRef.current = null;
        }
      }
    }, CHUNK_INTERVAL); // Check every 50ms for real-time detection
  };
  
  // Reset silence detection (not used in chunk-based approach)
  const resetSilenceDetection = () => {
    // This is handled automatically by the interval checking
  };

  // Clear silence detection timers and reset VAD state
  const clearSilenceDetection = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (silenceCheckIntervalRef.current) {
      clearInterval(silenceCheckIntervalRef.current);
      silenceCheckIntervalRef.current = null;
    }
    recordingStartTimeRef.current = null;
    lastAudioTimeRef.current = null;
    // Reset VAD state
    vadStateRef.current = {
      lastDuration: 0,
      lastActivityTime: 0,
      speechDetected: false,
      silenceStartTime: 0,
      isProcessing: false,
    };
  };

  const stopRecording = async () => {
    console.log('🛑 stopRecording() called', {
      isProcessing: vadStateRef.current.isProcessing,
      hasRecording: !!(recording || recordingRef.current),
      isRecording: isRecordingRef.current
    });
    
    // Prevent multiple simultaneous calls
    if (vadStateRef.current.isProcessing && !recording && !recordingRef.current) {
      console.log('⚠️ Already processing and no recording, skipping stopRecording');
      return;
    }
    
    // Mark as processing to prevent duplicate calls
    vadStateRef.current.isProcessing = true;
    
    // Update refs immediately
    isRecordingRef.current = false;
    isRecordingReadyRef.current = false;
    recordingStartTimeRef.current = null;
    
    if (!recording && !recordingRef.current) {
      console.log('⚠️ No recording to stop');
      setIsRecording(false);
      vadStateRef.current.isProcessing = false;
      return;
    }

    // Clear silence detection timer FIRST to prevent it from interfering
    clearSilenceDetection();

    // Store the recording reference before clearing state
    const recordingToStop = recording || recordingRef.current;
    if (!recordingToStop) {
      console.log('⚠️ No recording object found');
      setIsRecording(false);
      setRecording(null);
      recordingRef.current = null;
      vadStateRef.current.isProcessing = false;
      return;
    }
    
    setIsRecording(false);
    setRecording(null);
    recordingRef.current = null;
    
    console.log('🛑 Stopping recording and processing...');

    try {
      // Get URI first before stopping (in case stopping clears it)
      let uri: string | null = null;
      
      try {
        // Try to get URI first
        if (recordingToStop.getURI && typeof recordingToStop.getURI === 'function') {
          uri = recordingToStop.getURI();
          console.log('📝 Got URI before stopping:', uri);
        }
      } catch (uriError) {
        console.log('⚠️ Could not get URI before stopping:', uriError);
      }
      
      // Now try to stop the recording
      try {
        const status = await recordingToStop.getStatusAsync();
        console.log('📊 Recording status:', { isRecording: status.isRecording, duration: status.durationMillis });
        
        if (status.isRecording) {
          // Stop and unload if recording
          console.log('🛑 Stopping active recording...');
          if (recordingToStop.stopAndUnloadAsync && typeof recordingToStop.stopAndUnloadAsync === 'function') {
            await recordingToStop.stopAndUnloadAsync();
            // Get URI after stopping if we didn't get it before
            if (!uri && recordingToStop.getURI && typeof recordingToStop.getURI === 'function') {
              uri = recordingToStop.getURI();
            }
          } else if ((recordingToStop as any).stopAsync && typeof (recordingToStop as any).stopAsync === 'function') {
            // Fallback: just stop if stopAndUnloadAsync doesn't exist
            await (recordingToStop as any).stopAsync();
            if (!uri && recordingToStop.getURI && typeof recordingToStop.getURI === 'function') {
              uri = recordingToStop.getURI();
            }
          }
        } else {
          // Recording already stopped, just get URI if we don't have it
          console.log('📝 Recording already stopped');
          if (!uri && recordingToStop.getURI && typeof recordingToStop.getURI === 'function') {
            uri = recordingToStop.getURI();
          }
        }
      } catch (statusError) {
        console.error('⚠️ Error getting recording status:', statusError);
        // If we don't have URI yet, try one more time
        if (!uri) {
          try {
            if (recordingToStop.getURI && typeof recordingToStop.getURI === 'function') {
              uri = recordingToStop.getURI();
            }
          } catch (uriError) {
            console.error('❌ Could not get URI:', uriError);
          }
        }
      }
      
      if (!uri) {
        console.error('❌ No URI available from recording');
        setIsLoading(false);
        vadStateRef.current.isProcessing = false;
        isStoppingRef.current = false;
        alert('Could not get audio file. Please try again.');
        
        // If no URI, restart recording in continuous mode
        if (isContinuousModeRef.current && showVoiceModalRef.current) {
          setTimeout(() => {
            if (!isRecordingRef.current && !isLoading && !vadStateRef.current.isProcessing && isContinuousModeRef.current && showVoiceModalRef.current) {
              console.log('No URI, restarting recording...');
              startRecording();
            }
          }, 1500);
        }
        return;
      }

      // Validate recording duration - ensure we have at least 0.5 seconds of audio
      // Note: We check this before stopping, so we need to check the status we got earlier
      try {
        // Try to get status if recording object is still available
        let recordingDuration = 0;
        if (recordingToStop && typeof recordingToStop.getStatusAsync === 'function') {
          try {
            const finalStatus = await recordingToStop.getStatusAsync();
            recordingDuration = finalStatus.durationMillis || 0;
          } catch (statusErr) {
            console.warn('⚠️ Could not get recording status for duration check:', statusErr);
            // Continue anyway - let backend validate
          }
        }
        
        const MIN_RECORDING_DURATION = 500; // Minimum 500ms
        
        if (recordingDuration > 0 && recordingDuration < MIN_RECORDING_DURATION) {
          console.error('❌ Recording too short:', recordingDuration, 'ms (minimum:', MIN_RECORDING_DURATION, 'ms)');
          setIsLoading(false);
          vadStateRef.current.isProcessing = false;
          isStoppingRef.current = false;
          alert('Recording is too short. Please speak for at least 0.5 seconds.');
          
          // Restart recording in continuous mode
          if (isContinuousModeRef.current && showVoiceModalRef.current) {
            setTimeout(() => {
              if (!isRecordingRef.current && !isLoading && !vadStateRef.current.isProcessing && isContinuousModeRef.current && showVoiceModalRef.current) {
                console.log('Recording too short, restarting...');
                startRecording();
              }
            }, 1000);
          }
          return;
        }
        
        if (recordingDuration > 0) {
          console.log('✅ Recording duration valid:', Math.round(recordingDuration / 1000 * 10) / 10 + 's');
        }
      } catch (durationError) {
        console.warn('⚠️ Could not check recording duration:', durationError);
        // Continue anyway - let backend validate
      }

      if (uri && voiceChat) {
        console.log('🎙️ Processing voice with URI:', uri);
        setIsLoading(true);
        
        // Ensure processing flag is set
        vadStateRef.current.isProcessing = true;
        
        try {
          const language = selectedLanguage || 'en';
          // Send conversation history for continuous conversation
          const historyJson = conversationHistory.length > 0 
            ? JSON.stringify(conversationHistory) 
            : undefined;
          console.log('📤 Sending to backend:', { uri, voice: selectedVoice, language, hasHistory: !!historyJson });
          const result = await (voiceChat as any)(uri, selectedVoice, language, historyJson);
          console.log('✅ Voice chat result received:', result);

          // Update conversation history from response
          if (result.conversation_history) {
            try {
              const updatedHistory = JSON.parse(result.conversation_history);
              setConversationHistory(updatedHistory);
            } catch (e) {
              console.error('Failed to parse conversation history:', e);
            }
          }

          // Show transcribed text in voice modal
          setVoiceTranscript(result.user_text || 'Voice message');
          
          // Show AI response in voice modal
          setVoiceResponse(result.response_text || 'Sorry, I could not process your voice message.');
          
          // Add to main chat messages
          const userMessage: Message = {
            id: Date.now().toString(),
            text: result.user_text || 'Voice message',
            isUser: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          const aiMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: result.response_text || 'Sorry, I could not process your voice message.',
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          setMessages(prev => [...prev, userMessage, aiMessage]);
          
          // Play AI voice response
          if (result.audio_url) {
            try {
              // Stop any previous audio playback
              if (currentSoundRef.current) {
                try {
                  await currentSoundRef.current.stopAsync();
                  await currentSoundRef.current.unloadAsync();
                } catch (e) {
                  // Ignore errors when stopping previous sound
                }
              }
              
              const audioUrl = `${API_BASE_URL}${result.audio_url}`;
              console.log('Playing audio from:', audioUrl);
              
              // Set audio mode to use speaker for playback (force phone speaker, not Bluetooth)
              // This ensures maximum volume and routes audio through phone speaker
              try {
                await Audio.setAudioModeAsync({
                  allowsRecordingIOS: false,
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: false,
                  shouldDuckAndroid: true,
                  playThroughEarpieceAndroid: false, // Use speaker instead of earpiece on Android
                });
              } catch (audioModeError) {
                console.warn('Could not set all audio mode options:', audioModeError);
                // Try with minimal settings
                await Audio.setAudioModeAsync({
                  allowsRecordingIOS: false,
                  playsInSilentModeIOS: true,
                  staysActiveInBackground: false,
                });
              }
              
              // Small delay to ensure audio mode is set before creating sound
              await new Promise(resolve => setTimeout(resolve, 150));
              
              console.log('🔊 Creating audio sound with maximum volume...');
              console.log('📡 Audio URL:', audioUrl);
              
              const { sound } = await Audio.Sound.createAsync(
                { uri: audioUrl },
                { 
                  shouldPlay: true,
                  volume: 1.0, // Maximum volume (0.0 to 1.0)
                  isMuted: false,
                  isLooping: false,
                  rate: 1.0, // Normal playback speed
                }
              );
              
              console.log('✅ Audio sound created successfully');
              
              // Explicitly set volume to maximum after creation
              // This ensures volume is at 100% regardless of system settings
              await sound.setVolumeAsync(1.0);
              console.log('✅ Audio volume set to maximum (1.0)');
              
              // Verify playback status
              const playbackStatus = await sound.getStatusAsync();
              if (playbackStatus.isLoaded) {
                console.log('📊 Playback status:', {
                  isLoaded: playbackStatus.isLoaded,
                  isPlaying: playbackStatus.isPlaying,
                  volume: playbackStatus.volume,
                });
              } else if (playbackStatus.error) {
                console.error('❌ Audio playback error:', playbackStatus.error);
                throw new Error(`Audio playback error: ${playbackStatus.error}`);
              }
              
              // Note: Expo AV doesn't have direct control over Bluetooth routing
              // The system will route audio based on connected devices
              // To force phone speaker, users may need to:
              // - Disconnect Bluetooth device temporarily
              // - Or adjust Bluetooth device volume separately
              // - Or use system settings to change audio output
              
              // Store reference to current sound
              currentSoundRef.current = sound;
              
              // Clean up sound after playing and restart recording in continuous mode
              sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                  if (status.didJustFinish) {
                    console.log('✅ Audio playback finished');
                    sound.unloadAsync().catch(err => console.warn('Error unloading sound:', err));
                    if (currentSoundRef.current === sound) {
                      currentSoundRef.current = null;
                    }
                    // Auto-restart recording in continuous mode after voice response
                    if (isContinuousMode && showVoiceModal && !isLoading) {
                      setTimeout(() => {
                        if (!isRecording && !isLoading) {
                          console.log('Auto-restarting recording after response...');
                          startRecording();
                        }
                      }, 1000); // 1 second delay before restarting
                    }
                  } else if (status.isPlaying) {
                    console.log('🔊 Audio is playing...');
                  }
                } else if (status.error) {
                  console.error('❌ Audio playback error in status update:', status.error);
                }
              });
            } catch (audioError) {
              console.error('Failed to play audio:', audioError);
              // If audio fails, still try to restart recording in continuous mode
              if (isContinuousModeRef.current && showVoiceModalRef.current && !isLoading) {
                setTimeout(() => {
                  if (!isRecordingRef.current && !isLoading && isContinuousModeRef.current && showVoiceModalRef.current) {
                    console.log('Audio failed, restarting recording...');
                    startRecording();
                  }
                }, 1500);
              }
            }
          } else {
            // If no audio URL, restart recording in continuous mode
            if (isContinuousModeRef.current && showVoiceModalRef.current && !isLoading) {
              setTimeout(() => {
                if (!isRecordingRef.current && !isLoading && isContinuousModeRef.current && showVoiceModalRef.current) {
                  console.log('No audio URL, restarting recording...');
                  startRecording();
                }
              }, 1500);
            }
          }
          
          // Reset voice modal UI to simple state after processing
          // Clear transcript and response to show the simple mic button UI again
          setTimeout(() => {
            setVoiceTranscript('');
            setVoiceResponse('');
          }, 500); // Small delay to ensure audio starts playing
          
          // Reset processing flag after successful processing
          vadStateRef.current.isProcessing = false;
          isStoppingRef.current = false;
        } catch (voiceError) {
          console.error('Voice chat error:', voiceError);
          
          // Check if it's an audio format error
          const errorMessage = voiceError instanceof Error ? voiceError.message : 'Unknown error';
          const isAudioFormatError = errorMessage.includes('could not be decoded') || 
                                     errorMessage.includes('format is not supported') ||
                                     errorMessage.includes('no valid audio data');
          
          if (isAudioFormatError) {
            alert('Audio recording error. Please try recording again and speak clearly.');
          } else {
            const errorMsg: Message = {
              id: Date.now().toString(),
              text: `Voice error: ${errorMessage}`,
              isUser: false,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            setMessages(prev => [...prev, errorMsg]);
          }
          
          // Reset UI to simple state on error
          setVoiceTranscript('');
          setVoiceResponse('');
          
          // Reset processing flag on error
          vadStateRef.current.isProcessing = false;
          isStoppingRef.current = false;
          
          // If error, restart recording in continuous mode
          if (isContinuousModeRef.current && showVoiceModalRef.current && !isLoading) {
            setTimeout(() => {
              if (!isRecordingRef.current && !isLoading && isContinuousModeRef.current && showVoiceModalRef.current) {
                console.log('Voice error, restarting recording...');
                startRecording();
              }
            }, 2000);
          }
        }
        
        setIsLoading(false);
        // Reset processing flag
        vadStateRef.current.isProcessing = false;
        isStoppingRef.current = false;
      } else {
        console.log('Missing URI or voiceChat function:', { uri: !!uri, voiceChat: !!voiceChat });
        setIsLoading(false);
        vadStateRef.current.isProcessing = false;
        isStoppingRef.current = false;
        
        // If missing URI, restart recording in continuous mode
        if (isContinuousModeRef.current && showVoiceModalRef.current) {
          setTimeout(() => {
            if (!isRecordingRef.current && !isLoading && isContinuousModeRef.current && showVoiceModalRef.current) {
              console.log('Missing URI, restarting recording...');
              startRecording();
            }
          }, 1500);
        }
      }

      setRecording(null);
    } catch (error) {
      console.error('Failed to process voice:', error);
      setIsRecording(false);
      setRecording(null);
      setIsLoading(false);
      // Reset processing flag on error
      vadStateRef.current.isProcessing = false;
      isStoppingRef.current = false;
      
      // If error, restart recording in continuous mode
      if (isContinuousModeRef.current && showVoiceModalRef.current) {
        setTimeout(() => {
          if (!isRecordingRef.current && !isLoading && isContinuousModeRef.current && showVoiceModalRef.current) {
            console.log('Processing error, restarting recording...');
            startRecording();
          }
        }, 1500);
      }
    }
  };

  return (
    <ImageBackground source={require('../assets/images/background.png')} style={styles.background} resizeMode="cover">
      <StatusBar barStyle="light-content" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.mainContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>OPHELIA</Text>
              <Text style={styles.headerSubtitle}>{selectedModel.toUpperCase()}</Text>
            </View>
            <View style={styles.settingsButtonContainer}>
              <TouchableOpacity onPress={handleSettings} style={styles.settingsButton}>
                <Ionicons name="settings-outline" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

        {/* Messages */}
        <KeyboardAvoidingView 
          style={styles.chatContainer} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                // Auto-scroll when content size changes (new messages added)
                scrollToEnd();
              }}
              onScrollBeginDrag={() => {
                // Dismiss keyboard when user starts scrolling
                Keyboard.dismiss();
              }}
            >
              {/* ORB Background - Always visible behind messages */}
              <View style={styles.orbBackgroundContainer}>
                <Image 
                  source={require('../assets/images/vocal_circle.png')} 
                  style={styles.orbBackgroundImage}
                  resizeMode="contain"
                />
              </View>
              
              {/* Messages displayed above the ORB */}
              {messages.map(msg => (
                <AnimatedMessage key={msg.id} message={msg} isUser={msg.isUser} />
              ))}
            </ScrollView>

            {/* Input */}
            <LinearGradient colors={['transparent', 'transparent']} style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <TextInput
                  ref={textInputRef}
                  style={styles.textInput}
                  placeholder="Ask here..."
                  placeholderTextColor="rgba(255, 255, 255, 0.5)"
                  value={inputText}
                  onChangeText={(text) => {
                    setInputText(text);
                    // Auto-scroll when typing
                    setTimeout(() => scrollToEnd(), 100);
                  }}
                  multiline
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={handleSendMessage}
                  onFocus={() => {
                    // Auto-scroll when input is focused
                    scrollToEnd();
                  }}
                  blurOnSubmit={false}
                  textAlignVertical="center"
                />
              </View>
              <TouchableOpacity 
                style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.disabledButton]} 
                onPress={handleSendMessage} 
                disabled={!inputText.trim() || isLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name="paper-plane-outline" 
                  size={isSmallScreen ? 20 : 24} 
                  color="#212121"
                />
              </TouchableOpacity>
              {/* Hide voice and vocal buttons when user is typing */}
              {!inputText.trim() && (
                <>
                  <TouchableOpacity 
                    style={[
                      styles.voiceButton, 
                      (isRecording || isTranscribing) && styles.recordingButton
                    ]} 
                    onPress={handleVoicePress}
                    disabled={isTranscribing}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {isTranscribing ? (
                      <Text style={styles.transcribingText}>...</Text>
                    ) : (
                      <Ionicons 
                        name={isRecording ? 'mic' : 'mic-outline'} 
                        size={isSmallScreen ? 20 : 24} 
                        color="#212121" 
                      />
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.vocalButton} 
                    onPress={handleVocalPress}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Image 
                      source={require('../assets/images/vocal_circle.png')} 
                      style={styles.vocalOrbIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </>
              )}
            </LinearGradient>
          </KeyboardAvoidingView>
        </View>

        {/* Voice Assistant Modal */}
        {showVoiceModal && (
          <View style={styles.voiceModal}>
            <TouchableOpacity style={styles.closeButton} onPress={closeVoiceModal}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            
            <View style={styles.voiceContent}>
              <Text style={styles.voiceTitle}>Voice Assistant</Text>
              
              {/* Show loading only when processing */}
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <Animated.View style={[styles.loadingDot, { opacity: pulseAnim }]} />
                  <Text style={styles.loadingText}>Processing...</Text>
                </View>
              ) : (
                <>
                  <Animated.View style={[styles.voiceCircle, { transform: [{ scale: pulseAnim }] }]}>
                    <Image 
                      source={require('../assets/images/vocal_circle.png')} 
                      style={styles.voiceOrbImage}
                      resizeMode="contain"
                    />
                  </Animated.View>
                  
                  <Text style={styles.voiceStatus}>
                    {isRecording ? 'Listening...' : isTranscribing ? 'Transcribing...' : 'Ready'}
                  </Text>
                  
                  {/* Microphone Button - Below ORB */}
                  <TouchableOpacity 
                    style={[
                      styles.micButton,
                      isRecording && styles.micButtonRecording,
                      (isLoading || isTranscribing) && styles.micButtonDisabled
                    ]}
                    onPress={handleMicButtonPress}
                    disabled={isLoading || isTranscribing}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                  >
                    <Ionicons 
                      name={isRecording ? 'mic' : 'mic-outline'} 
                      size={32} 
                      color={isRecording ? '#FFFFFF' : '#FFFFFF'} 
                    />
                    <Text style={styles.micButtonText}>
                      {isRecording ? 'Tap to Stop' : 'Tap to Start'}
                    </Text>
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

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { 
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
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingTop: isSmallScreen ? 12 : 16,
    paddingBottom: isSmallScreen ? 12 : 16,
    backgroundColor: 'rgba(0,0,0,0.85)',
    zIndex: 10,
    minHeight: 60,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 0,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: isSmallScreen ? 12 : 16,
    bottom: isSmallScreen ? 12 : 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  headerTitle: { 
    fontSize: isSmallScreen ? 18 : isLargeScreen ? 22 : 20, 
    fontWeight: 'bold', 
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: { 
    fontSize: isSmallScreen ? 12 : 14, 
    color: '#FFFFFF', 
    marginTop: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  settingsButtonContainer: {
    position: 'absolute',
    right: isSmallScreen ? 16 : 20,
    top: isSmallScreen ? 12 : 16,
    bottom: isSmallScreen ? 12 : 16,
    justifyContent: 'center',
    zIndex: 2,
  },
  settingsButton: { 
    padding: isSmallScreen ? 8 : 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  chatContainer: { flex: 1 },
  messagesContainer: { 
    flex: 1, 
    paddingHorizontal: isSmallScreen ? 12 : 16, 
    paddingTop: 16,
    position: 'relative',
  },
  orbBackgroundContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.25,
    left: (SCREEN_WIDTH - SCREEN_WIDTH * 0.45) / 2,
    width: SCREEN_WIDTH * 0.45,
    height: SCREEN_WIDTH * 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 0,
    opacity: 0.4,
  },
  orbBackgroundImage: {
    width: '100%',
    height: '100%',
  },
  messageContainer: { 
    marginBottom: 12,
    zIndex: 1,
    position: 'relative',
  },
  messageBubble: { 
    maxWidth: isSmallScreen ? '85%' : '80%', 
    padding: isSmallScreen ? 10 : 12, 
    borderRadius: 20,
  },
  userMessage: { alignSelf: 'flex-end' },
  aiMessage: { alignSelf: 'flex-start' },
  userBubble: { 
    backgroundColor: '#8B5CF6',
  },
  aiBubble: { 
    backgroundColor: '#2A2A2A',
  },
  messageText: { 
    color: '#fff', 
    fontSize: isSmallScreen ? 14 : 16, 
    lineHeight: isSmallScreen ? 20 : 22 
  },
  messageTime: { 
    color: '#B0B0B0', 
    fontSize: isSmallScreen ? 10 : 12, 
    marginTop: 4 
  },

  inputContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: isSmallScreen ? 12 : 16,
    paddingTop: isSmallScreen ? 10 : 12,
    paddingBottom: isSmallScreen ? 10 : 12,
    alignItems: 'center', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginBottom: 0,
  },
  inputWrapper: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    justifyContent: 'center',
    paddingHorizontal: isSmallScreen ? 14 : 16,
    paddingVertical: isSmallScreen ? 10 : 12,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 24,
    marginRight: isSmallScreen ? 8 : 10,
    marginBottom: 0,
  },
  textInput: { 
    flex: 1, 
    fontSize: isSmallScreen ? 15 : 17, 
    color: '#fff', 
    maxHeight: 96,
    minHeight: 24,
    padding: 0,
    lineHeight: isSmallScreen ? 20 : 22,
  },
  sendButton: { 
    padding: isSmallScreen ? 10 : 12, 
    borderRadius: 12, 
    backgroundColor: '#fff',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#fff',
    opacity: 0.6,
  },
  voiceButton: { 
    marginLeft: isSmallScreen ? 6 : 8, 
    padding: isSmallScreen ? 10 : 12, 
    borderRadius: 12, 
    backgroundColor: '#E0E0E0',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingButton: {
    backgroundColor: '#ff4444'
  },
  transcribingText: {
    fontSize: isSmallScreen ? 18 : 20,
    color: '#212121',
    fontWeight: 'bold',
  },
  vocalButton: { 
    marginLeft: isSmallScreen ? 6 : 8, 
    padding: isSmallScreen ? 8 : 10, 
    borderRadius: 12, 
    backgroundColor: '#E0E0E0',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vocalOrbIcon: {
    width: isSmallScreen ? 28 : 32,
    height: isSmallScreen ? 28 : 32,
  },
  
  voiceModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    zIndex: 1001,
  },
  voiceContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 40,
  },
  voiceCircle: {
    width: isSmallScreen ? 180 : isLargeScreen ? 220 : 200,
    height: isSmallScreen ? 180 : isLargeScreen ? 220 : 200,
    borderRadius: isSmallScreen ? 90 : isLargeScreen ? 110 : 100,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: isSmallScreen ? 30 : 40,
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    position: 'relative',
    overflow: 'hidden',
  },
  voiceOrbImage: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  voiceStatus: {
    fontSize: 18,
    color: 'white',
    marginBottom: 30,
    textAlign: 'center',
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginTop: 20,
  },
  micButtonRecording: {
    backgroundColor: 'rgba(255, 68, 68, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  micButtonText: {
    fontSize: 12,
    color: 'white',
    marginTop: 4,
    fontWeight: '500',
  },
  voiceRecordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  voiceRecordingButton: {
    backgroundColor: '#ff4444',
  },
  transcriptContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    maxWidth: '90%',
  },
  transcriptLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 5,
  },
  transcriptText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 22,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  loadingDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8B5CF6',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
  },
  responseContainer: {
    backgroundColor: 'rgba(42, 42, 42, 0.8)',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    maxWidth: '90%',
  },
  responseLabel: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 5,
  },
  responseText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 22,
  },
});