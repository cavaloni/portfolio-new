import { Router } from "express";
import { z } from "zod";
import { logger } from "../../utils/logger";
import { ApiError } from "../../middleware/errorHandler";
import { modalProviderService } from "../../services/modal.provider";

// Define Zod schemas for request validation
const chatCompletionSchema = z
  .object({
    model: z.string().min(1, "Model is required"),
    messages: z
      .array(
        z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string().min(1, "Message content is required"),
          name: z.string().optional(),
        }),
      )
      .min(1, "At least one message is required"),
    temperature: z.number().min(0).max(2).optional().default(1),
    max_tokens: z.number().int().positive().optional(),
    stream: z.boolean().optional().default(false),
    // Add other OpenAI-compatible parameters as needed
  })
  .strict();

export const chatRouter = Router();

// POST /v1/chat/completions
chatRouter.post("/completions", async (req, res, next) => {
  try {
    // Validate request body
    const validatedBody = chatCompletionSchema.safeParse(req.body);

    if (!validatedBody.success) {
      throw new ApiError(400, "Invalid request body", true, {
        errors: validatedBody.error.issues,
      });
    }

    const { model, messages, temperature, max_tokens, stream } =
      validatedBody.data;

    logger.info("Chat completion request", {
      model,
      messageCount: messages.length,
      temperature,
      max_tokens,
      stream,
    });

    // Prefer Modal provider when configured
    const provider = (process.env.LLM_PROVIDER || "modal").toLowerCase();
    if (provider === "modal") {
      try {
        const response = await modalProviderService.sendChatCompletion({
          model,
          messages,
          temperature,
          max_tokens,
          stream,
        });

        if (stream) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.write(`data: ${JSON.stringify(response)}\n\n`);
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }
        res.json(response);
        return;
      } catch (error) {
        logger.error("Modal chat completion failed:", error);
      }
    }

    // Fallback mock response (for development or when RunPod is disabled)
    const response = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          message: {
            role: "assistant",
            content: provider === "modal"
              ? "Modal service is temporarily unavailable. This is a fallback response."
              : "This is a mock response. No provider configured.",
          },
          finish_reason: "stop",
          index: 0,
        },
      ],
      usage: {
        prompt_tokens: 10, // This would be calculated
        completion_tokens: 8, // This would be calculated
        total_tokens: 18,
      },
      carbon_footprint: {
        emissions_gco2e: 0.1, // Mock carbon footprint
        energy_consumed_kwh: 0.0001,
        region: "mock",
        model_name: model,
      },
    };

    if (stream) {
      // Set headers for streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Mock streaming response
      const mockResponse = JSON.stringify(response.choices[0].message);
      res.write(
        `data: ${JSON.stringify({
          id: response.id,
          object: "chat.completion.chunk",
          created: response.created,
          model: response.model,
          choices: [
            {
              delta: { role: "assistant" },
              index: 0,
              finish_reason: null,
            },
          ],
        })}\n\n`,
      );

      // Split the response into chunks for streaming effect
      const chunks = [];
      const chunkSize = 5;
      for (let i = 0; i < mockResponse.length; i += chunkSize) {
        chunks.push(mockResponse.substring(i, i + chunkSize));
      }

      // Send chunks with a small delay
      for (const [index, chunk] of chunks.entries()) {
        await new Promise((resolve) => setTimeout(resolve, 50)); // 50ms delay between chunks
        res.write(
          `data: ${JSON.stringify({
            id: response.id,
            object: "chat.completion.chunk",
            created: response.created,
            model: response.model,
            choices: [
              {
                delta: { content: chunk },
                index: 0,
                finish_reason: index === chunks.length - 1 ? "stop" : null,
              },
            ],
          })}\n\n`,
        );
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } else {
      res.status(200).json(response);
    }
  } catch (error) {
    next(error);
  }
});
