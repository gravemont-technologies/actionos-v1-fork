/**
 * Health Check Routes
 * 
 * Provides health, readiness, and liveness probes.
 * Checks dependency health (Supabase, Clerk, OpenAI).
 */

import { Router, Request, Response } from "express";
import { getSupabaseClient, validateDatabaseSchema } from "../db/supabase.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const router = Router();

/**
 * Basic health check (server is running)
 */
router.get("/", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

/**
 * Liveness probe (server is alive)
 */
router.get("/live", (_req: Request, res: Response) => {
  res.json({ status: "alive" });
});

/**
 * Readiness probe (server is ready to serve traffic)
 * Checks all critical dependencies
 */
router.get("/ready", async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; error?: string }> = {};

  // Check Supabase connection and schema
  try {
    const validation = await validateDatabaseSchema();
    if (validation.valid) {
      checks.supabase = { status: "healthy" };
    } else {
      checks.supabase = {
        status: "unhealthy",
        error: validation.error || "Database validation failed",
      };
    }
  } catch (error) {
    checks.supabase = {
      status: "unhealthy",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Check Clerk (if configured)
  if (env.CLERK_SECRET_KEY) {
    checks.clerk = { status: "configured" };
  } else {
    checks.clerk = { status: "not_configured" };
  }

  // Check OpenAI (if configured)
  if (env.OPENAI_API_KEY) {
    checks.openai = { status: "configured" };
  } else {
    checks.openai = { status: "not_configured" };
  }

  // Determine overall readiness
  const allHealthy = Object.values(checks).every(
    (check) => check.status === "healthy" || check.status === "configured" || check.status === "not_configured"
  );

  if (allHealthy) {
    res.json({ status: "ready", checks });
  } else {
    logger.warn({ checks }, "Readiness check failed");
    res.status(503).json({ status: "not_ready", checks });
  }
});

export default router;

