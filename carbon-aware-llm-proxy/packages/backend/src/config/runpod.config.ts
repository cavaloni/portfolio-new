import { z } from "zod";

// RunPod GPU types with their specifications and carbon efficiency ratings
export const GPU_TYPES = {
  "NVIDIA GeForce RTX 4090": {
    memory: 24,
    computeUnits: 16384,
    powerConsumption: 450, // watts
    costPerHour: 0.34, // USD per hour (approximate)
    carbonEfficiencyScore: 0.8, // 0-1 scale, higher is better
  },
  "NVIDIA RTX A6000": {
    memory: 48,
    computeUnits: 10752,
    powerConsumption: 300,
    costPerHour: 0.79,
    carbonEfficiencyScore: 0.9,
  },
  "NVIDIA A100 80GB": {
    memory: 80,
    computeUnits: 6912,
    powerConsumption: 400,
    costPerHour: 1.89,
    carbonEfficiencyScore: 0.95,
  },
} as const;

export type GpuType = keyof typeof GPU_TYPES;

// RunPod regions with their carbon intensity data
export const RUNPOD_REGIONS = {
  "US-CA-1": {
    name: "California, USA",
    carbonIntensity: 0.233, // kg CO2e/kWh (approximate)
    latency: 50, // ms (approximate)
    availability: 0.99,
  },
  "US-OR-1": {
    name: "Oregon, USA",
    carbonIntensity: 0.155, // Lower due to hydroelectric power
    latency: 60,
    availability: 0.98,
  },
  "EU-SE-1": {
    name: "Sweden",
    carbonIntensity: 0.045, // Very low due to renewable energy
    latency: 120,
    availability: 0.97,
  },
  "EU-NO-1": {
    name: "Norway",
    carbonIntensity: 0.017, // Extremely low due to hydroelectric power
    latency: 130,
    availability: 0.96,
  },
} as const;

export type RunPodRegion = keyof typeof RUNPOD_REGIONS;

// Model configurations for Llama 3 variants
export const MODEL_CONFIGS = {
  "llama-3-8b-instruct": {
    modelName: "meta-llama/Meta-Llama-3-8B-Instruct",
    displayName: "Llama 3 8B Instruct",
    parameterCount: "8B",
    minGpuMemory: 16, // GB
    recommendedGpuTypes: [
      "NVIDIA GeForce RTX 4090",
      "NVIDIA RTX A6000",
    ] as GpuType[],
    maxSequenceLength: 8192,
    tensorParallelism: 1,
    estimatedTokensPerSecond: 50,
    dockerImage: "vllm/vllm-openai:latest",
  },
  "llama-3-70b-instruct": {
    modelName: "meta-llama/Meta-Llama-3-70B-Instruct",
    displayName: "Llama 3 70B Instruct",
    parameterCount: "70B",
    minGpuMemory: 48, // GB
    recommendedGpuTypes: ["NVIDIA RTX A6000", "NVIDIA A100 80GB"] as GpuType[],
    maxSequenceLength: 8192,
    tensorParallelism: 2,
    estimatedTokensPerSecond: 20,
    dockerImage: "vllm/vllm-openai:latest",
  },
} as const;

export type ModelConfig = keyof typeof MODEL_CONFIGS;

// RunPod deployment configuration schema
export const RunPodDeploymentConfigSchema = z.object({
  modelId: z.string(),
  regions: z.array(z.string()),
  gpuType: z.string(),
  minReplicas: z.number().min(0).default(1),
  maxReplicas: z.number().min(1).default(3),
  autoScaling: z.boolean().default(true),
  maxIdleTime: z.number().default(300), // seconds
  containerDiskSize: z.number().default(50), // GB
  environmentVariables: z.record(z.string()).optional(),
  ports: z.array(z.number()).default([8000]),
  volumeSize: z.number().default(100), // GB for model storage
});

export type RunPodDeploymentConfig = z.infer<
  typeof RunPodDeploymentConfigSchema
>;

// Default deployment configurations
export const DEFAULT_DEPLOYMENT_CONFIG: Partial<RunPodDeploymentConfig> = {
  regions: ["US-OR-1"], // Start with Oregon for better carbon efficiency
  gpuType: "NVIDIA GeForce RTX 4090", // Most cost-effective for initial deployment
  minReplicas: 1,
  maxReplicas: 3,
  autoScaling: true,
  maxIdleTime: 300,
  containerDiskSize: 50,
  ports: [8000],
  volumeSize: 100,
  environmentVariables: {
    VLLM_WORKER_USE_RAY: "True",
    VLLM_ENGINE_ITERATION_TIMEOUT_S: "60",
  },
};

// VLLM startup command template
export const VLLM_STARTUP_COMMAND = (
  modelName: string,
  config: (typeof MODEL_CONFIGS)[ModelConfig],
) => [
  "python",
  "-m",
  "vllm.entrypoints.openai.api_server",
  "--model",
  modelName,
  "--host",
  "0.0.0.0",
  "--port",
  "8000",
  "--max-model-len",
  config.maxSequenceLength.toString(),
  "--tensor-parallel-size",
  config.tensorParallelism.toString(),
  "--served-model-name",
  config.displayName.toLowerCase().replace(/\s+/g, "-"),
  "--disable-log-requests",
  "--trust-remote-code",
];

// Health check configuration
export const HEALTH_CHECK_CONFIG = {
  endpoint: "/health",
  intervalSeconds: 30,
  timeoutSeconds: 10,
  maxFailures: 3,
  initialDelaySeconds: 60, // Allow time for model loading
};

// Carbon footprint calculation constants
export const CARBON_CALCULATION_CONFIG = {
  // Power Usage Effectiveness (PUE) for data centers
  averagePUE: 1.4,
  // Additional overhead for networking, cooling, etc.
  infrastructureOverhead: 0.2,
  // Conversion factor for token processing to energy
  tokensPerKWh: 1000000, // Approximate, will be refined based on actual measurements
};
