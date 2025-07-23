#!/usr/bin/env ts-node

import "dotenv/config";
import axios from "axios";
import { logger } from "../src/utils/logger";

async function testRunPodMutations() {
  const apiKey = process.env.RUNPOD_API_KEY;
  
  if (!apiKey) {
    logger.error("❌ RUNPOD_API_KEY not found in environment variables");
    return;
  }

  logger.info("🔑 RunPod API Key found");

  const client = axios.create({
    baseURL: "https://api.runpod.io/graphql",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  try {
    // Test 1: Check if saveTemplate mutation exists
    logger.info("🧪 Testing saveTemplate mutation...");
    const templateMutation = `
      mutation {
        saveTemplate(input: {
          containerDiskInGb: 50
          dockerArgs: "python -m vllm.entrypoints.openai.api_server --model meta-llama/Meta-Llama-3-8B-Instruct --host 0.0.0.0 --port 8000"
          env: [
            {key: "MODEL_NAME", value: "meta-llama/Meta-Llama-3-8B-Instruct"}
            {key: "MAX_MODEL_LEN", value: "8192"}
            {key: "TENSOR_PARALLEL_SIZE", value: "1"}
          ]
          imageName: "vllm/vllm-openai:latest"
          name: "test-template-${Date.now()}"
          ports: "8000/http"
          volumeInGb: 50
          volumeMountPath: "/workspace"
        }) {
          id
          name
        }
      }
    `;

    const templateResponse = await client.post("", { query: templateMutation });
    
    if (templateResponse.data.errors) {
      logger.error("❌ saveTemplate mutation failed:");
      logger.error(JSON.stringify(templateResponse.data.errors, null, 2));
    } else {
      logger.info("✅ saveTemplate mutation successful");
      logger.info(`📝 Template ID: ${templateResponse.data.data.saveTemplate.id}`);
      
      // Test 2: Check if saveEndpoint mutation exists
      logger.info("🧪 Testing saveEndpoint mutation...");
      const endpointMutation = `
        mutation {
          saveEndpoint(input: {
            name: "test-endpoint-${Date.now()}"
            templateId: "${templateResponse.data.data.saveTemplate.id}"
            gpuIds: "NVIDIA GeForce RTX 4090"
            idleTimeout: 300
            scalerType: "QUEUE_DELAY"
            scalerValue: 1
            workersMin: 1
            workersMax: 3
            locations: "US-OR-1"
          }) {
            id
            name
          }
        }
      `;

      const endpointResponse = await client.post("", { query: endpointMutation });
      
      if (endpointResponse.data.errors) {
        logger.error("❌ saveEndpoint mutation failed:");
        logger.error(JSON.stringify(endpointResponse.data.errors, null, 2));
      } else {
        logger.info("✅ saveEndpoint mutation successful");
        logger.info(`🌐 Endpoint URL: ${endpointResponse.data.data.saveEndpoint.url}`);
      }
    }

  } catch (error: any) {
    logger.error("❌ Mutation test failed:");
    if (error.response) {
      logger.error(`Status: ${error.response.status}`);
      logger.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      logger.error(error.message);
    }
  }
}

testRunPodMutations().catch(console.error); 