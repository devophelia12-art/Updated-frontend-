// AccountSettingsScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  LayoutAnimation,
  UIManager,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Use legacy FS to avoid deprecated copyAsync warnings
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// DEV fallback image (your provided local path)
const DEV_DEBUG_IMAGE = '/mnt/data/Screenshot_20251120_173935_OPHELIA.jpg';

// Helpers
const localImageKey = (userId?: string) => `local_profile_image_${userId ?? 'me'}`;
const isFileUri = (uri?: string) => !!uri && (uri.startsWith('file://') || uri.startsWith('/'));

async function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  // @ts-ignore
  return btoa(binary);
}

async function writeUriToDest(uri: string, destUri: string): Promise<string> {
  try {
    if (isFileUri(uri)) {
      const src = uri.startsWith('file://') ? uri : `file://${uri}`;
      await FileSystem.copyAsync({ from: src, to: destUri });
      return destUri;
    }
    const resp = await fetch(uri);
    if (!resp.ok) throw new Error(`Failed to fetch file: ${resp.status}`);
    const buffer = await resp.arrayBuffer();
    const base64 = await arrayBufferToBase64(buffer);
    await FileSystem.writeAsStringAsync(destUri, base64, { encoding: FileSystem.EncodingType.Base64 });
    return destUri;
  } catch (err) {
    try {
      await FileSystem.copyAsync({ from: uri, to: destUri });
      return destUri;
    } catch (copyErr) {
      throw new Error(
        `Could not save image locally. Copy error: ${copyErr?.message || copyErr}. Fetch/write error: ${err?.message || err}`
      );
    }
  }
}

