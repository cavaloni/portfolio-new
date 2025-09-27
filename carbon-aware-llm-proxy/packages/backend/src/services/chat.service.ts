import { logger } from "../utils/logger";
import { carbonService } from "./carbon.service";
import { supabaseService } from "./supabase.service";

class ChatService {
  async createConversation(
    userId: string,
    title?: string,
    modelId?: string,
    temperature?: number,
    maxTokens?: number,
    carbonAware: boolean = true,
  ) {
    const conversationData = {
      user_id: userId,
      title: title || "New Conversation",
      model_id: modelId || null,
      temperature: temperature ?? 0.7,
      max_tokens: maxTokens ?? null,
      carbon_aware: carbonAware,
    } as any;

    const created = await supabaseService.createConversation(conversationData);
    return created;
  }

  async getConversations(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;
    const { data, count } = await supabaseService.getConversationsByUserIdWithCount(
      userId,
      limit,
      offset,
    );

    return {
      data: data || [],
      meta: {
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        limit,
      },
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conv = await supabaseService.getConversationById(conversationId);
    if (!conv || conv.user_id !== userId) return null;
    // Map to camelCase keys expected by callers
    return {
      ...conv,
      userId: conv.user_id,
      modelId: conv.model_id,
      maxTokens: conv.max_tokens,
      carbonAware: conv.carbon_aware,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at,
    } as any;
  }

  async updateConversation(
    userId: string,
    conversationId: string,
    updates: Partial<{ title: string; modelId: string | null; temperature: number; maxTokens: number | null; carbonAware: boolean }>,
  ) {
    const conv = await supabaseService.getConversationById(conversationId);
    if (!conv || conv.user_id !== userId) return null;

    // Map camelCase to snake_case
    const mapped: any = {};
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.modelId !== undefined) mapped.model_id = updates.modelId;
    if (updates.temperature !== undefined) mapped.temperature = updates.temperature;
    if (updates.maxTokens !== undefined) mapped.max_tokens = updates.maxTokens;
    if (updates.carbonAware !== undefined) mapped.carbon_aware = updates.carbonAware;

    await supabaseService.updateConversation(conversationId, mapped);
    return await this.getConversation(userId, conversationId);
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conv = await supabaseService.getConversationById(conversationId);
    if (!conv || conv.user_id !== userId) return false;
    await supabaseService.deleteConversation(conversationId);
    return true;
  }

  async addMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
    modelId?: string,
    tokens?: number,
    carbonFootprint?: {
      emissions: number;
      energy: number;
      intensity?: number;
      region?: string;
      modelName?: string;
      provider?: string;
    },
  ) {
    // Insert message
    const msg = await supabaseService.createMessage({
      conversation_id: conversationId,
      role,
      content,
      model_id: modelId || null,
      tokens: tokens ?? null,
      is_streaming: false,
      is_complete: true,
    });

    // Create carbon footprint if provided
    if (carbonFootprint && msg?.id) {
      await supabaseService.createCarbonFootprint({
        message_id: msg.id,
        emissions: carbonFootprint.emissions,
        energy: carbonFootprint.energy,
        ...(carbonFootprint.intensity !== undefined
          ? { intensity: carbonFootprint.intensity }
          : {}),
        ...(carbonFootprint.region !== undefined
          ? { region: carbonFootprint.region }
          : {}),
        ...(carbonFootprint.modelName !== undefined
          ? { model_name: carbonFootprint.modelName }
          : {}),
        ...(carbonFootprint.provider !== undefined
          ? { provider: carbonFootprint.provider }
          : {}),
      });
    }

    // Best-effort update conversation updated_at
    await supabaseService.updateConversation(conversationId, { updated_at: new Date().toISOString() });

    return msg;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    before?: string,
  ) {
    const conv = await supabaseService.getConversationById(conversationId);
    if (!conv || conv.user_id !== userId) return [];

    const messages = await supabaseService.getMessagesByConversationIdWithBefore(
      conversationId,
      limit,
      before,
    );
    return messages;
  }

  async deleteMessage(userId: string, messageId: string) {
    const msg = await supabaseService.getMessageById(messageId);
    if (!msg) return false;
    const conv = await supabaseService.getConversationById(msg.conversation_id);
    if (!conv || conv.user_id !== userId) return false;
    await supabaseService.deleteMessage(messageId);
    return true;
  }

  // Helper method to calculate carbon footprint for a message
  public async calculateCarbonFootprint(
    modelId: string,
    tokens: number,
    region?: string | null,
  ): Promise<{
    emissions: number;
    energy: number;
    intensity?: number;
    region?: string;
    modelName?: string;
    provider?: string;
  }> {
    // Fetch model metadata from Supabase (snake_case columns)
    const model = await supabaseService.getModelById(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Determine carbon intensity for the region (gCO2e/kWh)
    const carbonIntensity = region
      ? await carbonService.getCarbonIntensity(region)
      : (model.carbon_intensity?.avg ?? 300); // default average if missing

    // Estimate energy per token (Wh)
    // Prefer explicit energy_per_token if present; otherwise approximate from carbon intensity baseline
    const energyPerTokenWh: number =
      model.energy_per_token ?? (carbonIntensity / 300000); // ~inverse conversion used previously

    // Convert Wh to kWh for total energy
    const energyKWh = (energyPerTokenWh * tokens) / 1000;

    // Emissions = energy (kWh) * carbon intensity (gCO2e/kWh)
    const emissionsG = energyKWh * carbonIntensity;

    return {
      emissions: emissionsG,
      energy: energyKWh,
      intensity: carbonIntensity,
      region: region || undefined,
      modelName: model.name,
      provider: model.provider,
    };
  }
}

export const chatService = new ChatService();
