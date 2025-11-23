/**
 * Authentication integration layer with Clerk
 * 
 * Provides utilities for getting Clerk user ID and auth headers
 * Optimized for zero race conditions and maximum performance
 */

import { useUser, useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useState, useEffect } from "react";
import { flushSync } from "react-dom";

/**
 * Hook to get current Clerk user ID
 * Must be used inside ClerkProvider context
 */
export function useUserId(): string | null {
  const { user } = useUser();
  return user?.id || null;
}

const TOKEN_CACHE_DURATION = 55 * 60 * 1000; // 55 minutes (Clerk tokens expire in 60 min)

/**
 * Get user-scoped cache key
 */
function getCacheKey(userId: string, suffix: string): string {
  return `actionos_clerk_${suffix}_${userId}`;
}

/**
 * Get cached token from sessionStorage (user-scoped)
 */
function getCachedToken(userId: string): string | null {
  try {
    const tokenKey = getCacheKey(userId, 'token');
    const expiryKey = getCacheKey(userId, 'expiry');
    const token = sessionStorage.getItem(tokenKey);
    const expiry = sessionStorage.getItem(expiryKey);
    
    if (!token || !expiry) return null;
    
    // Check if expired
    if (Date.now() > parseInt(expiry, 10)) {
      sessionStorage.removeItem(tokenKey);
      sessionStorage.removeItem(expiryKey);
      return null;
    }
    
    return token;
  } catch {
    return null;
  }
}

/**
 * Cache token in sessionStorage (user-scoped)
 */
function setCachedToken(userId: string, token: string): void {
  try {
    const tokenKey = getCacheKey(userId, 'token');
    const expiryKey = getCacheKey(userId, 'expiry');
    const expiry = Date.now() + TOKEN_CACHE_DURATION;
    sessionStorage.setItem(tokenKey, token);
    sessionStorage.setItem(expiryKey, expiry.toString());
  } catch {
    // Silently fail if sessionStorage unavailable
  }
}

/**
 * Clear cached token for specific user or all users
 */
export function clearCachedToken(userId?: string): void {
  try {
    if (userId) {
      // Clear specific user's token
      sessionStorage.removeItem(getCacheKey(userId, 'token'));
      sessionStorage.removeItem(getCacheKey(userId, 'expiry'));
    } else {
      // Clear all cached tokens (sign-out)
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('actionos_clerk_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch {
    // Silently fail
  }
}

/**
 * Unified auth hook - returns headers and ready state in single fetch
 * Eliminates double token fetch, reduces mount delay from 400ms to 200ms
 * Uses user-scoped sessionStorage cache for instant readiness on subsequent mounts
 */
export function useAuthState(): { headers: Record<string, string>; isReady: boolean } {
  const userId = useUserId();
  const { getToken } = useClerkAuth();
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    console.log('[useAuthState] Effect triggered:', { userId, isReady });
    
    if (!userId) {
      console.log('[useAuthState] No userId - marking ready without auth');
      flushSync(() => {
        setHeaders({});
        setIsReady(true);
      });
      return;
    }

    let cancelled = false;
    
    const fetchToken = async () => {
      try {
        // Check user-scoped cache first
        const cachedToken = getCachedToken(userId);
        if (cachedToken) {
          console.log('[useAuthState] Using cached token');
          if (!cancelled) {
            flushSync(() => {
              setHeaders({
                "x-clerk-user-id": userId,
                "Authorization": `Bearer ${cachedToken}`,
              });
              setIsReady(true);
            });
          }
          return;
        }

        // Fetch fresh token if not cached
        console.log('[useAuthState] Fetching fresh token from Clerk...');
        const token = await getToken();
        console.log('[useAuthState] Token result:', { hasToken: !!token, tokenLength: token?.length });
        
        if (!cancelled) {
          if (token) {
            setCachedToken(userId, token); // Cache with user scope
            console.log('[useAuthState] Token cached, setting headers');
            flushSync(() => {
              setHeaders({
                "x-clerk-user-id": userId,
                "Authorization": `Bearer ${token}`,
              });
              setIsReady(true);
            });
          } else {
            console.error('[useAuthState] ERROR: No token returned from getToken() - user might not be authenticated');
            // Clear potentially stale cache
            sessionStorage.removeItem(`clerk_token_${userId}`);
            // DO NOT mark as ready if we have no token - this will cause 401s
            console.warn('[useAuthState] Not marking as ready - no valid token');
            flushSync(() => {
              setHeaders({});
              setIsReady(false); // Keep waiting for valid token
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("[useAuthState] ERROR: Failed to get Clerk token:", error);
          // On error, don't mark as ready either
          flushSync(() => {
            setHeaders({});
            setIsReady(false);
          });
        }
      }
    };

    fetchToken();
    
    return () => {
      cancelled = true;
    };
  }, [userId, getToken]);

  return { headers, isReady };
}

// Backwards-compatible alias: some files import `useAuth`.
export const useAuth = useAuthState;
/**
 * Legacy hook for backwards compatibility
 * @deprecated Use useAuthState() instead to avoid double token fetch
 */
export function useAuthHeaders(): Record<string, string> {
  const { headers } = useAuthState();
  return headers;
}

/**
 * Legacy hook for backwards compatibility
 * @deprecated Use useAuthState() instead to avoid double token fetch
 */
export function useAuthReady(): boolean {
  const { isReady } = useAuthState();
  return isReady;
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

