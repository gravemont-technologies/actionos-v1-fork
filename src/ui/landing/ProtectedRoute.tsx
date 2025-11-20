import { useAuth, useUser } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { api } from "../utils/api.js";
import { useProfileContext } from "../contexts/ProfileContext.js";

interface ProtectedRouteProps {
  children: ReactNode;
  requireOnboarding?: boolean;
}

/**
 * Protected route wrapper that redirects to sign-in if not authenticated
 * - Checks Clerk auth state
 * - Shows loading state during auth check
 * - Redirects unauthenticated users to /sign-in
 * - Optionally checks if user has completed onboarding
 * - Integrates with ProfileContext to fetch and store profile_id
 */
export function ProtectedRoute({ children, requireOnboarding = false }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { profileId, isLoading: isProfileLoading } = useProfileContext();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  // If onboarding is required, check profile status using ProfileContext
  // ProfileContext already fetches the profile, so we don't need to duplicate the API call
  if (requireOnboarding) {
    // Wait for ProfileContext to finish loading
    if (isProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

    // If no profile found, redirect to onboarding
    if (!profileId) {
    return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
}
