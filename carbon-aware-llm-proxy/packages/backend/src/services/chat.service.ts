import { v4 as uuidv4 } from "uuid";
import { QueryRunner } from "typeorm";
import { databaseService } from "./database.service";
import { logger } from "../utils/logger";
import { Conversation } from "../entities/Conversation";
import { Message } from "../entities/Message";
import { CarbonFootprint } from "../entities/CarbonFootprint";
import { User } from "../entities/User";
import { ModelInfo } from "../entities/ModelInfo";
import { modelService } from "./model.service";
import { carbonService } from "./carbon.service";
import { MessageRole } from "../entities/Message";

class ChatService {
  async createConversation(
    userId: string,
    title?: string,
    modelId?: string,
    temperature?: number,
    maxTokens?: number,
    carbonAware: boolean = true,
  ) {
    const conversationRepository = databaseService
      .getDataSource()
      .getRepository(Conversation);
    const userRepository = databaseService.getDataSource().getRepository(User);

    // First, get the user to associate with the conversation
    const user = await userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error("User not found");
    }

    // Create a new conversation with the required parameters
    const conversation = new Conversation(userId, user);
    conversation.title = title || "New Conversation";
    conversation.modelId = modelId || null;
    conversation.temperature = temperature || 0.7;
    conversation.maxTokens = maxTokens || null;
    conversation.carbonAware = carbonAware;

    return await conversationRepository.save(conversation);
  }

  async getConversations(userId: string, page: number = 1, limit: number = 20) {
    const conversationRepository = databaseService
      .getDataSource()
      .getRepository(Conversation);

    const [conversations, total] = await conversationRepository.findAndCount({
      where: { userId },
      order: { updatedAt: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
      relations: ["messages"],
    });

    return {
      data: conversations,
      meta: {
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async getConversation(userId: string, conversationId: string) {
    const conversationRepository = databaseService
      .getDataSource()
      .getRepository(Conversation);

    return await conversationRepository.findOne({
      where: { id: conversationId, userId },
      relations: ["messages", "messages.carbonFootprint"],
    });
  }

  async updateConversation(
    userId: string,
    conversationId: string,
    updates: Partial<Conversation>,
  ) {
    const conversationRepository = databaseService
      .getDataSource()
      .getRepository(Conversation);

    await conversationRepository.update(
      { id: conversationId, userId },
      updates,
    );

    return await this.getConversation(userId, conversationId);
  }

  async deleteConversation(userId: string, conversationId: string) {
    const conversationRepository = databaseService
      .getDataSource()
      .getRepository(Conversation);

    // This will cascade delete all related messages due to the CASCADE option in the entity
    const result = await conversationRepository.delete({
      id: conversationId,
      userId,
    });

    return (
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0
    );
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
    queryRunner?: QueryRunner,
  ) {
    const messageRepository = databaseService
      .getDataSource()
      .getRepository(Message);
    const conversationRepository = databaseService
      .getDataSource()
      .getRepository(Conversation);

    // Start a transaction if one isn't provided
    const shouldReleaseQueryRunner = !queryRunner;
    const qr =
      queryRunner || databaseService.getDataSource().createQueryRunner();

    if (!queryRunner) {
      await qr.connect();
      await qr.startTransaction();
    }

    try {
      // Create the message
      const message = new Message();
      message.conversationId = conversationId;
      message.role = role as MessageRole; // Ensure the role matches the MessageRole enum
      message.content = content;
      message.modelId = modelId || null;
      message.tokens = tokens || null;
      message.isStreaming = false;
      message.isComplete = true;

      const savedMessage = await qr.manager.save(Message, message);

      // Create carbon footprint if provided
      if (carbonFootprint) {
        const footprint = new CarbonFootprint();
        footprint.messageId = savedMessage.id;
        footprint.emissions = carbonFootprint.emissions;
        footprint.energy = carbonFootprint.energy;

        // Only assign if the value is defined
        if (carbonFootprint.intensity !== undefined) {
          footprint.intensity = carbonFootprint.intensity;
        }
        if (carbonFootprint.region !== undefined) {
          footprint.region = carbonFootprint.region;
        }
        if (carbonFootprint.modelName !== undefined) {
          footprint.modelName = carbonFootprint.modelName;
        }
        if (carbonFootprint.provider !== undefined) {
          footprint.provider = carbonFootprint.provider;
        }

        await qr.manager.save(CarbonFootprint, footprint);
        savedMessage.carbonFootprint = footprint;
      }

      // Update conversation stats
      const conversation = await qr.manager.findOne(Conversation, {
        where: { id: conversationId },
        relations: ["messages"],
      });

      if (conversation) {
        conversation.updatedAt = new Date();
        conversation.messageCount = (conversation.messages?.length || 0) + 1;
        conversation.totalTokens =
          (conversation.totalTokens || 0) + (tokens || 0);

        if (carbonFootprint) {
          conversation.totalEmissions =
            (conversation.totalEmissions || 0) + carbonFootprint.emissions;
          conversation.totalEnergy =
            (conversation.totalEnergy || 0) + carbonFootprint.energy;
        }

        await qr.manager.save(Conversation, conversation);
      }

      if (!queryRunner) {
        await qr.commitTransaction();
      }

      return savedMessage;
    } catch (error) {
      if (!queryRunner) {
        await qr.rollbackTransaction();
      }
      logger.error("Error adding message:", error);
      throw new Error("Failed to add message");
    } finally {
      if (shouldReleaseQueryRunner) {
        await qr.release();
      }
    }
  }

  async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50,
    before?: string,
  ) {
    const messageRepository = databaseService
      .getDataSource()
      .getRepository(Message);

    const query = messageRepository
      .createQueryBuilder("message")
      .leftJoinAndSelect("message.carbonFootprint", "carbonFootprint")
      .innerJoin("message.conversation", "conversation")
      .where("conversation.id = :conversationId", { conversationId })
      .andWhere("conversation.userId = :userId", { userId })
      .orderBy("message.createdAt", "DESC")
      .take(limit);

    if (before) {
      query.andWhere("message.createdAt < :before", { before });
    }

    return await query.getMany();
  }

  async deleteMessage(userId: string, messageId: string) {
    const messageRepository = databaseService
      .getDataSource()
      .getRepository(Message);

    // This will cascade delete the carbon footprint due to the CASCADE option in the entity
    const result = await messageRepository
      .createQueryBuilder()
      .delete()
      .from(Message)
      .where("id = :messageId", { messageId })
      .andWhere(
        "conversationId IN (SELECT id FROM conversations WHERE userId = :userId)",
        { userId },
      )
      .execute();

    return (
      result.affected !== null &&
      result.affected !== undefined &&
      result.affected > 0
    );
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
    const model = await modelService.getModelById(modelId);
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Get carbon intensity for the region (gCO2e/kWh)
    const carbonIntensity = region
      ? await carbonService.getCarbonIntensity(region)
      : model.carbonIntensity.avg;

    // Calculate energy usage per token (using model's energy consumption data)
    // Model carbonIntensity.avg represents baseline energy per token in Wh
    // Convert to kWh: divide by 1000
    const energyPerToken = model.getEnergyPerToken(); // Use model's energy method
    const energy = (energyPerToken * tokens) / 1000; // Convert Wh to kWh

    // Calculate emissions: energy (kWh) * carbon intensity (gCO2e/kWh)
    const emissions = energy * carbonIntensity;

    return {
      emissions,
      energy,
      intensity: carbonIntensity,
      region: region || undefined,
      modelName: model.name,
      provider: model.provider,
    };
  }
}

export const chatService = new ChatService();
