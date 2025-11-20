/**
 * Rate Limiting Middleware
 * 
 * Per-user rate limiting using express-rate-limit.
 * Different limits per endpoint based on resource cost.
 * Returns 429 with Retry-After header when limit exceeded.
 */

import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { RateLimitError } from "./errorHandler.js";
import { logger } from "../utils/logger.js";

/**
 * Create rate limiter with custom key generator (uses userId)
 */
function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) {
  // In test environment, use very high limits to avoid test failures
  const isTest = process.env.NODE_ENV === "test";
  const effectiveMax = isTest ? 10000 : options.max;
  const effectiveWindowMs = isTest ? 1000 : options.windowMs;
  
  return rateLimit({
    windowMs: effectiveWindowMs,
    max: effectiveMax,
    message: options.message || "Too many requests, please try again later.",
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,

    // Use userId for key generation (falls back to IP if no userId)
    keyGenerator: (req: Request): string => {
      return req.userId || req.ip || "anonymous";
    },

    // Custom handler to use our error format
    handler: (req: Request, res: Response) => {
      const requestLogger = logger.child({
        requestId: req.id,
        userId: req.userId,
        ip: req.ip,
      });
      requestLogger.warn("Rate limit exceeded");

      const retryAfter = Math.ceil(options.windowMs / 1000);
      const error = new RateLimitError(
        options.message || "Rate limit exceeded",
        retryAfter
      );

      res.status(429).json({
        error: error.message,
        code: error.code,
        requestId: req.id,
        retryAfter: error.retryAfter,
      });
    },

    // Standard headers
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Rate limiter for analyze endpoint (expensive LLM calls)
 * 10 requests per minute
 */
export const analyzeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: "Too many analysis requests. Please wait before trying again.",
});

/**
 * Rate limiter for feedback endpoint
 * More lenient in development for Dashboard parallel requests
 */
export const feedbackRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "development" ? 1000 : 30, // Effectively unlimited in dev
  message: "Too many feedback requests. Please wait before trying again.",
});

/**
 * Rate limiter for onboarding endpoint
 * 5 requests per minute (prevent abuse during signup)
 */
export const onboardingRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: "Too many onboarding requests. Please wait before trying again.",
});

/**
 * Rate limiter for insights endpoint (lightweight, frequent during quiz)
 * No rate limiting in development for smooth UX during quiz
 * 500 requests per minute in production (quiz can have many rapid clicks)
 */
export const insightsRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === "development" ? 10000 : 500, // Effectively unlimited in dev
  message: "Too many insight requests. Please slow down.",
  skipSuccessfulRequests: false,
});

/**
 * General API rate limiter (applied to all routes)
 * 100 requests per minute
 */
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: "Too many requests. Please wait before trying again.",
});

