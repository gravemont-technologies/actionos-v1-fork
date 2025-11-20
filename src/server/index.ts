// Validate environment on startup
import "dotenv/config";
import "./config/env.js";
import express from "express";
import { SignatureCache } from "./cache/signatureCache.js";
import analyzeRouter from "./routes/analyze.js";
import feedbackRouter from "./routes/feedback.js";
import onboardingRouter from "./routes/onboarding.js";
import healthRouter from "./routes/health.js";
import insightsRouter from "./routes/insights.js";
import { ProfileStore } from "./store/profileStore.js";
import { requestContextMiddleware } from "./middleware/requestContext.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { generalRateLimiter } from "./middleware/rateLimiter.js";
import { timeoutMiddleware } from "./middleware/timeout.js";
import { sanitizeInput } from "./middleware/validateInput.js";
import { logger } from "./utils/logger.js";
import { env } from "./config/env.js";

const app = express();

// 1. Request context (request ID generation)
app.use(requestContextMiddleware);

// 2. CORS for frontend
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", env.FRONTEND_URL);
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-signature, x-clerk-user-id, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 3. Body parser with size limit
app.use(express.json({ limit: "10mb" }));

// 3.5. Input sanitization (after body parser, before routes)
app.use(sanitizeInput);

// 4. Request logging middleware
app.use((req, res, next) => {
  const requestLogger = logger.child({
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.userId,
  });
  requestLogger.debug("Incoming request");

  // Log response when finished
  res.on("finish", () => {
    requestLogger.info(
      {
        statusCode: res.statusCode,
        duration: Date.now() - (req as any).startTime,
      },
      "Request completed"
    );
  });

  (req as any).startTime = Date.now();
  next();
});

// 5. General rate limiting (applied to all routes)
app.use(generalRateLimiter);

// Initialize app locals
app.locals.signatureCache = new SignatureCache();
app.locals.profileStore = new ProfileStore();

// 6. Routes (with specific middleware applied in route files)
app.use("/api/health", healthRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/analyze", analyzeRouter);
app.use("/api/step-feedback", feedbackRouter);
app.use("/api/insights", insightsRouter);

// 7. 404 handler
app.use(notFoundHandler);

// 8. Error handler (must be last)
app.use(errorHandler);

const port = env.PORT;

if (env.NODE_ENV !== "test") {
  app.listen(port, () => {
    logger.info({ port, env: env.NODE_ENV }, "Action OS server started");
  });
}

export default app;

