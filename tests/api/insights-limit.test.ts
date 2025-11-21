import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/server/index.js";
import { getSupabaseClient } from "../../src/server/db/supabase.js";

// Mock Clerk authentication for testing
const mockUserId = "user_test_limit_456";
const mockProfileId = "cafebabe87654321"; // Must be ≥8 hex chars

// Helper to create authenticated request
function authenticatedRequest(method: "get" | "post" | "delete", path: string) {
  return request(app)[method](path).set("x-clerk-user-id", mockUserId);
}

describe("API: /api/insights - Project Limit (5 max)", () => {
  const testSignatures: string[] = [];

  beforeAll(async () => {
    const supabase = getSupabaseClient();

    // Clean up any existing test data
    await supabase.from("profiles").delete().eq("profile_id", mockProfileId);
    await supabase.from("signature_cache").delete().eq("user_id", mockUserId);

    // Create test profile
    const { error } = await supabase.from("profiles").upsert(
      {
        profile_id: mockProfileId,
        user_id: mockUserId,
        tags: ["TEST"],
        baseline_ipp: 50,
        baseline_but: 50,
        strengths: [],
        metadata: {},
        consent_to_store: true,
      },
      { onConflict: "profile_id" }
    );

    if (error) {
      throw error;
    }
  });

  afterAll(async () => {
    const supabase = getSupabaseClient();
    // Cleanup: delete all test signatures and profile
    await supabase.from("signature_cache").delete().eq("user_id", mockUserId);
    await supabase.from("profiles").delete().eq("profile_id", mockProfileId);
  });

  it("should allow saving up to 5 insights (projects)", async () => {
    const supabase = getSupabaseClient();

    // Create 5 cache entries (unsaved, temporary) - signatures must be 64-char hex (SHA256 format)
    for (let i = 0; i < 5; i++) {
      const signature = `abcdef1234567890${i.toString().padStart(2, "0")}abc`.padEnd(64, "0");
      testSignatures.push(signature);

      await supabase.from("signature_cache").upsert({
        signature,
        profile_id: mockProfileId,
        user_id: mockUserId,
        response: { summary: `Test analysis ${i}` },
        normalized_input: {
          situation: "test",
          goal: "test",
          constraints: [],
          current_steps: "test",
        },
        baseline_ipp: 50,
        baseline_but: 50,
        expires_at: new Date(Date.now() + 86400000).toISOString(), // 24h from now
        is_saved: false,
      });
    }

    // Save each one via API (should succeed for all 5)
    for (let i = 0; i < 5; i++) {
      const response = await authenticatedRequest("post", "/api/insights/save").send({
        signature: testSignatures[i],
      });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("success");
    }

    // Verify count endpoint returns 5
    const countResponse = await authenticatedRequest("get", "/api/insights/count");
    expect(countResponse.status).toBe(200);
    expect(countResponse.body.count).toBe(5);
  });

  it("should block saving 6th insight with PROJECT_LIMIT_REACHED error", async () => {
    const supabase = getSupabaseClient();

    // Create a 6th cache entry - signature must be 64-char hex
    const signature6 = "ff".padEnd(64, "f");
    await supabase.from("signature_cache").upsert({
      signature: signature6,
      profile_id: mockProfileId,
      user_id: mockUserId,
      response: { summary: "Test analysis 6" },
      normalized_input: {
        situation: "test",
        goal: "test",
        constraints: [],
        current_steps: "test",
      },
      baseline_ipp: 50,
      baseline_but: 50,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      is_saved: false,
    });

    // Attempt to save the 6th insight (should fail)
    const response = await authenticatedRequest("post", "/api/insights/save").send({
      signature: signature6,
    });

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("PROJECT_LIMIT_REACHED");
    expect(response.body.message).toContain("Maximum 5 projects");
  });

  it("should allow saving after deleting (unsaving) a project", async () => {
    const supabase = getSupabaseClient();

    // Unsave the first insight
    const deleteResponse = await authenticatedRequest(
      "delete",
      `/api/insights/${testSignatures[0]}`
    );
    expect(deleteResponse.status).toBe(200);

    // Verify count dropped to 4
    const countResponse = await authenticatedRequest("get", "/api/insights/count");
    expect(countResponse.status).toBe(200);
    expect(countResponse.body.count).toBe(4);

    // Now save the 6th insight (should succeed since we have room)
    const signature6 = "ff".padEnd(64, "f");
    const saveResponse = await authenticatedRequest("post", "/api/insights/save").send({
      signature: signature6,
    });

    expect(saveResponse.status).toBe(200);
    expect(saveResponse.body.status).toBe("success");

    // Verify count is back to 5
    const finalCount = await authenticatedRequest("get", "/api/insights/count");
    expect(finalCount.status).toBe(200);
    expect(finalCount.body.count).toBe(5);
  });
});
