/**
 * Environment Configuration & Validation
 * 
 * Validates all required environment variables on startup.
 * Provides type-safe access to environment variables with defaults.
 * Fails fast with clear error messages if required variables are missing.
 */

type Environment = "development" | "production" | "test";

interface EnvConfig {
  // Application
  NODE_ENV: Environment;
  PORT: number;
  FRONTEND_URL: string;

  // Supabase
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  // Clerk (optional in dev, required in production)
  CLERK_SECRET_KEY: string | null;

  // OpenAI
  OPENAI_API_KEY: string | null;
  OPENAI_MODEL: string;

  // Analytics (optional)
  ANALYTICS_WEBHOOK: string | null;
}

/**
 * Validates and returns environment configuration
 * Throws error if required variables are missing
 */
function validateEnv(): EnvConfig {
  const nodeEnv = (.env.NODE_ENV || "development") as Environment;
  const isProduction = nodeEnv === "production";
  const isDevelopment = nodeEnv === "development";

  const errors: string[] = [];

  // Required in all environments
  if (!.env.SUPABASE_URL) {
    errors.push("SUPABASE_URL is required");
  }
  if (!.env.SUPABASE_SERVICE_ROLE_KEY) {
    errors.push("SUPABASE_SERVICE_ROLE_KEY is required");
  }

  // Required in production, optional in development
  if (isProduction && !.env.CLERK_SECRET_KEY) {
    errors.push("CLERK_SECRET_KEY is required in production");
  }

  // Optional but recommended
  if (!.env.OPENAI_API_KEY && isProduction) {
    errors.push("OPENAI_API_KEY is recommended in production (will use mock provider)");
  }

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}\n\n` +
        "Please check your .env file and ensure all required variables are set."
    );
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: Number(.env.PORT) || 3001,
    FRONTEND_URL: .env.FRONTEND_URL || "http://localhost:3000",

    SUPABASE_URL: .env.SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY: .env.SUPABASE_SERVICE_ROLE_KEY!,

    CLERK_SECRET_KEY: .env.CLERK_SECRET_KEY || null,

    OPENAI_API_KEY: .env.OPENAI_API_KEY || null,
    OPENAI_MODEL: .env.OPENAI_MODEL || "gpt-4o-mini"
  };
}

// Validate on module load
export const env = validateEnv();

// Export individual getters for convenience
export const getEnv = (): EnvConfig => env;
export const isProduction = (): boolean => env.NODE_ENV === "production";
export const isDevelopment = (): boolean => env.NODE_ENV === "development";
export const isTest = (): boolean => env.NODE_ENV === "test";

