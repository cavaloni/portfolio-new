import { apiGet, withAuth } from '@/lib/api-client';

export interface Model {
  id: string;
  name: string;
  description: string;
  provider: string;
  context_window: number;
  max_tokens: number;
  supports_functions: boolean;
  supports_vision: boolean;
  carbon_intensity_gco2e_per_1k_tokens: number;
  latency_ms_per_token: number;
  cost_per_1k_tokens: number;
  is_available: boolean;
  last_updated: string;
}

export interface ModelCarbonData {
  model_id: string;
  carbon_intensity_gco2e_per_1k_tokens: number;
  last_updated: string;
  region: string;
  energy_source_mix: {
    renewable_percent: number;
    fossil_fuel_percent: number;
    nuclear_percent: number;
  };
  carbon_savings_potential: {
    best_time_to_run?: string;
    estimated_savings_percent?: number;
  };
}

export const modelService = {
  async listAvailableModels(): Promise<Model[]> {
    try {
      const response = await apiGet<{ models: Model[] }>(
        '/v1/models',
        { headers: withAuth() }
      );

      if (response.error) {
        throw new Error(response.error.message);
      }

      return response.data?.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  },

  async getModelCarbonData(modelId: string): Promise<ModelCarbonData | null> {
    try {
      const response = await apiGet<{ data: ModelCarbonData }>(
        `/v1/carbon/models/${encodeURIComponent(modelId)}`,
        { headers: withAuth() }
      );

      if (response.error || !response.data?.data) {
        console.warn('No carbon data available for model:', modelId);
        return null;
      }

      return response.data.data;
    } catch (error) {
      console.error('Error fetching model carbon data:', error);
      return null;
    }
  },

  async getRecommendedModel(
    criteria: 'lowest_carbon' | 'fastest' | 'cheapest' | 'best_balance' = 'best_balance'
  ): Promise<Model | null> {
    try {
      const response = await apiGet<{ model: Model }>(
        `/v1/models/recommended?criteria=${criteria}`,
        { headers: withAuth() }
      );

      if (response.error || !response.data) {
        throw new Error(response.error?.message || 'No recommended model found');
      }

      return response.data.model;
    } catch (error) {
      console.error('Error getting recommended model:', error);
      throw error;
    }
  },

  async getCurrentCarbonIntensity(region?: string): Promise<{
    carbon_intensity_gco2e_per_kwh: number;
    region: string;
    timestamp: string;
  } | null> {
    try {
      const url = region 
        ? `/v1/carbon/intensity?region=${encodeURIComponent(region)}`
        : '/v1/carbon/intensity';
      
      const response = await apiGet<{
        carbon_intensity_gco2e_per_kwh: number;
        region: string;
        timestamp: string;
      }>(url, { headers: withAuth() });

      if (response.error || !response.data) {
        console.warn('No carbon intensity data available');
        return null;
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching carbon intensity:', error);
      return null;
    }
  },

  // Helper function to estimate carbon footprint for a given number of tokens
  estimateCarbonFootprint(
    model: Model,
    tokenCount: number,
    currentIntensity?: number | null
  ): { emissions_gco2e: number; energy_kwh: number } {
    // Use provided carbon intensity or fall back to model's default
    const intensity = currentIntensity !== null && currentIntensity !== undefined
      ? currentIntensity
      : model.carbon_intensity_gco2e_per_1k_tokens / 1000; // Convert to per token

    // Simple estimation - in a real app, you'd want a more sophisticated model
    const emissions_gco2e = intensity * tokenCount;
    const energy_kwh = (emissions_gco2e / 1000) * 0.5; // Rough estimate: 500g CO2e per kWh

    return { emissions_gco2e, energy_kwh };
  },
};
