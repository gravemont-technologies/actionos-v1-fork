/**
 * Authentication integration layer with Clerk
 * 
 * Provides utilities for getting Clerk user ID and auth headers
 * Note: getUserId() can only be used inside ClerkProvider context
 */

import { useUser, useAuth } from "@clerk/clerk-react";
import { useMemo, useEffect, useState } from "react";

/**
 * Hook to get current Clerk user ID
 * Must be used inside ClerkProvider context
 */
export function useUserId(): string | null {
  const { user } = useUser();
  return user?.id || null;
}

/**
 * Hook to get auth headers with Clerk session token
 * Returns headers object with token fetched synchronously
 */
export function useAuthHeaders(): () => Promise<Record<string, string>> {
  const userId = useUserId();
  const { getToken } = useAuth();

  return useMemo(() => {
    return async (): Promise<Record<string, string>> => {
      if (!userId) return {};
      
      try {
        const token = await getToken();
        return {
          "x-clerk-user-id": userId,
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        };
      } catch (error) {
        console.error("Failed to get Clerk token:", error);
        return { "x-clerk-user-id": userId };
      }
    };
  }, [userId, getToken]);
}

/**
 * Legacy function for non-hook contexts
 * Returns null if not in Clerk context
 * Prefer useUserId() hook when possible
 */
export function getUserId(): string | null {
  // This is a fallback - prefer using useUserId() hook
  // In non-React contexts, this will return null
  return null;
}

/**
 * Legacy function for non-hook contexts
 * Returns empty object if not in Clerk context
 * Prefer useAuthHeaders() hook when possible
 */
export function getAuthHeaders(): Record<string, string> {
  const userId = getUserId();
  if (!userId) return {};
  return { "x-clerk-user-id": userId };
}

