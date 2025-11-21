import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/server/index.js";
import { getSupabaseClient } from "../../src/server/db/supabase.js";

const mockUserId = "user_test_123";
const mockProfileId = "beefcafe12345678"; // Must be ≥8 hex chars

function authenticatedRequest(method: "get" | "post", path: string) {
  return request(app)[method](path).set("x-clerk-user-id", mockUserId);
}

describe("API: /api/step-feedback", () => {
  let testProfileId: string;
  let testSignature: string;

  beforeAll(async () => {
    // Create test profile and active step
    const supabase = getSupabaseClient();
    testProfileId = mockProfileId;
    testSignature = "test_signature_" + Date.now();

    await supabase.from("profiles").upsert({
      profile_id: testProfileId,
      user_id: mockUserId,
      tags: ["SYSTEMATIC"],
      baseline_ipp: 65,
      baseline_but: 72,
      strengths: ["Quick execution"],
    });

    await supabase.from("active_steps").upsert({
      profile_id: testProfileId,
      signature: testSignature,
      step_description: "Test step description",
      completed_at: null,
      outcome: null,
    });
  });

  afterAll(async () => {
    const supabase = getSupabaseClient();
    await supabase.from("feedback_records").delete().eq("profile_id", testProfileId);
    await supabase.from("active_steps").delete().eq("profile_id", testProfileId);
    await supabase.from("profiles").delete().eq("profile_id", testProfileId);
  });

  beforeEach(async () => {
    // Reset baseline before each test
    const supabase = getSupabaseClient();
    await supabase
      .from("profiles")
      .update({ baseline_ipp: 65, baseline_but: 72 })
      .eq("profile_id", testProfileId);
  });

  describe("POST /api/step-feedback", () => {
    it("should validate required fields", async () => {
      const response = await authenticatedRequest("post", "/api/step-feedback")
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should validate signature format", async () => {
      const response = await authenticatedRequest("post", "/api/step-feedback")
        .send({
          profile_id: testProfileId,
          signature: "invalid-signature", // Not hex
          slider: 8,
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should validate slider range", async () => {
      const response = await authenticatedRequest("post", "/api/step-feedback")
        .send({
          profile_id: testProfileId,
          signature: testSignature,
          slider: 15, // Out of range
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should record feedback and update baseline", async () => {
      const response = await authenticatedRequest("post", "/api/step-feedback")
        .send({
          profile_id: testProfileId,
          signature: testSignature,
          slider: 8,
          outcome: "completed successfully",
        })
        .expect(200);

      expect(response.body).toHaveProperty("status", "recorded");
      expect(response.body).toHaveProperty("baseline");
      expect(response.body).toHaveProperty("delta");
      expect(response.body.baseline).toHaveProperty("ipp");
      expect(response.body.baseline).toHaveProperty("but");
      expect(response.body.baseline.ipp).toBeGreaterThan(65); // Should increase
    });

    it("should handle outcome text length limit", async () => {
      const longOutcome = "a".repeat(100); // Exceeds 80 char limit

      const response = await authenticatedRequest("post", "/api/step-feedback")
        .send({
          profile_id: testProfileId,
          signature: testSignature,
          slider: 7,
          outcome: longOutcome,
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should mark step as completed", async () => {
      const supabase = getSupabaseClient();
      
      // Create a new active step
      const newSignature = "test_sig_" + Date.now();
      await supabase.from("active_steps").upsert({
        profile_id: testProfileId,
        signature: newSignature,
        step_description: "Test step",
        completed_at: null,
        outcome: null,
      });

      await authenticatedRequest("post", "/api/step-feedback")
        .send({
          profile_id: testProfileId,
          signature: newSignature,
          slider: 8,
          outcome: "done",
        })
        .expect(200);

      // Verify step is marked as completed
      const { data } = await supabase
        .from("active_steps")
        .select("*")
        .eq("profile_id", testProfileId)
        .eq("signature", newSignature)
        .single();

      expect(data?.completed_at).not.toBeNull();
      expect(data?.outcome).toBe("done");
    });
  });

  describe("GET /api/step-feedback/recent", () => {
    it("should return recent feedback records", async () => {
      // Create some feedback first
      const supabase = getSupabaseClient();
      await supabase.from("feedback_records").insert([
        {
          profile_id: testProfileId,
          signature: "sig1",
          slider: 8,
          outcome: "success",
          recorded_at: new Date().toISOString(),
          delta_ipp: 3,
          delta_but: 2.4,
        },
        {
          profile_id: testProfileId,
          signature: "sig2",
          slider: 7,
          outcome: "good",
          recorded_at: new Date(Date.now() - 86400000).toISOString(),
          delta_ipp: 2,
          delta_but: 1.6,
        },
      ]);

      const response = await authenticatedRequest("get", `/api/step-feedback/recent?profile_id=${testProfileId}`)
        .expect(200);

      expect(response.body).toHaveProperty("feedback");
      expect(response.body.feedback).toBeInstanceOf(Array);
      expect(response.body.feedback.length).toBeGreaterThan(0);
      expect(response.body.feedback[0]).toHaveProperty("slider");
      expect(response.body.feedback[0]).toHaveProperty("outcome");
      expect(response.body.feedback[0]).toHaveProperty("recordedAt");
    });

    it("should require profile_id query parameter", async () => {
      const response = await authenticatedRequest("get", "/api/step-feedback/recent")
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("GET /api/step-feedback/baseline", () => {
    it("should return current baseline", async () => {
      const response = await authenticatedRequest("get", `/api/step-feedback/baseline?profile_id=${testProfileId}`)
        .expect(200);

      expect(response.body).toHaveProperty("baseline");
      expect(response.body.baseline).toHaveProperty("ipp");
      expect(response.body.baseline).toHaveProperty("but");
      expect(typeof response.body.baseline.ipp).toBe("number");
      expect(typeof response.body.baseline.but).toBe("number");
    });
  });

  describe("GET /api/step-feedback/active-step", () => {
    it("should return active step if exists", async () => {
      const supabase = getSupabaseClient();
      const activeSignature = "active_" + Date.now();
      await supabase.from("active_steps").upsert({
        profile_id: testProfileId,
        signature: activeSignature,
        step_description: "Active step description",
        completed_at: null,
        outcome: null,
      });

      const response = await authenticatedRequest("get", `/api/step-feedback/active-step?profile_id=${testProfileId}`)
        .expect(200);

      expect(response.body).toHaveProperty("activeStep");
      expect(response.body.activeStep).toHaveProperty("signature", activeSignature);
      expect(response.body.activeStep).toHaveProperty("description");
    });

    it("should return null if no active step", async () => {
      // Delete all active steps
      const supabase = getSupabaseClient();
      await supabase.from("active_steps").delete().eq("profile_id", testProfileId);

      const response = await authenticatedRequest("get", `/api/step-feedback/active-step?profile_id=${testProfileId}`)
        .expect(200);

      expect(response.body).toHaveProperty("activeStep", null);
    });
  });

  describe("POST /api/step-feedback/retrospective", () => {
    it("should validate retrospective request", async () => {
      const response = await authenticatedRequest("post", "/api/step-feedback/retrospective")
        .send({
          // Missing required fields
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should generate retrospective insights", async () => {
      // Create cache entry with original situation
      const supabase = getSupabaseClient();
      const retroSignature = "retro_" + Date.now();
      await supabase.from("signature_cache").insert({
        signature: retroSignature,
        profile_id: testProfileId,
        response: { summary: "Test analysis" },
        normalized_input: {
          situation: "Original situation for retrospective",
          goal: "Original goal",
          constraints: [],
          current_steps: "Steps",
        },
        baseline_ipp: 65,
        baseline_but: 72,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      const response = await authenticatedRequest("post", "/api/step-feedback/retrospective")
        .send({
          profile_id: testProfileId,
          signature: retroSignature,
          step_description: "Completed step description",
          outcome: "successful completion",
          slider: 8,
          original_situation: "", // Will be retrieved from cache
        })
        .expect(200);

      expect(response.body).toHaveProperty("status", "success");
      expect(response.body).toHaveProperty("insights");
      expect(response.body).toHaveProperty("promptVersion");
      expect(response.body.insights).toHaveProperty("insights");
      expect(response.body.insights).toHaveProperty("what_worked");
      expect(response.body.insights).toHaveProperty("what_didnt");
      expect(response.body.insights).toHaveProperty("improvements");
      expect(response.body.insights.improvements).toBeInstanceOf(Array);
    });

    it("should handle missing cache entry gracefully", async () => {
      const response = await authenticatedRequest("post", "/api/step-feedback/retrospective")
        .send({
          profile_id: testProfileId,
          signature: "nonexistent_signature",
          step_description: "Step",
          outcome: "Outcome",
          slider: 7,
          original_situation: "Provided situation",
        })
        .expect(200); // Should still work with provided situation

      expect(response.body).toHaveProperty("status", "success");
    });
  });
});

