import { QueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';

// Helper function to handle errors
const handleError = (error: unknown) => {
  if (typeof error !== 'object' || error === null) {
    return 'An unknown error occurred';
  }
  
  const errorObj = error as { response?: { status?: number; data?: { message?: string } }; message?: string };
  
  // Handle unauthorized errors
  if (errorObj?.response?.status === 401) {
    // This will be handled by the auth context
    return null;
  }
  
  // Return the error message or a default one
  return errorObj?.response?.data?.message || errorObj.message || 'An error occurred';
};

// Create a client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const errorObj = error as { response?: { status?: number } };
        // Don't retry on 4xx errors (except 401 which might be auth related)
        if (errorObj?.response?.status && errorObj.response.status >= 400 && 
            errorObj.response.status < 500 && errorObj.response.status !== 401) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
    },
  },
});

// Configure error boundaries at the query level
// This will be used by individual queries via the `useErrorBoundary` option
// Example: useQuery({ ..., useErrorBoundary: (error) => shouldUseErrorBoundary(error) })
const shouldUseErrorBoundary = (error: unknown): boolean => {
  const errorObj = error as { response?: { status?: number } };
  // Only use error boundary for non-401 errors
  return errorObj?.response?.status !== 401;
};

export { shouldUseErrorBoundary };

// Global error handling for queries and mutations
const handleQueryError = (error: unknown) => {
  const errorMessage = handleError(error);
  if (errorMessage) {
    // Use the toast function with the correct signature
    toast(errorMessage, {
      variant: 'destructive',
    });
  }
};

// Set up global error handlers
const queryCache = queryClient.getQueryCache();
const mutationCache = queryClient.getMutationCache();

// @ts-ignore - The types for these callbacks are not fully exposed
queryCache.config.onError = handleQueryError;
// @ts-ignore - The types for these callbacks are not fully exposed
mutationCache.config.onError = handleQueryError;

// Query keys
export const queryKeys = {
  auth: {
    me: ['auth', 'me'],
  },
  chat: {
    history: ['chat', 'history'],
    conversation: (conversationId: string) => ['chat', 'conversation', conversationId],
  },
  models: {
    all: ['models'],
    detail: (modelId: string) => ['models', modelId],
    recommended: (criteria?: string) => ['models', 'recommended', criteria || 'default'],
  },
  carbon: {
    intensity: (region?: string) => ['carbon', 'intensity', region || 'current'],
    modelFootprint: (modelId: string) => ['carbon', 'model-footprint', modelId],
    userStats: ['carbon', 'user-stats'],
  },
  user: {
    preferences: ['user', 'preferences'],
    profile: ['user', 'profile'],
    usage: ['user', 'usage'],
  },
};
