import axios, { AxiosInstance } from "axios";
import type { AxiosResponse } from "axios";
import type { IncomingMessage } from "http";
import { Agent as HttpAgent } from "http";
import { Agent as HttpsAgent } from "https";
import dns from "dns";
import { logger } from "../utils/logger";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
}

export interface ChatCompletionResponseUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: ChatCompletionResponseUsage;
  // Optional: Modal app may include extra fields; keep response open-ended
  [key: string]: any;
}

class ModalProviderService {
  private client: AxiosInstance;
  private endpointUrl: string;
  private apiKey?: string;
  private httpAgent: HttpAgent;
  private httpsAgent: HttpsAgent;

  constructor() {
    this.endpointUrl = process.env.MODAL_ENDPOINT_URL || "";
    this.apiKey = process.env.MODAL_API_KEY;

    if (!this.endpointUrl) {
      logger.warn("MODAL_ENDPOINT_URL not set; Modal provider will fail until configured");
    }

    // Prefer IPv4 to avoid occasional IPv6 connectivity issues in some hosts
    const preferIPv4Lookup: any = (
      hostname: string,
      options: any,
      callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void,
    ) => dns.lookup(hostname, { family: 4, all: false }, callback as any);

    // Create keep-alive agents once and reuse
    this.httpAgent = new HttpAgent({ keepAlive: true, lookup: preferIPv4Lookup });
    this.httpsAgent = new HttpsAgent({ keepAlive: true, lookup: preferIPv4Lookup });

    this.client = axios.create({
      baseURL: this.endpointUrl,
      timeout: parseInt(process.env.MODAL_TIMEOUT_MS || "30000"),
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  async sendChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.endpointUrl) {
      throw new Error("MODAL_ENDPOINT_URL is not configured");
    }

    try {
      const response = await this.client.post<ChatCompletionResponse>(
        "/v1/chat/completions",
        {
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          stream: request.stream || false,
          top_p: request.top_p,
          frequency_penalty: request.frequency_penalty,
          presence_penalty: request.presence_penalty,
          stop: request.stop,
        }
      );

      if (!response.data) {
        throw new Error("Empty response from Modal endpoint");
      }

      return response.data;
    } catch (error: any) {
      if (error.response) {
        const details = error.response.data?.error || error.response.data;
        console.log(error.response)
        logger.error("Modal provider error:", { status: error.response.status, details, error: error.response });
        throw new Error(
          `Modal endpoint error (${error.response.status}): ${
            details?.message || error.response.statusText || "Unknown error"
          }`
        );
      }
      if (error.code === "ECONNABORTED") {
        throw new Error("Modal request timeout");
      }
      throw new Error(`Modal network error: ${error.message}`);
    }
  }

  async sendChatCompletionStream(
    request: ChatCompletionRequest,
  ): Promise<AxiosResponse<IncomingMessage>> {
    if (!this.endpointUrl) {
      throw new Error("MODAL_ENDPOINT_URL is not configured");
    }

    try {
      const response = await this.client.post<IncomingMessage>(
        "/v1/chat/completions",
        {
          model: request.model,
          messages: request.messages,
          temperature: request.temperature,
          max_tokens: request.max_tokens,
          stream: true,
          top_p: request.top_p,
          frequency_penalty: request.frequency_penalty,
          presence_penalty: request.presence_penalty,
          stop: request.stop,
        },
        {
          responseType: "stream",
          headers: { Accept: "text/event-stream" },
          // Disable timeout so long-lived SSE streams aren't aborted by Axios
          timeout: 0,
          httpAgent: this.httpAgent,
          httpsAgent: this.httpsAgent,
          decompress: false,
        },
      );
      return response;
    } catch (error: any) {
      if (error.response) {
        const details = error.response.data?.error || error.response.data;
        logger.error("Modal provider stream error:", { status: error.response.status, details });
        throw new Error(
          `Modal endpoint stream error (${error.response.status}): ${
            details?.message || error.response.statusText || "Unknown error"
          }`,
        );
      }
      if (error.code === "ECONNABORTED") {
        throw new Error("Modal request timeout");
      }
      throw new Error(`Modal network error: ${error.message}`);
    }
  }
}

export const modalProviderService = new ModalProviderService();


