import { SignUp as ClerkSignUp, useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";

/**
 * Sign up page with Clerk authentication
 * - Full-screen centered registration form
 * - Redirects to dashboard if already authenticated
 * - Supports email/password signup with verification
 */
export default function SignUp() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isSignedIn) {
    return <Navigate to="/app/analyze" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-md">
        <ClerkSignUp 
          routing="path" 
          path="/sign-up"
          signInUrl="/sign-in"
          afterSignUpUrl="/onboarding"
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "shadow-lg",
            },
          }}
        />
      </div>
    </div>
  );
}
