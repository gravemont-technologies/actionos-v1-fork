/**
 * Frontend Environment Variable Validation
 * 
 * Validates all required environment variables on startup.
 * Throws clear error if any are missing, preventing silent failures.
 */

interface EnvironmentConfig {
  VITE_CLERK_PUBLISHABLE_KEY: string;
  // VITE_API_URL is optional in production when frontend and API share the same origin.
  VITE_API_URL?: string;
}

// Only require Clerk publishable key. VITE_API_URL may be empty for same-origin deployments.
const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;

if (!clerkKey) {
  const errorMsg = `🚨 Missing Required Environment Variable: VITE_CLERK_PUBLISHABLE_KEY\nPlease add your Clerk publishable key to your environment.`;
  console.error(errorMsg);
  throw new Error("Missing environment variable: VITE_CLERK_PUBLISHABLE_KEY");
}

export const env: EnvironmentConfig = {
  VITE_CLERK_PUBLISHABLE_KEY: clerkKey,
  VITE_API_URL: apiUrl ?? "",
};
