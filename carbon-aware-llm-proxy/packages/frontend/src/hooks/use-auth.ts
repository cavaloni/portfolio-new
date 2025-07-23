import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/services/user-service";
import { queryKeys } from "@/lib/query-client";
import { useRouter } from "next/navigation";

export function useUser() {
  const queryClient = useQueryClient();
  const { data: user, ...rest } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const user = await userService.getCurrentUser();
      if (!user) {
        // If not logged in, remove any existing user data from the cache
        queryClient.setQueryData(queryKeys.auth.me, null);
        return null;
      }
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { user, ...rest };
}

export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      // In a real app, this would call your authentication API
      // For now, we'll simulate a successful login
      return { success: true, token: "dummy-token" };
    },
    onSuccess: (data) => {
      if (data.success) {
        // Store the token
        localStorage.setItem("auth_token", data.token);
        // Invalidate the user query to refetch the user data
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
        // Redirect to the dashboard
        router.push("/dashboard");
      }
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      // In a real app, this would call your logout API
      return { success: true };
    },
    onSuccess: () => {
      // Remove the auth token
      localStorage.removeItem("auth_token");
      // Clear the user data from the cache
      queryClient.setQueryData(queryKeys.auth.me, null);
      // Clear all queries
      queryClient.clear();
      // Redirect to the login page
      router.push("/login");
    },
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name: string;
    }) => {
      // In a real app, this would call your signup API
      // For now, we'll simulate a successful signup
      return { success: true, token: "dummy-token" };
    },
    onSuccess: (data) => {
      if (data.success) {
        // Store the token
        localStorage.setItem("auth_token", data.token);
        // Invalidate the user query to refetch the user data
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
        // Redirect to the dashboard
        router.push("/dashboard");
      }
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      return userService.requestPasswordReset(email);
    },
  });
}

export function useResetPassword() {
  const router = useRouter();

  return useMutation({
    mutationFn: async ({
      token,
      newPassword,
    }: {
      token: string;
      newPassword: string;
    }) => {
      return userService.resetPassword(token, newPassword);
    },
    onSuccess: (success) => {
      if (success) {
        // Redirect to login page after successful password reset
        router.push("/login");
      }
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      email: string;
      avatar?: string;
    }) => {
      // In a real app, this would call your profile update API
      // For now, we'll use the userService
      return userService.updateProfile(data);
    },
    onSuccess: (user) => {
      if (user) {
        // Update the user data in the cache
        queryClient.setQueryData(queryKeys.auth.me, user);
      }
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preferences: Record<string, any>) => {
      // In a real app, this would call your preferences update API
      // For now, we'll use the userService
      return userService.updateUserPreferences(preferences);
    },
    onSuccess: (user) => {
      if (user) {
        // Update the user data in the cache
        queryClient.setQueryData(queryKeys.auth.me, user);
      }
    },
  });
}
