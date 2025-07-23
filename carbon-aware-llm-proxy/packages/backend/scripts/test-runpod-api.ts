#!/usr/bin/env ts-node

import "dotenv/config";
import axios from "axios";
import { logger } from "../src/utils/logger";

async function testRunPodAPI() {
  const apiKey = process.env.RUNPOD_API_KEY;
  
  if (!apiKey) {
    logger.error("❌ RUNPOD_API_KEY not found in environment variables");
    return;
  }

  logger.info("🔑 RunPod API Key found");
  logger.info(`📝 API Key (first 10 chars): ${apiKey.substring(0, 10)}...`);

  const client = axios.create({
    baseURL: "https://api.runpod.io/graphql",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });

  try {
    // Test 1: Query user info
    logger.info("🧪 Testing RunPod API connection...");
    const userQuery = `
      query {
        myself {
          id
          email
        }
      }
    `;

    const userResponse = await client.post("", { query: userQuery });
    
    if (userResponse.data.errors) {
      logger.error("❌ API authentication failed:");
      logger.error(JSON.stringify(userResponse.data.errors, null, 2));
      return;
    }

    logger.info("✅ API authentication successful");
    logger.info(`👤 User: ${userResponse.data.data.myself.email}`);

    // Test 2: List existing endpoints
    logger.info("📋 Checking existing endpoints...");
    const endpointsQuery = `
      query {
        pods {
          id
          name
          runtime {
            uptimeInSeconds
          }
          machine {
            gpuCount
          }
          desiredStatus
        }
      }
    `;

    const endpointsResponse = await client.post("", { query: endpointsQuery });
    
    if (endpointsResponse.data.errors) {
      logger.error("❌ Failed to fetch pods:");
      logger.error(JSON.stringify(endpointsResponse.data.errors, null, 2));
      return;
    }

    const pods = endpointsResponse.data.data.pods;
    logger.info(`📊 Found ${pods.length} existing pods:`);
    
    if (pods.length === 0) {
      logger.info("   No pods found");
    } else {
      pods.forEach((pod: any) => {
        logger.info(`   - ${pod.name} (${pod.id}): ${pod.desiredStatus}`);
      });
    }

    // Test 3: List available GPU types
    logger.info("🖥️ Checking available GPU types...");
    const gpuQuery = `
      query {
        gpuTypes {
          id
          displayName
          memoryInGb
          secureCloud
          communityCloud
        }
      }
    `;

    const gpuResponse = await client.post("", { query: gpuQuery });
    
    if (gpuResponse.data.errors) {
      logger.error("❌ Failed to fetch GPU types:");
      logger.error(JSON.stringify(gpuResponse.data.errors, null, 2));
      return;
    }

    const gpuTypes = gpuResponse.data.data.gpuTypes;
    logger.info(`🖥️ Found ${gpuTypes.length} GPU types:`);
    
    gpuTypes.slice(0, 5).forEach((gpu: any) => {
      logger.info(`   - ${gpu.displayName} (${gpu.memoryInGb}GB)`);
    });

    if (gpuTypes.length > 5) {
      logger.info(`   ... and ${gpuTypes.length - 5} more`);
    }

    // Test 4: Check if we can query serverless endpoints
    logger.info("🌐 Testing serverless endpoints query...");
    const serverlessQuery = `
      query {
        serverlessEndpoints {
          id
          name
          status
          url
        }
      }
    `;

    const serverlessResponse = await client.post("", { query: serverlessQuery });
    
    if (serverlessResponse.data.errors) {
      logger.error("❌ Failed to fetch serverless endpoints:");
      logger.error(JSON.stringify(serverlessResponse.data.errors, null, 2));
    } else {
      const endpoints = serverlessResponse.data.data.serverlessEndpoints;
      logger.info(`🌐 Found ${endpoints.length} serverless endpoints:`);
      
      if (endpoints.length > 0) {
        endpoints.forEach((endpoint: any) => {
          logger.info(`   - ${endpoint.name} (${endpoint.id})`);
          logger.info(`     Status: ${endpoint.status}`);
          logger.info(`     URL: ${endpoint.url || 'Not available'}`);
        });
      } else {
        logger.info("   No serverless endpoints found");
      }
    }

  } catch (error: any) {
    logger.error("❌ API test failed:");
    if (error.response) {
      logger.error(`Status: ${error.response.status}`);
      logger.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      logger.error(error.message);
    }
  }
}

testRunPodAPI().catch(console.error); 