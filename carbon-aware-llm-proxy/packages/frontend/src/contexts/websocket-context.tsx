"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { WebSocketService } from "@/lib/websocket";
import { useAuth } from "./auth-context";

interface WebSocketContextType {
  socket: WebSocketService | null;
  isConnected: boolean;
  isInitialized: boolean;
  send: (type: string, payload?: any) => boolean;
  on: (type: string, callback: (data: any) => void) => () => void;
  off: (type: string, callback: (data: any) => void) => void;
  reconnect: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(
  undefined,
);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<WebSocketService | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize WebSocket service only on the client side after hydration
  useEffect(() => {
    if (typeof window === "undefined") {
      return; // Don't initialize during SSR
    }

    // Create WebSocket service
    const socket = new WebSocketService();
    socketRef.current = socket;
    setIsInitialized(true);

    // Set up connection state listeners
    const handleOpen = () => setIsConnected(true);
    const handleClose = () => setIsConnected(false);

    socket.on("open", handleOpen);
    socket.on("close", handleClose);

    // Check initial connection state
    setIsConnected(socket.isReady);

    // Cleanup function
    return () => {
      socket.off("open", handleOpen);
      socket.off("close", handleClose);
      socket.close(1000, "Provider unmounting");
      socketRef.current = null;
      setIsInitialized(false);
      setIsConnected(false);
    };
  }, []); // Only run once after mount

  // Handle authentication changes
  useEffect(() => {
    if (!isInitialized || !socketRef.current) {
      return;
    }

    if (isAuthenticated) {
      // Reconnect with new auth token
      socketRef.current.reconnect();
    } else {
      // Close connection if user logs out
      socketRef.current.close(1000, "User logged out");
    }
  }, [isAuthenticated, user?.id, isInitialized]);

  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.reconnect();
    }
  };

  const value = {
    socket: socketRef.current,
    isConnected,
    isInitialized,
    send: (type: string, payload?: any) => {
      if (!socketRef.current || !isConnected) {
        console.warn("WebSocket not connected, cannot send message:", type);
        return false;
      }
      return socketRef.current.send(type, payload);
    },
    on: (type: string, callback: (data: any) => void) => {
      if (!socketRef.current) {
        console.warn("WebSocket not initialized, cannot add listener:", type);
        return () => {}; // Return no-op unsubscribe function
      }
      return socketRef.current.on(type, callback);
    },
    off: (type: string, callback: (data: any) => void) => {
      if (!socketRef.current) {
        return;
      }
      socketRef.current.off(type, callback);
    },
    reconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

// Higher-order component for components that need WebSocket access
export const withWebSocket = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
) => {
  const WithWebSocket: React.FC<P> = (props) => {
    const webSocket = useWebSocket();
    return <WrappedComponent {...props} webSocket={webSocket} />;
  };

  return WithWebSocket;
};
