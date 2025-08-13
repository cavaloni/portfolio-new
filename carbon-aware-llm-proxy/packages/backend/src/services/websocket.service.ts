import { WebSocket as WS, WebSocketServer, RawData, OPEN } from "ws";
import { Server } from "http";
import { logger } from "../utils/logger";
import { v4 as uuidv4 } from "uuid";
import { modalProviderService } from "./modal.provider";
import { carbonService } from "./carbon.service";

// Define our custom WebSocket type with additional properties
interface CustomWebSocket extends WS {
  isAlive?: boolean;
}

// Types for WebSocket messages
type WebSocketMessage = {
  type: string;
  data?: any;
  payload?: any;
  timestamp: number;
};

interface Subscription {
  userId?: string;
  socket: CustomWebSocket;
  subscriptions: Set<string>;
}

// Event types that can be subscribed to
const EVENT_TYPES = [
  "carbon_intensity", // Carbon intensity updates for a region
  "model_recommendation", // Model recommendation updates
  "user_metrics", // User-specific metrics and stats
  "system_status", // System status updates
] as const;

type EventType = (typeof EVENT_TYPES)[number];

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Subscription> = new Map();
  private eventSubscribers: Map<EventType, Set<string>> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Initialize WebSocket server
  initialize(server: Server) {
    if (this.isInitialized) {
      logger.warn("WebSocket server already initialized");
      return;
    }

    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.setupEventHandlers();
    this.setupPingInterval();
    this.setupCarbonIntensityUpdates();
    this.isInitialized = true;
    logger.info("WebSocket server initialized");
  }

  // Clean up resources
  shutdown() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.wss) {
      this.wss.close(() => {
        logger.info("WebSocket server closed");
      });
      this.wss = null;
    }

    this.clients.clear();
    this.eventSubscribers.clear();
    this.isInitialized = false;
  }

  // Set up WebSocket event handlers
  private setupEventHandlers() {
    if (!this.wss) return;

    this.wss.on("connection", (ws: CustomWebSocket, req) => {
      const clientId = uuidv4();
      const clientIp = req.socket.remoteAddress || "unknown";

      logger.info(`New WebSocket connection: ${clientId} from ${clientIp}`);

      const subscription: Subscription = {
        socket: ws,
        subscriptions: new Set(),
      };

      // Add JWT token from query params if present
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      if (token) {
        // In a real app, you would validate the JWT token here
        // and extract the user ID
        subscription.userId = `user-${token.substring(0, 8)}`; // Simplified for example
      }

      this.clients.set(clientId, subscription);

      // Set up message handler
      const messageHandler = (data: RawData) => {
        this.handleMessage(clientId, data);
      };
      
      ws.on("message", messageHandler);

      // Set up close handler
      ws.on("close", () => this.handleClose(clientId));

      // Set up error handler
      ws.on("error", (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.handleClose(clientId);
      });

      // Send welcome message with client ID
      this.send(clientId, {
        type: "connection_established",
        data: { clientId },
      });
    });
  }

  // Handle incoming WebSocket messages
  private async handleMessage(clientId: string, data: RawData) {


    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn("Client not found for clientId:", clientId);
      return;
    }

    let message: WebSocketMessage | null = null;

    try {
      // Handle different types of incoming data (Buffer, ArrayBuffer, or Buffer[])
      let messageStr: string;
      if (Buffer.isBuffer(data)) {
        messageStr = data.toString("utf8");
      } else if (Array.isArray(data)) {
        messageStr = Buffer.concat(data).toString("utf8");
      } else if (data instanceof ArrayBuffer) {
        messageStr = Buffer.from(data).toString("utf8");
      } else {
        throw new Error("Unsupported WebSocket message format");
      }

      message = JSON.parse(messageStr);

      logger.info("handleMessage parsed message:", JSON.stringify(message, null, 2));

      if (!message) {
        throw new Error("Failed to parse message");
      }

      switch (message.type) {
        case "subscribe":
          this.handleSubscribe(clientId, message.data || message.payload);
          break;
        case "unsubscribe":
          this.handleUnsubscribe(clientId, message.data || message.payload);
          break;
        case "ping":
          this.send(clientId, {
            type: "pong",
            data: { timestamp: Date.now() },
          });
          break;
        case "chat.message":
          await this.handleChatMessage(clientId, message.data || message.payload);
          break;
        case "chat.stop":
          this.handleChatStop(clientId, message.data || message.payload);
          break;
        default:
          logger.warn(`Unknown message type: ${message.type}`);
          this.send(clientId, {
            type: "error",
            data: { message: `Unknown message type: ${message.type}` },
          });
      }
    } catch (error) {
      logger.error("Error handling WebSocket message - Error:", error instanceof Error ? error.message : String(error));
      logger.error("Error handling WebSocket message - Stack:", error instanceof Error ? error.stack : "No stack trace");
      logger.error("Error handling WebSocket message - Client ID:", clientId);
      logger.error("Error handling WebSocket message - Message:", message ? JSON.stringify(message, null, 2) : "No message");
      this.send(clientId, {
        type: "error",
        data: { message: "Invalid message format" },
      });
    }
  }

  // Handle client disconnection
  private handleClose(clientId: string) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all subscriptions
    client.subscriptions.forEach((eventType) => {
      this.unsubscribe(clientId, eventType as EventType);
    });

    this.clients.delete(clientId);
    logger.info(`Client disconnected: ${clientId}`);
  }

  // Handle subscription requests
  private handleSubscribe(
    clientId: string,
    data: { event: EventType | EventType[] },
  ) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const events = Array.isArray(data?.event) ? data.event : [data?.event];

    events.forEach((event) => {
      if (EVENT_TYPES.includes(event as EventType)) {
        this.subscribe(clientId, event as EventType);
      } else {
        this.send(clientId, {
          type: "error",
          data: { message: `Invalid event type: ${event}` },
        });
      }
    });
  }

  // Handle unsubscription requests
  private handleUnsubscribe(
    clientId: string,
    data: { event: EventType | EventType[] },
  ) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const events = Array.isArray(data?.event) ? data.event : [data?.event];

    events.forEach((event) => {
      if (EVENT_TYPES.includes(event as EventType)) {
        this.unsubscribe(clientId, event as EventType);
      }
    });
  }

  // Handle chat message requests
  private async handleChatMessage(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const {
        messageId,
        conversationId,
        content,
        model,
        temperature = 0.7,
        maxTokens = 1000,
        systemPrompt,
        parentMessageId,
        carbonAware = true,
      } = data;

      logger.info("Processing chat message via Modal", {
        messageId,
        conversationId,
        model,
        carbonAware,
      });

      // Send initial acknowledgment
      this.send(clientId, {
        type: "chat.chunk",
        data: {
          messageId,
          conversationId,
          content: "",
          done: false,
          model,
        },
      });

      const provider = (process.env.LLM_PROVIDER || "modal").toLowerCase();
      if (provider !== "modal") {
        // Fallback to mock response if Modal is disabled
        const fallbackMessage = "Modal provider is disabled. This is a fallback response.";
        const chunks = fallbackMessage.split(" ");
        
        for (const [index, chunk] of chunks.entries()) {
          await new Promise(resolve => setTimeout(resolve, 50));
          
          this.send(clientId, {
            type: "chat.chunk",
            data: {
              messageId,
              conversationId,
              content: chunk + " ",
              done: index === chunks.length - 1,
              model,
              carbonFootprint: {
                emissions: 0.001,
                energy: 0.002,
                region: "mock",
              },
              tokens: fallbackMessage.length,
            },
          });
        }
        return;
      }

      // Prepare messages array for provider
      const messages = [];
      
      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: "system" as const,
          content: systemPrompt,
        });
      }
      
      // Add user message
      messages.push({
        role: "user" as const,
        content: content,
      });

      // Call Modal Provider Service
      try {
        const response = await modalProviderService.sendChatCompletion({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false, // We'll handle streaming on our end
        });

        logger.info("Modal chat completion successful", {
          model: response.model,
          tokens: response.usage.total_tokens,
        });

        // Get the assistant response content
        const assistantContent = response.choices[0]?.message?.content || "";
        
        // Stream the response in chunks for better UX
        const chunks = assistantContent.split(" ");
        
        for (const [index, chunk] of chunks.entries()) {
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 30));
          
          const isLast = index === chunks.length - 1;
          
          this.send(clientId, {
            type: "chat.chunk",
            data: {
              messageId,
              conversationId,
              content: chunk + (isLast ? "" : " "),
              done: isLast,
              model: response.model,
              tokens: response.usage.total_tokens,
              usage: response.usage,
            },
          });
        }

      } catch (modalError) {
        logger.error("Modal chat completion failed:", modalError);
        
        // Send fallback response if Modal fails
        const errorMessage = "I'm having trouble connecting to the AI service. Please try again in a moment.";
        
        this.send(clientId, {
          type: "chat.chunk",
          data: {
            messageId,
            conversationId,
            content: errorMessage,
            done: true,
            model,
              error: {
                message: "Modal service temporarily unavailable",
                type: "service_error",
              },
          },
        });
      }

    } catch (error) {
      logger.error("Error handling chat message - Error type:", typeof error);
      logger.error("Error handling chat message - Error:", error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        logger.error("Error handling chat message - Stack:", error.stack);
      } else {
        logger.error("Error handling chat message - No stack trace available");
      }
      logger.error("Error handling chat message - Client ID:", clientId);
      try {
        logger.error("Error handling chat message - Data:", JSON.stringify(data, null, 2));
      } catch (stringifyError) {
        logger.error("Error handling chat message - Data (stringify failed):", data);
      }
      logger.error("Error handling chat message - Full error object:", String(error));
      
      this.send(clientId, {
        type: "chat.chunk",
        data: {
          messageId: data?.messageId,
          conversationId: data?.conversationId,
          error: {
            message: "Failed to process chat message",
            type: "internal_error",
          },
          done: true,
        },
      });
    }
  }

  // Handle chat stop requests
  private handleChatStop(clientId: string, data: any) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { conversationId } = data;

    logger.info("Stopping chat stream", { conversationId });

    // Send acknowledgment that the stream has been stopped
    this.send(clientId, {
      type: "chat.stopped",
      data: {
        conversationId,
        message: "Chat stream stopped",
      },
    });
  }

  // Subscribe client to an event type
  private subscribe(clientId: string, eventType: EventType) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.add(eventType);

    if (!this.eventSubscribers.has(eventType)) {
      this.eventSubscribers.set(eventType, new Set());
    }
    this.eventSubscribers.get(eventType)?.add(clientId);

    logger.debug(`Client ${clientId} subscribed to ${eventType}`);

    this.send(clientId, {
      type: "subscription_update",
      data: {
        event: eventType,
        subscribed: true,
        subscriptions: Array.from(client.subscriptions),
      },
    });
  }

  // Unsubscribe client from an event type
  private unsubscribe(clientId: string, eventType: EventType) {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(eventType);
    this.eventSubscribers.get(eventType)?.delete(clientId);

    logger.debug(`Client ${clientId} unsubscribed from ${eventType}`);

    this.send(clientId, {
      type: "subscription_update",
      data: {
        event: eventType,
        subscribed: false,
        subscriptions: Array.from(client.subscriptions),
      },
    });
  }

  // Send a message to a specific client
  send(clientId: string, message: Omit<WebSocketMessage, "timestamp">) {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== OPEN) return false;

    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now(),
    };

    try {
      client.socket.send(JSON.stringify(fullMessage));
      return true;
    } catch (error) {
      logger.error(`Error sending message to client ${clientId}:`, error);
      return false;
    }
  }

  // Broadcast a message to all clients subscribed to an event type
  broadcast(eventType: EventType, data: any) {
    if (!this.eventSubscribers.has(eventType)) return 0;

    const message: WebSocketMessage = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    const messageStr = JSON.stringify(message);
    let count = 0;

    this.eventSubscribers.get(eventType)?.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.socket.readyState === OPEN) {
        try {
          client.socket.send(messageStr);
          count++;
        } catch (error) {
          logger.error(`Error broadcasting to client ${clientId}:`, error);
        }
      }
    });

    return count;
  }

  // Set up periodic ping to keep connections alive
  private setupPingInterval() {
    this.pingInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (client.socket.readyState === OPEN) {
          try {
            client.socket.ping();
          } catch (error) {
            logger.error(`Error pinging client ${clientId}:`, error);
            this.handleClose(clientId);
          }
        }
      });
    }, 30000); // Send ping every 30 seconds
  }

  // Set up carbon intensity updates
  private setupCarbonIntensityUpdates() {
    // In a real app, you would set up a more sophisticated system
    // to monitor for carbon intensity changes and broadcast updates

    // Example: Check for carbon intensity updates every 5 minutes
    setInterval(
      async () => {
        try {
          // This is a simplified example - in a real app, you would track
          // which regions have active subscribers and only update those
          const regions = ["us-west-2", "us-east-1", "eu-west-1"];

          for (const region of regions) {
            const intensity = await carbonService.getCarbonIntensity(region);

            this.broadcast("carbon_intensity", {
              region,
              intensity,
              unit: "gCO2eq/kWh",
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.error("Error updating carbon intensity:", error);
        }
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  // Get client count
  getClientCount(): number {
    return this.clients.size;
  }

  // Get subscription count by event type
  getSubscriptionCounts(): Record<EventType, number> {
    const counts = {} as Record<EventType, number>;

    EVENT_TYPES.forEach((eventType) => {
      counts[eventType] = this.eventSubscribers.get(eventType)?.size || 0;
    });

    return counts;
  }
}

export const webSocketService = new WebSocketService();
