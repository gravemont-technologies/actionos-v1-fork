/**
 * Authentication integration layer with Clerk
 * 
 * Provides utilities for getting Clerk user ID and auth headers
 * Optimized for zero race conditions and maximum performance
 */

import { useUser, useAuth } from "@clerk/clerk-react";
import { useMemo, useRef, useEffect } from "react";

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
 * Returns stable object with cached token, auto-refreshes on userId change
 * 
 * Uses Proxy pattern for stable reference while updating underlying headers
 * This prevents infinite loops in useEffect dependencies
 */
export function useAuthHeaders(): Record<string, string> {
  const userId = useUserId();
  const { getToken } = useAuth();
  const headersRef = useRef<Record<string, string>>({});
  
  useEffect(() => {
    if (!userId) {
      headersRef.current = {};
      return;
    }

    let cancelled = false;
    
    const fetchToken = async () => {
      try {
        const token = await getToken();
        if (!cancelled) {
          headersRef.current = {
            "x-clerk-user-id": userId,
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          };
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to get Clerk token:", error);
          headersRef.current = { "x-clerk-user-id": userId };
        }
      }
    };

    fetchToken();
    
    return () => {
      cancelled = true;
    };
  }, [userId, getToken]);

  // Return stable memoized proxy that reads from ref
  return useMemo(() => {
    return new Proxy({}, {
      get: (_target, prop: string) => headersRef.current[prop],
      ownKeys: () => Reflect.ownKeys(headersRef.current),
      getOwnPropertyDescriptor: (_target, prop) => {
        return {
          enumerable: true,
          configurable: true,
          value: headersRef.current[prop as string],
        };
      },
    }) as Record<string, string>;
  }, []); // Empty deps - proxy always reads latest from ref
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

