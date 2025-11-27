import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { WS_URL } from '../config/api';

interface WebSocketContextType {
  ws: WebSocket | null;
  connected: boolean;
  send: (data: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const websocket = new WebSocket(WS_URL);

      websocket.onopen = () => {
        setConnected(true);
        websocket.send(JSON.stringify({ type: 'auth', userId: user.id }));
      };

      websocket.onclose = () => setConnected(false);
      websocket.onerror = () => setConnected(false);

      setWs(websocket);

      return () => {
        websocket.close();
        setWs(null);
        setConnected(false);
      };
    }
  }, [isAuthenticated, user]);

  const send = (data: any) => {
    if (ws && connected) {
      ws.send(JSON.stringify(data));
    }
  };

  return (
    <WebSocketContext.Provider value={{ ws, connected, send }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};