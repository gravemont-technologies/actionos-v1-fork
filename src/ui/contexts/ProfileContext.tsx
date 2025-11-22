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
        // Use the dedicated auth status endpoint which is more robust and handles race conditions
        const data = await api.get<{ hasProfile: boolean; profileId: string | null }>(
          "/api/auth/status"
        );
        
        // Check if component is still mounted and effect hasn't been cancelled
        if (isCancelled) {
          return;
        }
        
        if (data.hasProfile && data.profileId) {
          const fetchedProfileId = data.profileId;
          setProfileIdState(fetchedProfileId);
          // Store in localStorage as backup
          if (typeof window !== "undefined") {
            localStorage.setItem("action_os_profile_id", fetchedProfileId);
          }
        } else {
          // No profile found - auto-create minimal profile (onboarding disabled)
          try {
            const createResponse = await api.post<{ profile_id: string }>(
              "/api/onboarding/profile",
              {
                responses: {}, // Empty responses for auto-created profile
                consent_to_store: true
              }
            );
            
            if (!isCancelled && createResponse.profile_id) {
              setProfileIdState(createResponse.profile_id);
              if (typeof window !== "undefined") {
                localStorage.setItem("action_os_profile_id", createResponse.profile_id);
              }
            }
          } catch (createErr) {
            console.error("Failed to auto-create profile:", createErr);
            setProfileIdState(null);
            if (typeof window !== "undefined") {
              localStorage.removeItem("action_os_profile_id");
            }
          }
        }
      } catch (err) {
        // Only update state if not cancelled
        if (isCancelled) {
          return;
        }
        console.error("Failed to fetch profile status:", err);
        setError((err as Error).message);
        // Don't set profileId to null on error - might be network issue
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

