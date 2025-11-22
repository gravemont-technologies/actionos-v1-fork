/**
 * Authentication integration layer with Clerk
 * 
 * Provides utilities for getting Clerk user ID and auth headers
 * Optimized for zero race conditions and maximum performance
 */

import { useUser, useAuth } from "@clerk/clerk-react";
import { useState, useEffect, useMemo } from "react";

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
 * Returns stable object that updates when token is fetched
 * Memoized to prevent infinite loops in useEffect dependencies
 */
export function useAuthHeaders(): Record<string, string> {
  const userId = useUserId();
  const { getToken } = useAuth();
  const [headers, setHeaders] = useState<Record<string, string>>({});
  
  useEffect(() => {
    if (!userId) {
      setHeaders({});
      return;
    }

    let cancelled = false;
    
    const fetchToken = async () => {
      try {
        const token = await getToken();
        if (!cancelled) {
          setHeaders({
            "x-clerk-user-id": userId,
            ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to get Clerk token:", error);
          setHeaders({ "x-clerk-user-id": userId });
        }
      }
    };

    fetchToken();
    
    return () => {
      cancelled = true;
    };
  }, [userId, getToken]);

  return headers;
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

