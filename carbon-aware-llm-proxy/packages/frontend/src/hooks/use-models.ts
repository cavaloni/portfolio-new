import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelService } from '@/services/model-service';
import { queryKeys } from '@/lib/query-client';

export function useModels() {
  return useQuery({
    queryKey: queryKeys.models.all,
    queryFn: async () => {
      const models = await modelService.listAvailableModels();
      return models;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useModel(modelId: string) {
  return useQuery({
    queryKey: queryKeys.models.detail(modelId),
    queryFn: async () => {
      const models = await modelService.listAvailableModels();
      return models.find(model => model.id === modelId) || null;
    },
    enabled: !!modelId,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
}

export function useRecommendedModel(criteria: 'lowest_carbon' | 'fastest' | 'cheapest' | 'best_balance' = 'best_balance') {
  return useQuery({
    queryKey: queryKeys.models.recommended(criteria),
    queryFn: () => modelService.getRecommendedModel(criteria),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useModelCarbonData(modelId: string) {
  return useQuery({
    queryKey: ['model-carbon-data', modelId],
    queryFn: () => modelService.getModelCarbonData(modelId),
    enabled: !!modelId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCurrentCarbonIntensity(region?: string) {
  return useQuery({
    queryKey: ['current-carbon-intensity', region || 'default'],
    queryFn: () => modelService.getCurrentCarbonIntensity(region),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export function useCarbonAwareModels() {
  const { data: models, isLoading: isLoadingModels } = useModels();
  const { data: carbonIntensity } = useCurrentCarbonIntensity();
  
  const carbonAwareModels = models?.map(model => {
    const carbonData = carbonIntensity 
      ? modelService.estimateCarbonFootprint(model, 1000, carbonIntensity.carbon_intensity_gco2e_per_kwh)
      : { emissions_gco2e: 0, energy_kwh: 0 };
    
    return {
      ...model,
      estimatedCarbonFootprint: carbonData.emissions_gco2e,
      estimatedEnergyUsage: carbonData.energy_kwh,
    };
  }).sort((a, b) => a.estimatedCarbonFootprint - b.estimatedCarbonFootprint) || [];
  
  return {
    models: carbonAwareModels,
    isLoading: isLoadingModels,
  };
}

export function useUpdateModelPreference() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (modelId: string) => {
      // In a real app, this would update the user's preferred model on the server
      return { success: true };
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.user.preferences });
    },
  });
}