// Responsive scaling helpers
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;
const scale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;
const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export default function AccountSettingsScreen() {
  const { user, updateProfile, uploadProfilePicture } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  // compute responsive avatar size
  const avatarSize = Math.round(Math.max(64, Math.min(120, SCREEN_WIDTH * 0.22)));
  const inputPaddingV = Math.round(moderateScale(12));

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      (async () => {
        const key = localImageKey(user.id);
        try {
          const localUri = await AsyncStorage.getItem(key);
          if (localUri) {
            setProfileImage(localUri);
          } else if (user.profileImageUri) {
            setProfileImage(user.profileImageUri);
          } else {
            // dev fallback so you can see an image while debugging locally
            setProfileImage(DEV_DEBUG_IMAGE);
          }
        } catch (err) {
          console.warn('Failed to load local profile image:', err);
          setProfileImage(user.profileImageUri || DEV_DEBUG_IMAGE);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(e.endCoordinates?.height || verticalScale(250));
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleBack = () => router.back();

  const handleChangePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      const canceled = (result as any).canceled ?? (result as any).cancelled;
      const assets = (result as any).assets ?? null;
      if (canceled || !assets || assets.length === 0) return;

      const asset = assets[0];
      if (!asset.uri) {
        Alert.alert('Error', 'Could not get image URI from picker.');
        return;
      }

      if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select an image smaller than 8MB.');
        return;
      }

      const rawUri = asset.uri;
      const ext = (rawUri.split('.').pop() || 'jpg').split('?')[0];
      const filename = `profile_${user?.id || 'me'}.${ext}`;
      const destUri = `${FileSystem.documentDirectory}${filename}`;

      // Save locally first
      const savedUri = await writeUriToDest(rawUri, destUri);
      const key = localImageKey(user?.id);
      await AsyncStorage.setItem(key, savedUri);
      setProfileImage(savedUri);

      // Upload to server
      try {
        const updatedUser = await uploadProfilePicture(rawUri);
        // Force update with server URL
        if (updatedUser.profileImageUri) {
          setProfileImage(updatedUser.profileImageUri + '?t=' + Date.now()); // Cache bust
          // Also update local storage with server URL
          const key = localImageKey(user?.id);
          await AsyncStorage.setItem(key, updatedUser.profileImageUri);
        }
      } catch (uploadError) {
        console.warn('Server upload failed, using local image:', uploadError);
        // Keep local image if server upload fails
      }
    } catch (error) {
      console.error('Image change error:', error);
      Alert.alert('Error', `Could not update image: ${error?.message || error}`);
    }
  };

  // Debug helper to copy dev image into app storage (dev only)
  const runDebugCopy = async () => {
    try {
      const debugSource = DEV_DEBUG_IMAGE;
      const filename = `profile_debug_${user?.id || 'me'}.jpg`;
      const dest = `${FileSystem.documentDirectory}${filename}`;
      const saved = await writeUriToDest(debugSource, dest);
      const key = localImageKey(user?.id);
      await AsyncStorage.setItem(key, saved);
      setProfileImage(saved);
      console.log('Debug image copied to', saved);
    } catch (err) {
      console.warn('Debug copy failed:', err);
      Alert.alert('Debug Copy Failed', String(err));
    }
  };

  const handleSave = async () => {
    try {
      if (!fullName.trim() || !email.trim()) {
        return Alert.alert('Error', 'Please fill in your name and email.');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return Alert.alert('Error', 'Please enter a valid email address.');
      }

      const updatedUser = await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone_number: phoneNumber.trim(),
      });

      setFullName(updatedUser.fullName || updatedUser.full_name || fullName);
      setEmail(updatedUser.email || email);
      setPhoneNumber(updatedUser.phoneNumber || updatedUser.phone_number || phoneNumber);

      Alert.alert('Success', 'Profile updated successfully!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) {
      console.error('Error updating profile:', error);
      let message = 'Failed to update profile.';
      if (error && (error as any).message) message = (error as any).message;
      Alert.alert('Error', message);
    }
  };

  const handleCancel = () => router.back();

  if (loading) return null;

  return (
    <ImageBackground source={require('../assets/images/background.png')} style={styles.background} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(20, keyboardHeight + 20) }]}
            keyboardShouldPersistTaps="handled"
            ref={scrollRef}
          >
            <View style={styles.header}>
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={moderateScale(22)} color="white" />
                <Text style={[styles.backButtonText, { fontSize: moderateScale(16) }]}>Back</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.photoSection}>
              <TouchableOpacity
                onPress={handleChangePhoto}
                style={[styles.photoContainer, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
              >
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                    <Ionicons name="person-outline" size={Math.round(avatarSize * 0.45)} color="#B0B0B0" />
                  </View>
                )}
              </TouchableOpacity>

              <View style={{ marginLeft: moderateScale(12) }}>
                <Text style={[styles.changePhotoText, { fontSize: moderateScale(15) }]}>Change Photo</Text>
            
              </View>
            </View>

            <View style={styles.inputSection}>
              <Text style={[styles.label, { fontSize: moderateScale(14) }]}>Full Name</Text>
              <View style={[styles.inputContainer, { paddingVertical: inputPaddingV }]}>
                <Ionicons name="person-outline" size={moderateScale(20)} color="#B0B0B0" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { fontSize: moderateScale(16) }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  placeholderTextColor="#B0B0B0"
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <Text style={[styles.label, { fontSize: moderateScale(14) }]}>Email</Text>
              <View style={[styles.inputContainer, { paddingVertical: inputPaddingV }]}>
                <Ionicons name="mail-outline" size={moderateScale(20)} color="#B0B0B0" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { fontSize: moderateScale(16) }]}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor="#B0B0B0"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>

              <Text style={[styles.label, { fontSize: moderateScale(14) }]}>Phone Number</Text>
              <View style={[styles.inputContainer, { paddingVertical: inputPaddingV }]}>
                <Ionicons name="call-outline" size={moderateScale(20)} color="#B0B0B0" style={styles.inputIcon} />
                <TextInput
                  style={[styles.textInput, { fontSize: moderateScale(16) }]}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  keyboardType="phone-pad"
                  placeholder="Phone Number"
                  placeholderTextColor="#B0B0B0"
                  returnKeyType="done"
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.buttonSection}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={[styles.saveButtonText, { fontSize: moderateScale(16) }]}>Save Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={[styles.cancelButtonText, { fontSize: moderateScale(16) }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: moderateScale(20), paddingTop: moderateScale(20) } as any,
  header: { marginBottom: moderateScale(20) },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: moderateScale(8) },
  backButtonText: { color: '#FFFFFF', marginLeft: moderateScale(8), fontWeight: '500' },
  photoSection: { flexDirection: 'row', alignItems: 'center', marginBottom: moderateScale(24) },
  photoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4A4A4A',
    backgroundColor: '#2A2A2A',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#4A4A4A',
  },
  changePhotoText: { fontSize: moderateScale(16), color: '#FFFFFF', fontWeight: '500' },
  inputSection: { marginBottom: moderateScale(20) },
  label: { color: '#FFFFFF', fontWeight: '500', marginBottom: moderateScale(8), marginTop: moderateScale(12) },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(16),
    borderWidth: 1,
    borderColor: '#4A4A4A',
    marginBottom: moderateScale(8),
  },
  inputIcon: { marginRight: moderateScale(12) },
  textInput: { flex: 1, color: '#FFFFFF', paddingVertical: 0 },
  buttonSection: {
    paddingHorizontal: moderateScale(20),
    paddingBottom: moderateScale(Platform.OS === 'ios' ? 30 : 20),
    paddingTop: moderateScale(10),
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    paddingVertical: moderateScale(14),
    alignItems: 'center',
    marginBottom: moderateScale(12),
  },
  saveButtonText: { color: '#000000', fontWeight: '600' },
  cancelButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: moderateScale(12),
    paddingVertical: moderateScale(14),
    alignItems: 'center',
  },
  cancelButtonText: { color: '#FFFFFF', fontWeight: '600' },
});
