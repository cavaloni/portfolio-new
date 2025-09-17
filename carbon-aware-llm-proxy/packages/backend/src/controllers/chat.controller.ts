import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { chatService } from "../services/chat.service";
import { logger } from "../utils/logger";

export class ChatController {
  // Conversation endpoints
  async createConversation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const { title, modelId, temperature, maxTokens, carbonAware } = req.body;

      const conversation = await chatService.createConversation(
        userId,
        title,
        modelId,
        temperature,
        maxTokens,
        carbonAware,
      );

      res.status(201).json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      logger.error("Create conversation error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create conversation",
      });
    }
  }

  async getConversations(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await chatService.getConversations(userId, page, limit);

      res.json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      logger.error("Get conversations error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch conversations",
      });
    }
  }

  async getConversation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { conversationId } = req.params;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const conversation = await chatService.getConversation(
        userId,
        conversationId,
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error("Get conversation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch conversation",
      });
    }
  }

  async updateConversation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { conversationId } = req.params;
      const updates = req.body;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      // Only allow certain fields to be updated
      const allowedUpdates = [
        "title",
        "modelId",
        "temperature",
        "maxTokens",
        "carbonAware",
      ];
      const validUpdates = Object.keys(updates)
        .filter((key) => allowedUpdates.includes(key))
        .reduce(
          (obj, key) => {
            obj[key] = updates[key];
            return obj;
          },
          {} as Record<string, any>,
        );

      if (Object.keys(validUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid updates provided",
        });
      }

      const conversation = await chatService.updateConversation(
        userId,
        conversationId,
        validUpdates,
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error("Update conversation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update conversation",
      });
    }
  }

  async deleteConversation(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { conversationId } = req.params;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const success = await chatService.deleteConversation(
        userId,
        conversationId,
      );

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      res.json({
        success: true,
        message: "Conversation deleted successfully",
      });
    } catch (error) {
      logger.error("Delete conversation error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete conversation",
      });
    }
  }

  // Message endpoints
  async addMessage(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { conversationId } = req.params;
      const { content, role = "user", modelId, tokens } = req.body;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      // Verify the conversation belongs to the user
      const conversation = await chatService.getConversation(
        userId,
        conversationId,
      );
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      // Calculate carbon footprint if this is an assistant message with tokens
      let carbonFootprint;
      if (role === "assistant" && modelId && tokens) {
        try {
          // Get region from request headers or body, fallback to null for global average
          const region = req.headers['x-routly-region'] as string || req.body.region || null;
          carbonFootprint = await chatService.calculateCarbonFootprint(
            modelId,
            tokens,
            conversation.carbonAware && region ? region : null,
          );
          logger.info('Calculated carbon footprint:', {
            modelId,
            tokens,
            region,
            carbonFootprint
          });
        } catch (error) {
          logger.warn("Failed to calculate carbon footprint:", error);
        }
      }

      const message = await chatService.addMessage(
        conversationId,
        role as "user" | "assistant" | "system",
        content,
        modelId || conversation.modelId,
        tokens,
        carbonFootprint,
      );

      res.status(201).json({
        success: true,
        data: message,
      });
    } catch (error: any) {
      logger.error("Add message error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to add message",
      });
    }
  }

  async getMessages(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before as string | undefined;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      // Verify the conversation belongs to the user
      const conversation = await chatService.getConversation(
        userId,
        conversationId,
      );
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      const messages = await chatService.getMessages(
        conversationId,
        userId,
        limit,
        before,
      );

      res.json({
        success: true,
        data: messages,
      });
    } catch (error) {
      logger.error("Get messages error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch messages",
      });
    }
  }

  async deleteMessage(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { messageId } = req.params;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const success = await chatService.deleteMessage(userId, messageId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      res.json({
        success: true,
        message: "Message deleted successfully",
      });
    } catch (error) {
      logger.error("Delete message error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete message",
      });
    }
  }
}

export const chatController = new ChatController();
