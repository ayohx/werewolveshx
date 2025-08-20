import { useEffect, useRef, useState, useCallback } from 'react';
import { WSMessage } from '@/lib/gameTypes';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const messageHandlers = useRef<Map<string, (message: any) => void>>(new Map());

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/api/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
          connect();
        }
      }, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        setLastMessage(message);
        
        // Call registered handler if exists
        const handler = messageHandlers.current.get(message.type);
        if (handler) {
          handler(message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }, []);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((message: WSMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  const onMessage = useCallback((type: string, handler: (message: any) => void) => {
    messageHandlers.current.set(type, handler);
    
    return () => {
      messageHandlers.current.delete(type);
    };
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    onMessage,
    connect,
    disconnect
  };
}
