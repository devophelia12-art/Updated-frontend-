import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function AccountSettingsScreen() {
  const { user, updateProfile, uploadProfilePicture } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setProfileImage(user.profileImageUri || null);
    }
    setLoading(false);
  }, [user]);

  const handleBack = () => router.back();

const handleChangePhoto = async () => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      return Alert.alert('Permission Denied', 'We need permission to access your photos.');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset.uri;

    // Validate extension
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
    const fileExtension = uri.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      return Alert.alert('Invalid File', 'Please select a valid image.');
    }

    // Optional: file size check
    if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
      return Alert.alert('File Too Large', 'Please select an image smaller than 2MB.');
    }

    // Optimistic UI
    setProfileImage(uri);

    const fileName = `profile.${fileExtension}`;
    const fileType = `image/${fileExtension}`;
    setUploading(true);

    try {
      const updatedUser = await uploadProfilePicture({ uri, name: fileName, type: fileType });
      setProfileImage(updatedUser.profileImageUri || uri);
      Alert.alert('Success', 'Profile picture uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      Alert.alert('Error', error.message || 'Failed to upload image.');
      setProfileImage(user?.profileImageUri || null); // revert
    } finally {
      setUploading(false);
    }
  } catch (error) {
    console.error('Error picking/uploading image:', error);
    Alert.alert('Error', 'Failed to upload image. Check your network or server.');
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

      setFullName(updatedUser.fullName || '');
      setEmail(updatedUser.email || '');
      setPhoneNumber(updatedUser.phoneNumber || '');
      setProfileImage(updatedUser.profileImageUri || null);

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile.');
    }
  };

  const handleCancel = () => router.back();

  if (loading) return null;

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
            <Text style={styles.headerTitle}>Account Settings</Text>
            <View style={styles.placeholder} />
          </View>
          
          <ScrollView contentContainerStyle={styles.scrollContent}>

          <View style={styles.photoSection}>
            <TouchableOpacity onPress={handleChangePhoto} style={styles.photoContainer}>
              {profileImage ? (
              <Image
  key={profileImage}  // force re-render when URL changes
  source={{ uri: profileImage || undefined }}
  style={styles.avatarImage}
/>


              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person-outline" size={40} color="#B0B0B0" />
                </View>
              )}
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>{uploading ? 'Uploading...' : 'Change Photo'}</Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#B0B0B0" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor="#B0B0B0"
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#B0B0B0" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#B0B0B0"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#B0B0B0" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                placeholder="Phone Number"
                placeholderTextColor="#B0B0B0"
              />
            </View>
          </View>
          </ScrollView>
        </View>

        <View style={styles.buttonSection}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
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
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
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
  photoSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  photoContainer: { marginRight: 16 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#4A4A4A' },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: '#4A4A4A' },
  changePhotoText: { fontSize: 16, color: '#FFFFFF', fontWeight: '500', marginBottom: 4 },
  inputSection: { marginBottom: 20 },
  label: { fontSize: 14, color: '#FFFFFF', fontWeight: '500', marginBottom: 8, marginTop: 16 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 16, borderWidth: 1, borderColor: '#4A4A4A' },
  inputIcon: { marginRight: 12 },
  textInput: { flex: 1, fontSize: 16, color: '#FFFFFF' },
  buttonSection: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
  saveButton: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#000000' },
  cancelButton: { backgroundColor: '#8B5CF6', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
