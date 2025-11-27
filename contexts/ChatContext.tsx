import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: string;
}

interface ChatContextType {
  currentMessages: Message[];
  chatHistory: ChatSession[];
  addMessage: (message: Message) => void;
  clearCurrentChat: () => void;
  saveCurrentChat: (title?: string) => Promise<void>;
  loadChatSession: (sessionId: string) => void;
  deleteChatSession: (sessionId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('@chat_history');
      if (history) {
        setChatHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async (history: ChatSession[]) => {
    try {
      await AsyncStorage.setItem('@chat_history', JSON.stringify(history));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const addMessage = (message: Message) => {
    setCurrentMessages(prev => [...prev, message]);
  };

  const clearCurrentChat = () => {
    setCurrentMessages([]);
  };

  const saveCurrentChat = async (title?: string) => {
    if (currentMessages.length === 0) return;

    const chatTitle = title || `Chat ${new Date().toLocaleDateString()}`;
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: chatTitle,
      messages: currentMessages,
      model: await AsyncStorage.getItem('selectedAIModel') || 'gpt4',
      createdAt: new Date().toISOString(),
    };

    const updatedHistory = [newSession, ...chatHistory];
    setChatHistory(updatedHistory);
    await saveChatHistory(updatedHistory);
  };

  const loadChatSession = (sessionId: string) => {
    const session = chatHistory.find(chat => chat.id === sessionId);
    if (session) {
      setCurrentMessages(session.messages);
    }
  };

  const deleteChatSession = async (sessionId: string) => {
    const updatedHistory = chatHistory.filter(chat => chat.id !== sessionId);
    setChatHistory(updatedHistory);
    await saveChatHistory(updatedHistory);
  };

  return (
    <ChatContext.Provider value={{
      currentMessages,
      chatHistory,
      addMessage,
      clearCurrentChat,
      saveCurrentChat,
      loadChatSession,
      deleteChatSession,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};