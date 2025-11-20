import { ClerkProvider as BaseClerkProvider } from "@clerk/clerk-react";
import { ReactNode } from "react";

/**
 * Clerk authentication provider wrapper
 * - Uses publishable key from env
 * - Wraps app with Clerk context
 * 
 * Note: Add your Clerk publishable key to .env:
 * VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
 */

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

interface ClerkProviderProps {
  children: ReactNode;
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  // Always wrap with ClerkProvider - it handles missing key gracefully
  return (
    <BaseClerkProvider publishableKey={PUBLISHABLE_KEY}>
      {children}
    </BaseClerkProvider>
  );
}
