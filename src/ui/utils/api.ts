/**
 * Centralized API Client
 * 
 * Provides timeout, retry logic, and error handling for API calls.
 * Replaces direct fetch calls throughout the application.
 */

import { mergeAbortSignals } from './abortSignalPolyfill.js';
import { env } from '../config/env.js';

interface ApiOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal; // Support for request cancellation
}

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const DEFAULT_RETRIES = 2;

/**
 * Resolve full URL with base URL from environment
 */
function resolveUrl(url: string): string {
  // If URL is already absolute, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Get base URL from environment (empty string in production = same-origin)
  const baseUrl = env.VITE_API_URL || '';
  
  // If base URL is empty (production), return relative URL as-is
  if (!baseUrl) {
    return url;
  }
  
  // Ensure base URL doesn't end with slash and URL starts with slash
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  
  return `${cleanBase}${cleanPath}`;
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    // Don't retry on client errors (4xx) except 408 (timeout), 429 (rate limit), and 401 (auth race)
    if (
      message.includes("400") ||
      message.includes("403") ||
      message.includes("404")
    ) {
      return false;
    }
    // Special case: retry 401 once (handles token fetch race condition)
    if (message.includes("401")) {
      return true; // Allow one retry
    }
    // Retry on network errors, timeouts, 5xx errors
    return (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("failed to fetch") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    );
  }
  return true;
}

/**
 * Create timeout promise
 */
function createTimeout(timeoutMs: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  });
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithRetry(
  url: string,
  options: ApiOptions = {},
  attempt: number = 0
): Promise<Response> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const maxRetries = options.retries ?? DEFAULT_RETRIES;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Merge abort signal with existing signal using polyfill-safe utility
    // This ensures both timeout and user cancellation work correctly in all browsers
    const signal = options.signal
      ? mergeAbortSignals(controller.signal, options.signal)
      : controller.signal;

    // Race between fetch and timeout
    const response = await Promise.race([
      fetch(url, { ...options, signal }),
      createTimeout(timeout),
    ]);

    clearTimeout(timeoutId);

    // Check if response is ok
    // For non-ok responses, we'll handle error extraction in apiRequest
    // Don't throw here for 4xx errors - let apiRequest extract the error message
    if (!response.ok) {
      // Don't retry on 4xx errors (except 408, 429) - return response for error extraction
      if (response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429) {
        return response; // Return non-ok response for error extraction
      }
      // Retry on 5xx and specific 4xx errors
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    // Special handling for 401: single retry after 300ms (token fetch race)
    if (error instanceof Error && error.message.includes("401") && attempt === 0) {
      const delay = 300; // 300ms delay for token to be fetched
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, attempt + 1);
    }

    // Check if retryable and not exceeded max retries
    if (isRetryableError(error) && attempt < maxRetries) {
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));

      return fetchWithRetry(url, options, attempt + 1);
    }

    throw error;
  }
}

/**
 * API client with timeout and retry
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: ApiOptions = {}
): Promise<T> {
  // Resolve URL with base URL from environment
  const fullUrl = resolveUrl(url);
  
  try {
    const start = performance.now();
    const method = (options.method || "GET").toString().toUpperCase();
    let response: Response | undefined = undefined;
    let errorForTiming: unknown = undefined;
    try {
      response = await fetchWithRetry(fullUrl, options);
    } catch (err) {
      errorForTiming = err;
      throw err;
    } finally {
      // Dev-only timing log for API calls
      if (typeof window !== "undefined" && (import.meta as any).env?.DEV) {
        const end = performance.now();
        const durationMs = Math.round(end - start);
        const entry = {
          kind: "api" as const,
          method,
          url: fullUrl,
          status: response?.status ?? "ERR",
          duration_ms: durationMs,
          ok: response?.ok ?? false,
          time: new Date().toISOString(),
        };
        (window as any).__perfLogs = (window as any).__perfLogs || [];
        (window as any).__perfLogs.push(entry);
        // eslint-disable-next-line no-console
        console.table([entry]);
      }
    }

    // Handle empty responses
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      if (response.status === 204 || response.status === 201) {
        return undefined as T;
      }
      const text = await response.text();
      return (text ? JSON.parse(text) : undefined) as T;
    }

    const data = await response.json();

    // Check for error in response (including error responses from fetchWithRetry)
    if (data.error) {
      const error = new Error(data.error);
      // Attach status code and error code if available
      (error as any).status = response.status;
      (error as any).code = data.code;
      throw error;
    }

    // If response was not ok but no error in data, create error with status
    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    return data as T;
  } catch (error) {
    // Enhance error message
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        throw new Error("Request timed out. Please try again.");
      }
      if (error.message.includes("network") || error.message.includes("Failed to fetch")) {
        throw new Error("Network error. Please check your connection.");
      }
    }
    throw error;
  }
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = unknown>(url: string, options?: ApiOptions) =>
    apiRequest<T>(url, { ...options, method: "GET" }),

  post: <T = unknown>(url: string, data?: unknown, options?: ApiOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown>(url: string, data?: unknown, options?: ApiOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: ApiOptions) =>
    apiRequest<T>(url, { ...options, method: "DELETE" }),
};

