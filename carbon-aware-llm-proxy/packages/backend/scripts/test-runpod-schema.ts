#!/usr/bin/env ts-node

import "dotenv/config";
import axios from "axios";
import { logger } from "../src/utils/logger";

async function testRunPodSchema() {
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
    // Test different possible field names
    const queries = [
      {
        name: "endpoints",
        query: `query { endpoints { id name } }`
      },
      {
        name: "serverlessEndpoints", 
        query: `query { serverlessEndpoints { id name } }`
      },
      {
        name: "serverlessEndpoint",
        query: `query { serverlessEndpoint { id name } }`
      },
      {
        name: "pods",
        query: `query { pods { id name } }`
      },
      {
        name: "pod",
        query: `query { pod { id name } }`
      },
      {
        name: "templates",
        query: `query { templates { id name } }`
      },
      {
        name: "podTemplates",
        query: `query { podTemplates { id name } }`
      },
      {
        name: "podTemplate",
        query: `query { podTemplate { id name } }`
      },
      {
        name: "serverless",
        query: `query { serverless { id name } }`
      },
      {
        name: "adminSlsEndpoint",
        query: `query { adminSlsEndpoint { id name } }`
      },
      {
        name: "adminSlsEndpoints",
        query: `query { adminSlsEndpoints { id name } }`
      },
      {
        name: "slsEndpoints",
        query: `query { slsEndpoints { id name } }`
      },
      {
        name: "slsEndpoint",
        query: `query { slsEndpoint { id name } }`
      }
    ];

    for (const test of queries) {
      try {
        logger.info(`🧪 Testing query: ${test.name}`);
        const response = await client.post("", { query: test.query });
        
        if (response.data.errors) {
          logger.info(`   ❌ ${response.data.errors[0].message}`);
        } else {
          logger.info(`   ✅ Success! Found ${response.data.data[test.name]?.length || 0} items`);
          if (response.data.data[test.name] && response.data.data[test.name].length > 0) {
            logger.info(`   📝 Sample: ${JSON.stringify(response.data.data[test.name][0])}`);
          }
        }
      } catch (error: any) {
        logger.info(`   ❌ Error: ${error.response?.data?.errors?.[0]?.message || error.message}`);
      }
    }

  } catch (error: any) {
    logger.error("❌ Schema test failed:", error.message);
  }
}

testRunPodSchema().catch(console.error); 