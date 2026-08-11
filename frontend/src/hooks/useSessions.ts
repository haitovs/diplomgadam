import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../api/admin";
import { ApiError } from "../api/client";
import { storeApi } from "../api/store";

/**
 * Sessions live in httpOnly cookies, so the client cannot read them directly:
 * "am I signed in?" is answered by asking the server. A 401 is a valid answer,
 * not an error, so it resolves to null and is never retried.
 */

export function useStoreSession() {
  return useQuery({
    queryKey: ["store-session"],
    queryFn: async () => {
      try {
        return await storeApi.me();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useStoreSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => storeApi.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(["store-session"], null);
      queryClient.removeQueries({ queryKey: ["store-detail"] });
      queryClient.removeQueries({ queryKey: ["store-menu"] });
      queryClient.removeQueries({ queryKey: ["store-media"] });
    },
  });
}

export function useAdminSession() {
  return useQuery({
    queryKey: ["admin-session"],
    queryFn: async () => {
      try {
        return await adminApi.me();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function useAdminSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => adminApi.signOut(),
    onSuccess: () => {
      queryClient.setQueryData(["admin-session"], null);
      queryClient.removeQueries({ queryKey: ["admin-stores"] });
      queryClient.removeQueries({ queryKey: ["admin-stats"] });
    },
  });
}
