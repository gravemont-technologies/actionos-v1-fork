// Runtime environment variable validation for critical backend secrets
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLERK_SECRET_KEY',
  'OPENAI_API_KEY',
];

export function validateEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key] || process.env[key]?.startsWith('YOUR_'));
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(`\n[ENV VALIDATION ERROR] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}