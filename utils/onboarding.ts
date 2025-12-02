import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys for onboarding steps
export const STORAGE_KEYS = {
  TERMS_ACCEPTED: '@ophelia_terms_accepted',
  MODEL_SELECTED: '@ophelia_selected_model',
} as const;

// Check if user has completed onboarding
export const checkOnboardingStatus = async () => {
  try {
    const [termsAccepted, modelSelected] = await AsyncStorage.multiGet([
      STORAGE_KEYS.TERMS_ACCEPTED,
      STORAGE_KEYS.MODEL_SELECTED,
    ]);

    return {
      termsAccepted: termsAccepted[1] === 'true',
      modelSelected: !!modelSelected[1],
      isComplete: termsAccepted[1] === 'true' && !!modelSelected[1],
    };
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return {
      termsAccepted: false,
      modelSelected: false,
      isComplete: false,
    };
  }
};

// Mark terms as accepted
export const markTermsAccepted = async () => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.TERMS_ACCEPTED, 'true');
  } catch (error) {
    console.error('Error marking terms as accepted:', error);
  }
};

// Save selected AI model
export const saveSelectedModel = async (modelId: string) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.MODEL_SELECTED, modelId);
  } catch (error) {
    console.error('Error saving selected model:', error);
  }
};

// Get selected AI model
export const getSelectedModel = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.MODEL_SELECTED);
  } catch (error) {
    console.error('Error getting selected model:', error);
    return null;
  }
};

// Clear onboarding data (for testing or logout)
export const clearOnboardingData = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TERMS_ACCEPTED,
      STORAGE_KEYS.MODEL_SELECTED,
    ]);
  } catch (error) {
    console.error('Error clearing onboarding data:', error);
  }
};

// Navigate to appropriate screen based on onboarding status
export const getNextOnboardingScreen = async () => {
  const status = await checkOnboardingStatus();
  
  if (!status.termsAccepted) {
    return '/privacy_terms';
  }
  
  if (!status.modelSelected) {
    return '/ai_model';
  }
  
  return '/chat';
};