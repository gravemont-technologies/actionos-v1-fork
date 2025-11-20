/**
 * Authentication integration layer with Clerk
 * 
 * Provides utilities for getting Clerk user ID and auth headers
 * Note: getUserId() can only be used inside ClerkProvider context
 */

import { useUser } from "@clerk/clerk-react";
import { useMemo } from "react";

/**
 * Hook to get current Clerk user ID
 * Must be used inside ClerkProvider context
 */
export function useUserId(): string | null {
  const { user } = useUser();
  return user?.id || null;
}

/**
 * Hook to get auth headers with Clerk user ID
 * CRITICAL: Memoized to prevent infinite loops when used in useEffect dependencies
 * Must be used inside ClerkProvider context
 */
export function useAuthHeaders(): Record<string, string> {
  const userId = useUserId();
  // Memoize to ensure stable reference when userId hasn't changed
  // This prevents infinite loops in useEffect dependencies
  return useMemo(() => {
    if (!userId) return {};
    return { "x-clerk-user-id": userId };
  }, [userId]);
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

