/**
 * Frontend Environment Variable Validation
 * 
 * Validates all required environment variables on startup.
 * Throws clear error if any are missing, preventing silent failures.
 */

interface EnvironmentConfig {
  VITE_CLERK_PUBLISHABLE_KEY: string;
  VITE_API_URL: string;
}

const requiredEnvVars: Record<keyof EnvironmentConfig, string | undefined> = {
  VITE_CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  VITE_API_URL: import.meta.env.VITE_API_URL,
};

// Validate environment variables
const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  const errorMsg = `
🚨 Missing Required Environment Variables:
${missingVars.map(v => `  - ${v}`).join('\n')}

Please add these to your .env file in the project root.
See .env.example for reference.

Required variables:
  - VITE_CLERK_PUBLISHABLE_KEY: Your Clerk publishable key (pk_test_...)
  - VITE_API_URL: Backend API URL (default: http://localhost:3001)

Get your Clerk key from: https://dashboard.clerk.com
  `.trim();
  
  console.error(errorMsg);
  throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
}

// Export validated environment config
export const env: EnvironmentConfig = {
  VITE_CLERK_PUBLISHABLE_KEY: requiredEnvVars.VITE_CLERK_PUBLISHABLE_KEY!,
  VITE_API_URL: requiredEnvVars.VITE_API_URL || 'http://localhost:3001',
};
