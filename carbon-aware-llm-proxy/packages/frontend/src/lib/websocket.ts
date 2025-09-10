import { toast } from "./toast";

type MessageCallback = (data: any) => void;
type ErrorCallback = (error: Event) => void;
type CloseCallback = (event: CloseEvent) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private messageCallbacks: Map<string, MessageCallback[]> = new Map();
  private errorCallbacks: ErrorCallback[] = [];
  private closeCallbacks: CloseCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000; // Start with 1 second
  private isConnected = false;
  private url: string;
  private token: string | null = null;

  constructor() {
    // Only initialize WebSocket connection on the client side
    if (typeof window === "undefined") {
      // Server-side rendering - set a placeholder URL
      this.url = "";
      return;
    }

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";

    // Prefer explicit WS host, else derive from API base, else fall back sensibly
    const envWsHost = process.env.NEXT_PUBLIC_WS_URL;
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    let wsHost: string | null = null;

    if (envWsHost && envWsHost.trim().length > 0) {
      wsHost = envWsHost.trim();
    } else if (apiBase) {
      try {
        const u = new URL(apiBase);
        wsHost = `${u.hostname}${u.port ? `:${u.port}` : ""}`;
      } catch {
        // ignore and continue to next fallback
      }
    }

    if (!wsHost) {
      // If frontend runs on 3000 in dev, assume backend mapped to 3002 as a safe default
      const assumedPort = window.location.port === "3000" ? "3002" : window.location.port;
      wsHost = `${window.location.hostname}${assumedPort ? `:${assumedPort}` : ""}`;
    }

    this.url = `${wsProtocol}//${wsHost}/ws`;

    // Debug logging
    console.log("WebSocket Configuration:", {
      wsProtocol,
      wsHost,
      fullUrl: this.url,
      envVar: envWsHost,
      apiBase,
    });

    // Get token from localStorage
    this.token = localStorage.getItem("auth_token");

    this.connect();

    // Add visibility change listener to reconnect when tab becomes visible
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === "visible" && !this.isConnected) {
      this.reconnect();
    }
  };

  private connect = () => {
    // Don't connect if we're on the server side or if URL is empty
    if (typeof window === "undefined" || !this.url) {
      return;
    }

    if (this.socket) {
      this.socket.close();
    }

    try {
      const wsUrl = this.token ? `${this.url}?token=${this.token}` : this.url;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = this.handleOpen;
      this.socket.onmessage = this.handleMessage;
      this.socket.onerror = this.handleError;
      this.socket.onclose = this.handleClose;
    } catch (error) {
      console.error("WebSocket connection error:", error);
      this.reconnect();
    }
  };

  private handleOpen = (event: Event) => {
    console.log("WebSocket connected");
    this.isConnected = true;
    this.reconnectAttempts = 0;
    this.reconnectTimeout = 1000;

    // Notify any listeners that the connection is open
    this.trigger("open", event);
  };

  private handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      const { type, payload, data: messageData } = data;

      // Use either payload or data, with data taking precedence (backend sends data)
      const actualPayload = messageData || payload;

      // Trigger callbacks for this message type
      this.trigger(type, actualPayload);

      // Also trigger a generic 'message' event
      this.trigger("message", { type, payload: actualPayload });
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  };

  private handleError = (error: Event) => {
    console.error("WebSocket error:", error);
    this.errorCallbacks.forEach((callback) => callback(error));
  };

  private handleClose = (event: CloseEvent) => {
    console.log("WebSocket disconnected:", event.code, event.reason);
    this.isConnected = false;

    // Notify close callbacks
    this.closeCallbacks.forEach((callback) => callback(event));

    // Attempt to reconnect if this wasn't a normal closure
    if (event.code !== 1000) {
      this.reconnect();
    }
  };

  public reconnect = () => {
    // Don't reconnect if we're on the server side
    if (typeof window === "undefined") {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      toast.error({
        title: "Connection error",
        description:
          "Unable to connect to the server. Please refresh the page to try again.",
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectTimeout * Math.pow(2, this.reconnectAttempts - 1),
      30000,
    );

    console.log(
      `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`,
    );

    setTimeout(() => {
      console.log("Reconnecting...");
      this.connect();
    }, delay);
  };

  private trigger = (type: string, payload: any) => {
    const callbacks = this.messageCallbacks.get(type) || [];
    callbacks.forEach((callback) => callback(payload));
  };

  // Public methods

  public on = (type: string, callback: MessageCallback) => {
    if (!this.messageCallbacks.has(type)) {
      this.messageCallbacks.set(type, []);
    }
    this.messageCallbacks.get(type)?.push(callback);

    // Return unsubscribe function
    return () => this.off(type, callback);
  };

  public off = (type: string, callback: MessageCallback) => {
    const callbacks = this.messageCallbacks.get(type) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  };

  public onError = (callback: ErrorCallback) => {
    this.errorCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index !== -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  };

  public onClose = (callback: CloseCallback) => {
    this.closeCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.closeCallbacks.indexOf(callback);
      if (index !== -1) {
        this.closeCallbacks.splice(index, 1);
      }
    };
  };

  public send = (type: string, payload: any = {}) => {
    if (!this.isConnected || !this.socket) {
      console.error("WebSocket is not connected");
      return false;
    }

    try {
      const message = JSON.stringify({ type, payload });
      this.socket.send(message);
      return true;
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
      return false;
    }
  };

  public close = (code?: number, reason?: string) => {
    if (this.socket) {
      this.socket.close(code, reason);
    }
  };

  public get connectionState(): number | null {
    return this.socket ? this.socket.readyState : null;
  }

  public get isReady(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

// Export the WebSocketService class
export { WebSocketService };

// Create and export a singleton instance
export const webSocketService = new WebSocketService();

// Re-export the hook from the context file
export { useWebSocket } from "../contexts/websocket-context";
