import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../utils/api.js";

interface ProfileContextValue {
  profileId: string | null;
  isLoading: boolean;
  error: string | null;
  setProfileId: (id: string) => void;
  clearProfileId: () => void;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

/**
 * ProfileContext Provider
 * 
 * Manages profile_id lifecycle:
 * - Stores profile_id after onboarding
 * - Retrieves profile_id from API when user has profile but context is empty
 * - Provides profile_id throughout the app via useProfileId() hook
 */
export function ProfileProvider({ children }: ProfileProviderProps) {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const [profileId, setProfileIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Safety timeout: Don't let loading state block forever
  useEffect(() => {
    if (!isLoading) return; // Skip if not loading
    
    const timeout = setTimeout(() => {
      console.warn('[ProfileContext] Loading timeout - marking as complete');
      setIsLoading(false);
    }, 5000); // 5 second timeout (reduced from 10s)

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Check localStorage as fallback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("action_os_profile_id");
      if (stored) {
        setProfileIdState(stored);
        setIsLoading(false);
      }
    }
  }, []);

  // Fetch profile_id from API when user is authenticated but profileId is not set
  useEffect(() => {
    if (!isClerkLoaded) {
      return;
    }

    // If we already have a profileId, don't fetch
    if (profileId) {
      setIsLoading(false);
      return;
    }

    // If user is not signed in, clear profileId and stop loading
    if (!user?.id) {
      setProfileIdState(null);
      setIsLoading(false);
      return;
    }

    // Prevent multiple simultaneous fetches with a flag
    let isCancelled = false;

    // User is signed in but no profileId - fetch from API
    const fetchProfileId = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('[ProfileContext] Fetching profile status...');
        const data = await api.get<{ hasProfile: boolean; profileId: string | null }>(
          "/api/auth/status"
        );
        
        console.log('[ProfileContext] Auth status response:', data);
        
        if (isCancelled) return;
        
        if (data.hasProfile && data.profileId) {
          console.log('[ProfileContext] Found existing profile:', data.profileId);
          setProfileIdState(data.profileId);
          if (typeof window !== "undefined") {
            localStorage.setItem("action_os_profile_id", data.profileId);
          }
        } else {
          // No profile - auto-create
          console.log('[ProfileContext] No profile found, auto-creating...');
          try {
            const createResponse = await api.post<{ profileId: string }>(
              "/api/auth/create-profile",
              {}
            );
            
            console.log('[ProfileContext] Auto-create response:', createResponse);
            
            if (!isCancelled && createResponse.profileId) {
              console.log('[ProfileContext] Profile created:', createResponse.profileId);
              setProfileIdState(createResponse.profileId);
              if (typeof window !== "undefined") {
                localStorage.setItem("action_os_profile_id", createResponse.profileId);
              }
            }
          } catch (createErr) {
            console.error("[ProfileContext] Failed to auto-create profile:", createErr);
            setError("Failed to create profile. Please refresh the page.");
          }
        }
      } catch (err) {
        if (isCancelled) return;
        console.error("[ProfileContext] Failed to fetch profile status:", err);
        setError((err as Error).message);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchProfileId();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isCancelled = true;
    };
  }, [user?.id, isClerkLoaded]); // Removed profileId from dependencies to prevent infinite loop

  const setProfileId = (id: string) => {
    setProfileIdState(id);
    setError(null);
    // Store in localStorage as backup
    if (typeof window !== "undefined") {
      localStorage.setItem("action_os_profile_id", id);
    }
  };

  const clearProfileId = () => {
    setProfileIdState(null);
    setError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("action_os_profile_id");
    }
  };

  const value: ProfileContextValue = {
    profileId,
    isLoading,
    error,
    setProfileId,
    clearProfileId,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/**
 * Hook to access profile_id from ProfileContext
 * 
 * @returns profile_id string or null if not available
 * @throws Error if used outside ProfileProvider
 */
export function useProfileId(): string | null {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfileId must be used within a ProfileProvider");
  }
  return context.profileId;
}

/**
 * Hook to access full ProfileContext value
 * 
 * @returns ProfileContextValue with profileId, isLoading, error, and setters
 * @throws Error if used outside ProfileProvider
 */
export function useProfileContext(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfileContext must be used within a ProfileProvider");
  }
  return context;
}

