import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/server/index.js";

describe("API: /api/health", () => {
  describe("GET /api/health", () => {
    it("should return health status", async () => {
      const response = await request(app)
        .get("/api/health")
        .expect(200);

      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe("ok");
    });

    it("should not require authentication", async () => {
      const response = await request(app)
        .get("/api/health")
        .expect(200);

      expect(response.body.status).toBe("ok");
    });
  });
});

