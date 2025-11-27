import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LanguageContextType {
  selectedLanguage: string;
  setSelectedLanguage: (language: string) => void;
  getText: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    welcomeBack: 'Welcome Back',
    createAccount: 'Create Account',
    joinOphellia: 'Join OPHELIA today',
    forgotPassword: 'Forgot Password?',
    enterEmail: 'Enter your email and we\'ll send you a link to reset your password',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    confirmPassword: 'Confirm Password',
    enterEmailPlaceholder: 'Enter your email',
    enterPasswordPlaceholder: 'Enter your password',
    enterNamePlaceholder: 'Enter your name',
    confirmPasswordPlaceholder: 'Confirm your password',
    login: 'Login',
    createAccountButton: 'Create Account',
    sendResetLink: 'Send Reset Link',
    alreadyHaveAccount: 'Already have an account?',
    forgotPasswordLink: 'Forgot Password?',
    back: 'Back',
    proceed: 'Proceed',
    chooseAIModel: 'Choose AI Model',
    selectPreferredAI: 'Select your preferred AI Assistant',
    aiModelInfo: 'You can change the AI model anytime from settings or by voice command like "Switch to Gemini"',
    select: 'Select',
    privacyTerms: 'Privacy & Terms',
    privacyPolicy: 'Privacy Policy',
    privacyPolicyDescription: 'This Privacy Policy describes how OPHELIA ("we", "us", or "our") collects, uses, and shares your personal information when you use our voice assistant application.',
    informationWeCollect: 'Information We Collect',
    agreeToTerms: 'I agree to the Terms of Service and understand how my data will be used.',
    agreeToVoiceProcessing: 'I acknowledge that OPHELIA will process voice recordings to provide services.',
    acceptContinue: 'Accept & Continue',
    askHere: 'Ask here...',
  },
  fr: {
    welcomeBack: 'Bon retour',
    createAccount: 'Créer un compte',
    joinOphellia: 'Rejoignez OPHELIA aujourd\'hui',
    forgotPassword: 'Mot de passe oublié?',
    enterEmail: 'Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe',
    email: 'Email',
    password: 'Mot de passe',
    fullName: 'Nom complet',
    confirmPassword: 'Confirmer le mot de passe',
    enterEmailPlaceholder: 'Entrez votre email',
    enterPasswordPlaceholder: 'Entrez votre mot de passe',
    enterNamePlaceholder: 'Entrez votre nom',
    confirmPasswordPlaceholder: 'Confirmez votre mot de passe',
    login: 'Connexion',
    createAccountButton: 'Créer un compte',
    sendResetLink: 'Envoyer le lien de réinitialisation',
    alreadyHaveAccount: 'Vous avez déjà un compte?',
    forgotPasswordLink: 'Mot de passe oublié?',
    back: 'Retour',
    proceed: 'Continuer',
    chooseAIModel: 'Choisir le modèle IA',
    selectPreferredAI: 'Sélectionnez votre assistant IA préféré',
    aiModelInfo: 'Vous pouvez changer le modèle IA à tout moment depuis les paramètres ou par commande vocale comme "Passer à Gemini"',
    select: 'Sélectionner',
    privacyTerms: 'Confidentialité et Conditions',
    privacyPolicy: 'Politique de Confidentialité',
    privacyPolicyDescription: 'Cette Politique de Confidentialité décrit comment OPHELIA ("nous", "notre") collecte, utilise et partage vos informations personnelles lorsque vous utilisez notre application d\'assistant vocal.',
    informationWeCollect: 'Informations que nous collectons',
    agreeToTerms: 'J\'accepte les Conditions d\'Utilisation et comprends comment mes données seront utilisées.',
    agreeToVoiceProcessing: 'Je reconnais qu\'OPHELIA traitera les enregistrements vocaux pour fournir des services.',
    acceptContinue: 'Accepter et Continuer',
    askHere: 'Demandez ici...',
  },
  es: {
    welcomeBack: 'Bienvenido de nuevo',
    createAccount: 'Crear cuenta',
    joinOphellia: 'Únete a OPHELIA hoy',
    forgotPassword: '¿Olvidaste tu contraseña?',
    enterEmail: 'Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña',
    email: 'Email',
    password: 'Contraseña',
    fullName: 'Nombre completo',
    confirmPassword: 'Confirmar contraseña',
    enterEmailPlaceholder: 'Ingresa tu email',
    enterPasswordPlaceholder: 'Ingresa tu contraseña',
    enterNamePlaceholder: 'Ingresa tu nombre',
    confirmPasswordPlaceholder: 'Confirma tu contraseña',
    login: 'Iniciar sesión',
    createAccountButton: 'Crear cuenta',
    sendResetLink: 'Enviar enlace de restablecimiento',
    alreadyHaveAccount: '¿Ya tienes una cuenta?',
    forgotPasswordLink: '¿Olvidaste tu contraseña?',
    back: 'Atrás',
    proceed: 'Continuar',
    chooseAIModel: 'Elegir Modelo de IA',
    selectPreferredAI: 'Selecciona tu asistente de IA preferido',
    aiModelInfo: 'Puedes cambiar el modelo de IA en cualquier momento desde configuración o por comando de voz como "Cambiar a Gemini"',
    select: 'Seleccionar',
    privacyTerms: 'Privacidad y Términos',
    privacyPolicy: 'Política de Privacidad',
    privacyPolicyDescription: 'Esta Política de Privacidad describe cómo OPHELIA ("nosotros", "nuestro") recopila, usa y comparte tu información personal cuando usas nuestra aplicación de asistente de voz.',
    informationWeCollect: 'Información que Recopilamos',
    agreeToTerms: 'Acepto los Términos de Servicio y entiendo cómo se usarán mis datos.',
    agreeToVoiceProcessing: 'Reconozco que OPHELIA procesará grabaciones de voz para brindar servicios.',
    acceptContinue: 'Aceptar y Continuar',
    askHere: 'Pregunta aquí...',
  },
  de: {
    welcomeBack: 'Willkommen zurück',
    createAccount: 'Konto erstellen',
    joinOphellia: 'Treten Sie heute OPHELIA bei',
    forgotPassword: 'Passwort vergessen?',
    enterEmail: 'Geben Sie Ihre E-Mail ein und wir senden Ihnen einen Link zum Zurücksetzen Ihres Passworts',
    email: 'E-Mail',
    password: 'Passwort',
    fullName: 'Vollständiger Name',
    confirmPassword: 'Passwort bestätigen',
    enterEmailPlaceholder: 'Geben Sie Ihre E-Mail ein',
    enterPasswordPlaceholder: 'Geben Sie Ihr Passwort ein',
    enterNamePlaceholder: 'Geben Sie Ihren Namen ein',
    confirmPasswordPlaceholder: 'Bestätigen Sie Ihr Passwort',
    login: 'Anmelden',
    createAccountButton: 'Konto erstellen',
    sendResetLink: 'Reset-Link senden',
    alreadyHaveAccount: 'Haben Sie bereits ein Konto?',
    forgotPasswordLink: 'Passwort vergessen?',
    back: 'Zurück',
    proceed: 'Fortfahren',
    chooseAIModel: 'KI-Modell wählen',
    selectPreferredAI: 'Wählen Sie Ihren bevorzugten KI-Assistenten',
    aiModelInfo: 'Sie können das KI-Modell jederzeit in den Einstellungen oder per Sprachbefehl wie "Wechseln zu Gemini" ändern',
    select: 'Auswählen',
    privacyTerms: 'Datenschutz und Bedingungen',
    privacyPolicy: 'Datenschutzrichtlinie',
    privacyPolicyDescription: 'Diese Datenschutzrichtlinie beschreibt, wie OPHELIA ("wir", "unser") Ihre persönlichen Informationen sammelt, verwendet und teilt, wenn Sie unsere Sprachassistenten-Anwendung nutzen.',
    informationWeCollect: 'Informationen, die wir sammeln',
    agreeToTerms: 'Ich stimme den Nutzungsbedingungen zu und verstehe, wie meine Daten verwendet werden.',
    agreeToVoiceProcessing: 'Ich erkenne an, dass OPHELIA Sprachaufnahmen verarbeiten wird, um Dienstleistungen zu erbringen.',
    acceptContinue: 'Akzeptieren und Fortfahren',
    askHere: 'Hier fragen...',
  },
  ko: {
    welcomeBack: '다시 오신 것을 환영합니다',
    createAccount: '계정 만들기',
    joinOphellia: '오늘 OPHELIA에 가입하세요',
    forgotPassword: '비밀번호를 잊으셨나요?',
    enterEmail: '이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다',
    email: '이메일',
    password: '비밀번호',
    fullName: '전체 이름',
    confirmPassword: '비밀번호 확인',
    enterEmailPlaceholder: '이메일을 입력하세요',
    enterPasswordPlaceholder: '비밀번호를 입력하세요',
    enterNamePlaceholder: '이름을 입력하세요',
    confirmPasswordPlaceholder: '비밀번호를 확인하세요',
    login: '로그인',
    createAccountButton: '계정 만들기',
    sendResetLink: '재설정 링크 보내기',
    alreadyHaveAccount: '이미 계정이 있으신가요?',
    forgotPasswordLink: '비밀번호를 잊으셨나요?',
    back: '뒤로',
    proceed: '계속',
    chooseAIModel: 'AI 모델 선택',
    selectPreferredAI: '선호하는 AI 어시스턴트를 선택하세요',
    aiModelInfo: '설정에서 언제든지 AI 모델을 변경하거나 "Gemini로 전환"과 같은 음성 명령으로 변경할 수 있습니다',
    select: '선택',
    privacyTerms: '개인정보 및 약관',
    privacyPolicy: '개인정보 처리방침',
    privacyPolicyDescription: '이 개인정보 처리방침은 OPHELIA("우리", "저희")가 음성 어시스턴트 애플리케이션을 사용할 때 개인정보를 수집, 사용, 공유하는 방법을 설명합니다.',
    informationWeCollect: '수집하는 정보',
    agreeToTerms: '서비스 약관에 동의하며 내 데이터가 어떻게 사용될지 이해합니다.',
    agreeToVoiceProcessing: 'OPHELIA가 서비스를 제공하기 위해 음성 녹음을 처리할 것임을 인정합니다.',
    acceptContinue: '동의하고 계속하기',
    askHere: '여기서 질문하세요...',
  },
  it: {
    welcomeBack: 'Bentornato',
    createAccount: 'Crea accounto',
    joinOphellia: 'Unisciti a OPHELIA oggi',
    forgotPassword: 'Password dimenticata?',
    enterEmail: 'Inserisci la tua email e ti invieremo un link per reimpostare la password',
    email: 'Email',
    password: 'Password',
    fullName: 'Nome completo',
    confirmPassword: 'Conferma password',
    enterEmailPlaceholder: 'Inserisci la tua email',
    enterPasswordPlaceholder: 'Inserisci la tua password',
    enterNamePlaceholder: 'Inserisci il tuo nome',
    confirmPasswordPlaceholder: 'Conferma la tua password',
    login: 'Accedi',
    createAccountButton: 'Crea accounto',
    sendResetLink: 'Invia link di reimpostazione',
    alreadyHaveAccount: 'Hai già un account?',
    forgotPasswordLink: 'Password dimenticata?',
    back: 'Indietro',
    proceed: 'Procedi',
    chooseAIModel: 'Scegli Modello IA',
    selectPreferredAI: 'Seleziona il tuo assistente IA preferito',
    aiModelInfo: 'Puoi cambiare il modello IA in qualsiasi momento dalle impostazioni o tramite comando vocale come "Passa a Gemini"',
    select: 'Seleziona',
    privacyTerms: 'Privacy e Termini',
    privacyPolicy: 'Informativa sulla Privacy',
    privacyPolicyDescription: 'Questa Informativa sulla Privacy descrive come OPHELIA ("noi", "nostro") raccoglie, utilizza e condivide le tue informazioni personali quando usi la nostra applicazione di assistente vocale.',
    informationWeCollect: 'Informazioni che Raccogliamo',
    agreeToTerms: 'Accetto i Termini di Servizio e capisco come i miei dati saranno utilizzati.',
    agreeToVoiceProcessing: 'Riconosco che OPHELIA elaborerà le registrazioni vocali per fornire servizi.',
    acceptContinue: 'Accetta e Continua',
    askHere: 'Chiedi qui...',
  },
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage) {
        setSelectedLanguage(savedLanguage);
      }
    } catch (error) {
      console.log('Error loading language:', error);
    }
  };

  const handleSetSelectedLanguage = async (language: string) => {
    setSelectedLanguage(language);
    try {
      await AsyncStorage.setItem('selectedLanguage', language);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  const getText = (key: string): string => {
    return translations[selectedLanguage as keyof typeof translations]?.[key as keyof typeof translations.en] || translations.en[key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ selectedLanguage, setSelectedLanguage: handleSetSelectedLanguage, getText }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
