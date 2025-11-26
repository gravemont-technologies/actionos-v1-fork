// Utility to check required environment variables at runtime
export function validateEnvVars(requiredVars: string[]) {
  const missing = requiredVars.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
