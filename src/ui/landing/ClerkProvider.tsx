import { ClerkProvider as BaseClerkProvider } from "@clerk/clerk-react";
import { ReactNode } from "react";
import { env } from "../config/env";

/**
 * Clerk authentication provider wrapper
 * - Uses validated publishable key from env config
 * - Wraps app with Clerk context
 * 
 * Environment validation ensures VITE_CLERK_PUBLISHABLE_KEY is present
 * before this component is ever rendered.
 */

interface ClerkProviderProps {
  children: ReactNode;
}

export function ClerkProvider({ children }: ClerkProviderProps) {
  return (
    <BaseClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}>
      {children}
    </BaseClerkProvider>
  );
}
