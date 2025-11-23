import { createClerkClient } from '@clerk/backend';

let clerkInstance: ReturnType<typeof createClerkClient> | null = null;

/**
 * Returns a singleton instance of the Clerk client.
 * Throws an error if the CLERK_SECRET_KEY is not configured.
 */
export function getClerkClient() {
  if (!clerkInstance) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not configured in the environment.');
    }
    clerkInstance = createClerkClient({
      secretKey,
    });
  }
  return clerkInstance;
}
