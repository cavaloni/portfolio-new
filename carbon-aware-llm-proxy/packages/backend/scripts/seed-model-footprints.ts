import { modelFootprintService } from "../src/services/model-footprint.service";
import { logger } from "../src/utils/logger";
import { supabaseService } from "../src/services/supabase.service";

// Sample model data with realistic carbon footprint information
const SAMPLE_MODELS = [
  // OpenAI models
  {
    name: "gpt-4",
    provider: "openai",
    architecture: "Transformer",
    parameters: 1.8e12, // Estimated
    flopsPerToken: 6, // Estimated
    carbonIntensity: {
      min: 0.2, // gCO2eq/1k tokens (best case)
      avg: 0.4, // gCO2eq/1k tokens (average)
      max: 0.8, // gCO2eq/1k tokens (worst case)
    },
    hardware: "A100",
    region: "us-west-2",
    source: "Estimated based on model size and inference characteristics",
  },
  {
    name: "gpt-3.5-turbo",
    provider: "openai",
    architecture: "Transformer",
    parameters: 175e9,
    flopsPerToken: 0.5,
    carbonIntensity: {
      min: 0.01,
      avg: 0.02,
      max: 0.05,
    },
    hardware: "A100",
    region: "us-west-2",
    source: "Estimated based on model size and inference characteristics",
  },

  // Anthropic models
  {
    name: "claude-3-opus",
    provider: "anthropic",
    architecture: "Transformer",
    parameters: 1e12, // Estimated
    flopsPerToken: 5, // Estimated
    carbonIntensity: {
      min: 0.15,
      avg: 0.3,
      max: 0.6,
    },
    hardware: "A100",
    region: "us-east-1",
    source: "Estimated based on model size and inference characteristics",
  },
  {
    name: "claude-3-sonnet",
    provider: "anthropic",
    architecture: "Transformer",
    parameters: 500e9, // Estimated
    flopsPerToken: 2.5, // Estimated
    carbonIntensity: {
      min: 0.08,
      avg: 0.15,
      max: 0.3,
    },
    hardware: "A100",
    region: "us-east-1",
    source: "Estimated based on model size and inference characteristics",
  },

  // Google models
  {
    name: "gemini-pro",
    provider: "google",
    architecture: "Transformer",
    parameters: 1.2e12, // Estimated
    flopsPerToken: 5.5, // Estimated
    carbonIntensity: {
      min: 0.18,
      avg: 0.35,
      max: 0.7,
    },
    hardware: "TPUv4",
    region: "us-central1",
    source: "Estimated based on model size and inference characteristics",
  },
  {
    name: "gemini-nano",
    provider: "google",
    architecture: "Transformer",
    parameters: 3.25e9,
    flopsPerToken: 0.1,
    carbonIntensity: {
      min: 0.001,
      avg: 0.002,
      max: 0.005,
    },
    hardware: "TPUv4",
    region: "us-central1",
    source: "Estimated based on model size and inference characteristics",
  },

  // Meta models
  {
    name: "llama-2-70b-chat",
    provider: "meta",
    architecture: "LLaMA",
    parameters: 70e9,
    flopsPerToken: 1.4,
    carbonIntensity: {
      min: 0.03,
      avg: 0.06,
      max: 0.12,
    },
    hardware: "A100",
    region: "us-east-1",
    source: "Estimated based on model size and inference characteristics",
  },
  {
    name: "llama-2-13b-chat",
    provider: "meta",
    architecture: "LLaMA",
    parameters: 13e9,
    flopsPerToken: 0.26,
    carbonIntensity: {
      min: 0.006,
      avg: 0.012,
      max: 0.025,
    },
    hardware: "A100",
    region: "us-east-1",
    source: "Estimated based on model size and inference characteristics",
  },

  // Mistral models
  {
    name: "mixtral-8x7b",
    provider: "mistral",
    architecture: "Mixture of Experts",
    parameters: 7e9 * 8, // 8 experts with 7B params each, but only 2 active per token
    flopsPerToken: 0.6, // More efficient due to MoE
    carbonIntensity: {
      min: 0.01,
      avg: 0.02,
      max: 0.04,
    },
    hardware: "A100",
    region: "eu-west-1",
    source: "Estimated based on model size and inference characteristics",
  },
  {
    name: "mistral-7b",
    provider: "mistral",
    architecture: "Transformer",
    parameters: 7e9,
    flopsPerToken: 0.14,
    carbonIntensity: {
      min: 0.003,
      avg: 0.006,
      max: 0.012,
    },
    hardware: "A100",
    region: "eu-west-1",
    source: "Estimated based on model size and inference characteristics",
  },
];

async function seedDatabase() {
  logger.info("Starting database seeding...");

  try {
    await supabaseService.initialize();
    logger.info("Supabase connection established");

    // Seed each model
    for (const modelData of SAMPLE_MODELS) {
      try {
        logger.info(`Seeding model: ${modelData.provider}/${modelData.name}`);

        await modelFootprintService.upsertModelFootprint({
          ...modelData,
          carbonIntensity: {
            min: modelData.carbonIntensity.min * 1000, // Convert to gCO2eq per 1M tokens
            avg: modelData.carbonIntensity.avg * 1000,
            max: modelData.carbonIntensity.max * 1000,
          },
        });

        logger.info(
          `Successfully seeded ${modelData.provider}/${modelData.name}`,
        );
      } catch (error) {
        logger.error(
          `Error seeding model ${modelData.provider}/${modelData.name}:`,
          error,
        );
      }
    }

    logger.info("Database seeding completed successfully");
  } catch (error) {
    logger.error("Error during database seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the seed function
seedDatabase().catch((error) => {
  logger.error("Unhandled error in seed script:", error);
  process.exit(1);
});
