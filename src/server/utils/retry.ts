/**
 * Retry Logic Utility
 * 
 * Exponential backoff retry for external service calls.
 * Skips retries for non-retryable errors (4xx).
 */

import { logger } from "./logger.js";

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryable?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, "retryable">> & { retryable?: (error: unknown) => boolean } = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Check if error is retryable (default: retry on 5xx, network errors, timeouts)
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Don't retry on 4xx errors (client errors)
    if (message.includes("400") || message.includes("401") || message.includes("403") || message.includes("404")) {
      return false;
    }
    // Retry on network errors, timeouts, 5xx errors
    return (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("econnrefused") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    );
  }
  return true;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const retryable = options.retryable ?? isRetryableError;

  let lastError: unknown;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (!retryable(error)) {
        logger.debug({ attempt: attempt + 1, error }, "Non-retryable error, not retrying");
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Log retry
      logger.warn(
        {
          attempt: attempt + 1,
          maxRetries: opts.maxRetries,
          delay,
          error: error instanceof Error ? error.message : String(error),
        },
        "Retrying after error"
      );

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  logger.error({ error: lastError, attempts: opts.maxRetries + 1 }, "All retries exhausted");
  throw lastError;
}

