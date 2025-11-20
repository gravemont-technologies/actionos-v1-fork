import { SignIn as ClerkSignIn, useAuth } from "@clerk/clerk-react";
import { Navigate } from "react-router-dom";
import { useEffect } from "react";

/**
 * Sign in page with Clerk authentication
 * - Full-screen centered auth form
 * - Redirects to dashboard if already authenticated
 * - Supports email/password and social auth
 */
export default function SignIn() {
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
        <ClerkSignIn 
          routing="path" 
          path="/sign-in"
          signUpUrl="/sign-up"
          afterSignInUrl="/app/analyze"
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
