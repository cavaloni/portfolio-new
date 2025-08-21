import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import axios from "axios";
import crypto from "crypto";
import { logger } from "../../utils/logger";
import { ApiError } from "../../middleware/errorHandler";
import { modalProviderService } from "../../services/modal.provider";
import { databaseService } from "../../services/database.service";
import { carbonService } from "../../services/carbon.service";
import { ModelDeployment } from "../../entities/ModelDeployment";
import { calculateTimeoutMs, TimeoutStrategy } from "../../services/deployment-routing.service";

// Define Zod schemas for request validation
const chatCompletionSchema = z
  .object({
    deploymentId: z.string().min(1, "Deployment ID is required"), // Primary deployment
    fallbackIds: z.array(z.string()).optional(), // NEW: Fallback deployment IDs
    timeoutStrategy: z.enum(["quick", "patient", "fallback"]).optional(), // NEW: Timeout strategy
    expectedDelay: z.number().optional(), // NEW: Expected cold start delay
    greenWeight: z.number().min(0).max(1).optional(), // NEW: For timeout calculation
    model: z.string().min(1, "Model is required").optional(), // Make optional since we get it from deployment
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
  stream: z.boolean().optional().default(true),
    // Add other OpenAI-compatible parameters as needed
  })
  .strict();

function createSignature(
  body: string,
  timestamp: string,
  secret: string,
): string {
  const message = body + timestamp;
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

// Helper function to attempt request with timeout
async function attemptRequest(
  deployment: ModelDeployment,
  workerBody: any,
  timeout: number,
  isStreaming: boolean = false
): Promise<any> {
  const bodyJson = JSON.stringify(workerBody);
  const timestamp = Date.now().toString();
  const signature = createSignature(bodyJson, timestamp, deployment.secret);

  const config = {
    headers: {
      "Content-Type": "application/json",
      "x-signature": signature,
      "x-timestamp": timestamp,
      ...(isStreaming ? { Accept: "text/event-stream" } : {}),
    },
    ...(isStreaming ? { timeout: 0, responseType: "stream" as const } : { timeout }),
  };

  return await axios.post(
    `${deployment.ingressUrl}/v1/chat/completions`,
    workerBody,
    config
  );
}

// Enhanced function to try deployment chain with fallbacks
async function tryDeploymentChain(
  deploymentIds: string[],
  workerBody: any,
  timeoutStrategy: TimeoutStrategy = 'fallback',
  expectedDelay: number = 0,
  greenWeight: number = 0,
  isStreaming: boolean = false
): Promise<{ response: any; usedFallback: boolean; fallbackIndex: number }> {
  const ds = databaseService.getDataSource();
  const repo = ds.getRepository(ModelDeployment);
  
  let lastError: any;
  
  for (const [index, deploymentId] of deploymentIds.entries()) {
    try {
      const deployment = await repo.findOne({
        where: { id: deploymentId, status: "deployed" },
      });

      if (!deployment || !deployment.ingressUrl) {
        logger.warn(`Deployment ${deploymentId} not found or unavailable`);
        continue;
      }

      // Calculate timeout based on strategy and position in chain
      let timeout: number;
      if (index === 0) {
        // Primary deployment uses full timeout calculation
        timeout = calculateTimeoutMs(timeoutStrategy, greenWeight, expectedDelay);
      } else {
        // Fallbacks get shorter, fixed timeout
        timeout = 15000;
      }

      logger.info(`Attempting deployment ${deploymentId} with ${timeout}ms timeout (attempt ${index + 1}/${deploymentIds.length})`);
      
      const response = await attemptRequest(deployment, workerBody, timeout, isStreaming);
      
      return {
        response,
        usedFallback: index > 0,
        fallbackIndex: index,
      };
      
    } catch (error: any) {
      lastError = error;
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      
      logger.warn(`Deployment ${deploymentId} failed:`, {
        error: error.message,
        isTimeout,
        attempt: index + 1,
        totalAttempts: deploymentIds.length,
      });
      
      // If this isn't the last attempt and it's a timeout, try the next fallback
      if (index < deploymentIds.length - 1 && isTimeout) {
        logger.info(`Timeout on deployment ${deploymentId}, trying fallback...`);
        continue;
      }
    }
  }
  
  // All attempts failed
  throw lastError || new Error('All deployment attempts failed');
}

export const chatRouter = Router();

// POST /v1/chat/completions
chatRouter.post("/completions", async (req: Request, res: Response, next) => {
  try {
    // Validate request body
    const validatedBody = chatCompletionSchema.safeParse(req.body);

    if (!validatedBody.success) {
      throw new ApiError(400, "Invalid request body", true, {
        errors: validatedBody.error.issues,
      });
    }

    const { 
      deploymentId, 
      fallbackIds = [], 
      timeoutStrategy = 'fallback',
      expectedDelay = 0,
      greenWeight = 0,
      model, 
      messages, 
      temperature, 
      max_tokens, 
      stream: _requestedStream 
    } = validatedBody.data;

    // Force streaming for all chat completions
    const stream = true;
    logger.info('Forcing streaming for chat completion requests');

    // Log provider flags early for easier debugging
    logger.debug("Provider flags", {
      LLM_PROVIDER: process.env.LLM_PROVIDER,
      ROUTING_MOCK_ENABLED: process.env.ROUTING_MOCK_ENABLED,
    });

    // If routing mock mode is enabled, dispatch to OpenRouter and adapt response
    if (process.env.ROUTING_MOCK_ENABLED === "true") {
      try {
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
          throw new ApiError(500, "OPENROUTER_API_KEY is not configured", true);
        }

        // Handle mock deployment IDs
        let selectedModelForDisplay: string;
        let mockRegion: string;
        
        if (deploymentId.startsWith('mock-')) {
          // Parse mock deployment ID to extract model and region
          const parts = deploymentId.split('-');
          if (parts.length >= 3) {
            // Reconstruct model ID (handle model IDs with slashes and dashes)
            const modelParts = parts.slice(1, -1);
            selectedModelForDisplay = modelParts.join('-').replace(/-/g, '/');
            // Fix common replacements
            selectedModelForDisplay = selectedModelForDisplay
              .replace(/mistralai\/mistral/g, 'mistralai/mistral')
              .replace(/databricks\/dbrx/g, 'databricks/dbrx')
              .replace(/meta\/llama/g, 'meta-llama')
              .replace(/tiiuae\/falcon/g, 'tiiuae/falcon');
            mockRegion = parts[parts.length - 1];
          } else {
            selectedModelForDisplay = model || "mistralai/ministral-8b";
            mockRegion = "global";
          }
        } else {
          // Real deployment - get from database
          const ds = databaseService.getDataSource();
          const repo = ds.getRepository(ModelDeployment);
          const deployment = await repo.findOne({
            where: { id: deploymentId, status: "deployed" },
          });

          if (!deployment) {
            throw new ApiError(400, "Invalid or unavailable deployment", true);
          }

          selectedModelForDisplay = model || deployment.modelId || "mistralai/ministral-8b";
          mockRegion = deployment.region || "global";
        }
        
        // Always use ministral-8b for actual OpenRouter calls, regardless of mock selection
        const actualOpenRouterModel = "mistralai/ministral-8b";

        logger.info("Mock routing: dispatching to OpenRouter", {
          displayModel: selectedModelForDisplay,
          actualModel: actualOpenRouterModel,
          deploymentId,
          hasOpenRouterKey: Boolean(apiKey),
        });

        const openRouterBody = {
          model: actualOpenRouterModel,
          messages,
          temperature,
          max_tokens,
          stream: true,
        };

        logger.info("Mock routing: requesting OpenRouter streaming endpoint", { 
          displayModel: selectedModelForDisplay,
          actualModel: actualOpenRouterModel
        });

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(openRouterBody),
        });

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        // Set streaming headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Get realistic carbon intensity for the mock region
        const carbonIntensity = await carbonService.getCarbonIntensity(mockRegion);

        // Send metadata as the first event (show the selected model for display)
        const metadata = {
          type: "metadata",
          model: selectedModelForDisplay,
          region: mockRegion,
          co2: carbonIntensity.toString(),
          usedFallback: false,
          fallbackIndex: 0,
        };
        res.write(`data: ${JSON.stringify(metadata)}\n\n`);

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Append new chunk to buffer
            buffer += decoder.decode(value, { stream: true });

            // Process complete lines from buffer
            while (true) {
              const lineEnd = buffer.indexOf('\n');
              if (lineEnd === -1) break;

              const line = buffer.slice(0, lineEnd).trim();
              buffer = buffer.slice(lineEnd + 1);

              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  res.write('data: [DONE]\n\n');
                  res.end();
                  return;
                }

                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    // Forward the chunk to the client
                    res.write(`data: ${data}\n\n`);
                  } else {
                    // Forward other chunks (like role assignment)
                    res.write(`data: ${data}\n\n`);
                  }
                } catch (e) {
                  // Ignore invalid JSON
                  logger.warn("Invalid JSON in OpenRouter stream:", line);
                }
              }
            }
          }
        } finally {
          reader.cancel();
        }

        return;
      } catch (err: any) {
        // Log OpenRouter error details
        logger.error("OpenRouter mock routing error", {
          message: err?.message,
          status: err?.response?.status,
          responseData: err?.response?.data,
        });
        return next(err);
      }
    }

    // Build deployment chain (primary + fallbacks)
    const deploymentChain = [deploymentId, ...fallbackIds];
    
    // Get primary deployment for model info
    const ds = databaseService.getDataSource();
    const repo = ds.getRepository(ModelDeployment);
    const primaryDeployment = await repo.findOne({
      where: { id: deploymentId, status: "deployed" },
    });

    if (!primaryDeployment || !primaryDeployment.ingressUrl) {
      throw new ApiError(400, "Invalid or unavailable primary deployment", true);
    }

    // Use model from deployment if not provided
    const effectiveModel = model || primaryDeployment.modelId;

    logger.info("Chat completion request with fallback chain", {
      primaryDeploymentId: deploymentId,
      fallbackIds,
      model: effectiveModel,
      messageCount: messages.length,
      temperature,
      max_tokens,
      stream,
      timeoutStrategy,
      expectedDelay,
    });

    // Prepare request for worker
    const workerBody = {
      model: effectiveModel,
      messages,
      temperature,
      max_tokens,
      stream,
    };

    try {
      // Attempt request with fallback chain
      const { response, usedFallback, fallbackIndex } = await tryDeploymentChain(
        deploymentChain,
        workerBody,
        timeoutStrategy,
        expectedDelay,
        greenWeight,
        !!stream
      );

      // Get the deployment that was actually used for metadata
      const usedDeploymentId = deploymentChain[fallbackIndex];
      const usedDeployment = await repo.findOne({
        where: { id: usedDeploymentId, status: "deployed" },
      });

      if (!usedDeployment) {
        throw new ApiError(500, "Used deployment not found", true);
      }

      // Get CO2 data for the used deployment
      const co2Intensity = await carbonService.getCarbonIntensity(
        usedDeployment.region || "us-east",
      );

      // Set metadata headers unless routing is in mock mode (to preserve mocked UI display)
      if (process.env.ROUTING_MOCK_ENABLED !== 'true') {
        res.setHeader("x-routly-model", usedDeployment.modelId);
        res.setHeader("x-routly-region", usedDeployment.region || "global");
        res.setHeader("x-routly-co2", co2Intensity.toString());
        if (usedFallback) {
          res.setHeader("x-routly-fallback-used", "true");
          res.setHeader("x-routly-fallback-index", fallbackIndex.toString());
          logger.info(`Used fallback deployment ${usedDeploymentId} (index ${fallbackIndex})`);
        }
      }

      if (stream) {
        // Stream proxy
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        // Send metadata as the first event
        const metadata = {
          type: "metadata",
          model: usedDeployment.modelId,
          region: usedDeployment.region || "global",
          co2: co2Intensity.toString(),
          usedFallback,
          fallbackIndex,
        };
        res.write(`data: ${JSON.stringify(metadata)}

`);
        
        response.data.pipe(res);
        return;
      } else {
        // Non-streaming proxy
        res.json(response.data);
        return;
      }
    } catch (error: any) {
      logger.error("All deployment attempts failed:", error);
      if (error.response?.status === 401) {
        throw new ApiError(401, "Worker authentication failed", true);
      }
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      if (isTimeout) {
        throw new ApiError(408, "Request timeout - all deployments unavailable", true);
      }
      throw new ApiError(502, "All deployment attempts failed", true);
    }

    // Fallback mock response (should not reach here with new routing)
    const response = {
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: effectiveModel,
      choices: [
        {
          message: {
            role: "assistant",
            content:
              "Service is temporarily unavailable. This is a fallback response.",
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
        model_name: effectiveModel,
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
