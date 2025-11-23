// src/types/express.d.ts
// Extends Express's Request type to include our custom properties.

declare global {
  namespace Express {
    interface Locals {
      userId: string;
      sessionId: string;
    }
  }
}

// This file needs to be a module.
export {};
