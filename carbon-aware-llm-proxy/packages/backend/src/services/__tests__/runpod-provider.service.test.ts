import { runPodProviderService } from "../runpod-provider.service";
import { databaseService } from "../database.service";
import {
  RunPodDeployment,
  DeploymentStatus,
} from "../../entities/RunPodDeployment";
import axios from "axios";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock database service
jest.mock("../database.service");

describe("RunPodProviderService", () => {
  let mockDeploymentRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockDeploymentRepo = {
      find: jest.fn(),
      update: jest.fn(),
    };

    (databaseService.getDataSource as jest.Mock).mockReturnValue({
      getRepository: jest.fn().mockReturnValue(mockDeploymentRepo),
    });
  });

  describe("sendChatCompletion", () => {
    it("should successfully send chat completion request", async () => {
      // Mock deployment
      const mockDeployment = {
        id: "test-deployment-id",
        modelId: "llama-3-8b-instruct",
        region: "US-OR-1",
        status: DeploymentStatus.RUNNING,
        healthStatus: "healthy",
        endpointUrl: "https://test-endpoint.runpod.io",
        carbonIntensity: 0.155,
        currentReplicas: 1,
        maxReplicas: 3,
        instances: [],
      } as RunPodDeployment;

      mockDeploymentRepo.find.mockResolvedValue([mockDeployment]);

      // Mock axios response
      const mockResponse = {
        status: 200,
        data: {
          id: "chatcmpl-test",
          object: "chat.completion",
          created: 1703000000,
          model: "llama-3-8b-instruct",
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: "Hello! How can I help you today?",
              },
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18,
          },
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const request = {
        model: "llama-3-8b-instruct",
        messages: [
          {
            role: "user" as const,
            content: "Hello",
          },
        ],
      };

      const result = await runPodProviderService.sendChatCompletion(request);

      expect(result).toHaveProperty("carbon_footprint");
      expect(result.carbon_footprint).toHaveProperty("emissions_gco2e");
      expect(result.carbon_footprint).toHaveProperty("energy_consumed_kwh");
      expect(result.carbon_footprint).toHaveProperty("region", "US-OR-1");
      expect(result.carbon_footprint).toHaveProperty(
        "model_name",
        "llama-3-8b-instruct",
      );

      expect(mockedAxios.post).toHaveBeenCalledWith(
        "https://test-endpoint.runpod.io/v1/chat/completions",
        request,
        expect.objectContaining({
          timeout: 30000,
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should throw error when no deployments available", async () => {
      mockDeploymentRepo.find.mockResolvedValue([]);

      const request = {
        model: "llama-3-8b-instruct",
        messages: [
          {
            role: "user" as const,
            content: "Hello",
          },
        ],
      };

      await expect(
        runPodProviderService.sendChatCompletion(request),
      ).rejects.toThrow(
        "No available deployments found for model: llama-3-8b-instruct",
      );
    });

    it("should retry on failure and try alternative deployment", async () => {
      const mockDeployment1 = {
        id: "deployment-1",
        modelId: "llama-3-8b-instruct",
        region: "US-CA-1",
        status: DeploymentStatus.RUNNING,
        healthStatus: "healthy",
        endpointUrl: "https://endpoint1.runpod.io",
        carbonIntensity: 0.233,
        currentReplicas: 1,
        maxReplicas: 3,
        instances: [],
      } as RunPodDeployment;

      const mockDeployment2 = {
        id: "deployment-2",
        modelId: "llama-3-8b-instruct",
        region: "US-OR-1",
        status: DeploymentStatus.RUNNING,
        healthStatus: "healthy",
        endpointUrl: "https://endpoint2.runpod.io",
        carbonIntensity: 0.155,
        currentReplicas: 1,
        maxReplicas: 3,
        instances: [],
      } as RunPodDeployment;

      // First call returns both deployments, second call excludes the failed one
      mockDeploymentRepo.find
        .mockResolvedValueOnce([mockDeployment1, mockDeployment2])
        .mockResolvedValueOnce([mockDeployment2]);

      // First request fails, second succeeds
      mockedAxios.post
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          status: 200,
          data: {
            id: "chatcmpl-test",
            object: "chat.completion",
            created: 1703000000,
            model: "llama-3-8b-instruct",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "Hello from backup deployment!",
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 8,
              total_tokens: 18,
            },
          },
        });

      const request = {
        model: "llama-3-8b-instruct",
        messages: [
          {
            role: "user" as const,
            content: "Hello",
          },
        ],
      };

      const result = await runPodProviderService.sendChatCompletion(request);

      expect(result.choices[0].message.content).toBe(
        "Hello from backup deployment!",
      );
      expect(result.carbon_footprint?.region).toBe("US-OR-1");
      expect(mockedAxios.post).toHaveBeenCalledTimes(4); // 3 retries + 1 alternative
    });
  });

  describe("getDeploymentStats", () => {
    it("should return deployment statistics", async () => {
      const mockDeployments = [
        {
          id: "deployment-1",
          status: DeploymentStatus.RUNNING,
          healthStatus: "healthy",
          currentReplicas: 2,
          calculateTotalCostPerHour: () => 0.68,
          calculateCarbonFootprint: () => 0.5,
          instances: [],
        },
        {
          id: "deployment-2",
          status: DeploymentStatus.RUNNING,
          healthStatus: "unhealthy",
          currentReplicas: 1,
          calculateTotalCostPerHour: () => 0.34,
          calculateCarbonFootprint: () => 0.3,
          instances: [],
        },
      ] as RunPodDeployment[];

      mockDeploymentRepo.find.mockResolvedValue(mockDeployments);

      const stats = await runPodProviderService.getDeploymentStats();

      expect(stats).toEqual({
        totalDeployments: 2,
        healthyDeployments: 1,
        totalInstances: 3,
        totalCostPerHour: 1.02,
        totalCarbonFootprintPerHour: 0.8,
      });
    });
  });
});
