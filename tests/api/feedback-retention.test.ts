import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../src/server/index.js";
import { getSupabaseClient } from "../../src/server/db/supabase.js";

const mockUserId = "user_retention_test";
const mockProfileId = "abcd1234efgh5678"; // Must be ≥8 hex chars

function authenticatedRequest(method: "get" | "post", path: string) {
  return request(app)[method](path).set("x-clerk-user-id", mockUserId);
}

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function signatureForIndex(index: number) {
  const suffix = index.toString(16).padStart(2, "0");
  return "a".repeat(30) + suffix;
}

async function clearFeedbackData() {
  const supabase = getSupabaseClient();
  await supabase.from("feedback_records").delete().eq("profile_id", mockProfileId);
  await supabase.from("signature_cache").delete().eq("profile_id", mockProfileId);
}

async function insertFeedbackRecords(records: Parameters<typeof getSupabaseClient>["length"] extends 1
  ? any
  : any) {
  const supabase = getSupabaseClient();
  await supabase.from("feedback_records").insert(records);
}

async function seedProfile() {
  const supabase = getSupabaseClient();
  await supabase.from("profiles").upsert({
    profile_id: mockProfileId,
    user_id: mockUserId,
    tags: ["TEST"],
    strengths: ["Focus"],
    baseline_ipp: 65,
    baseline_but: 70,
  });
}

describe("API: /api/step-feedback retention engine", () => {
  beforeAll(async () => {
    await seedProfile();
  });

  beforeEach(async () => {
    await clearFeedbackData();
  });

  afterAll(async () => {
    const supabase = getSupabaseClient();
    await clearFeedbackData();
    await supabase.from("profiles").delete().eq("profile_id", mockProfileId);
  });

  describe("GET /api/step-feedback/stats", () => {
    it("returns zeros when no feedback exists", async () => {
      const response = await authenticatedRequest("get", `/api/step-feedback/stats?profile_id=${mockProfileId}`).expect(200);
      expect(response.body).toMatchObject({ completed: 0, totalDeltaIpp: "0.0", streak: 0 });
    });

    it("calculates completed and streak across consecutive days", async () => {
      await insertFeedbackRecords([
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(0),
          slider: 8,
          delta_ipp: 2.3,
          delta_but: 1.1,
          recorded_at: isoDaysAgo(0),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(1),
          slider: 7,
          delta_ipp: 1.2,
          delta_but: 0.5,
          recorded_at: isoDaysAgo(1),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(2),
          slider: 5,
          delta_ipp: -0.5,
          delta_but: -0.3,
          recorded_at: isoDaysAgo(7),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(3),
          slider: 9,
          delta_ipp: 3.0,
          delta_but: 1.8,
          recorded_at: isoDaysAgo(8),
        },
      ]);

      const response = await authenticatedRequest("get", `/api/step-feedback/stats?profile_id=${mockProfileId}`).expect(200);
      expect(response.body.completed).toBe(3);
      expect(response.body.totalDeltaIpp).toBe("6.0");
      expect(response.body.streak).toBe(2);
    });

    it("resets streak when there is a gap", async () => {
      await insertFeedbackRecords([
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(4),
          slider: 8,
          delta_ipp: 1.0,
          delta_but: 0.9,
          recorded_at: isoDaysAgo(0),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(5),
          slider: 7,
          delta_ipp: 1.0,
          delta_but: 0.8,
          recorded_at: isoDaysAgo(2),
        },
      ]);

      const response = await authenticatedRequest("get", `/api/step-feedback/stats?profile_id=${mockProfileId}`).expect(200);
      expect(response.body.streak).toBe(1);
    });

    it("requires profile_id", async () => {
      await authenticatedRequest("get", "/api/step-feedback/stats").expect(400);
    });
  });

  describe("GET /api/step-feedback/insight-deltas", () => {
    it("validates query parameters", async () => {
      await authenticatedRequest("get", "/api/step-feedback/insight-deltas").expect(400);
      await authenticatedRequest(
        "get",
        `/api/step-feedback/insight-deltas?profile_id=${mockProfileId}&signatures=invalid`
      ).expect(400);
    });

    it("rejects requests over 50 signatures", async () => {
      const signatures = Array.from({ length: 51 }, (_, idx) => signatureForIndex(idx)).join(",");
      await authenticatedRequest(
        "get",
        `/api/step-feedback/insight-deltas?profile_id=${mockProfileId}&signatures=${signatures}`
      ).expect(400);
    });

    it("returns deltas for requested signatures", async () => {
      const records = [
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(10),
          slider: 9,
          delta_ipp: 2.1,
          delta_but: 1.8,
          recorded_at: isoDaysAgo(3),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(11),
          slider: 6,
          delta_ipp: 0.4,
          delta_but: 0.2,
          recorded_at: isoDaysAgo(4),
        },
      ];
      await insertFeedbackRecords(records);

      const response = await authenticatedRequest(
        "get",
        `/api/step-feedback/insight-deltas?profile_id=${mockProfileId}&signatures=${records.map((r) => r.signature).join(",")}`
      ).expect(200);

      expect(response.body.deltas).toHaveProperty(records[0].signature);
      expect(response.body.deltas[records[0].signature].deltaIpp).toBeCloseTo(2.1);
      expect(response.body.deltas[records[1].signature].slider).toBe(6);
    });

    it("returns empty object when no matches found", async () => {
      const response = await authenticatedRequest(
        "get",
        `/api/step-feedback/insight-deltas?profile_id=${mockProfileId}&signatures=${signatureForIndex(20)}`
      ).expect(200);

      expect(response.body.deltas).toEqual({});
    });
  });

  describe("POST /api/step-feedback/insight-deltas", () => {
    it("validates payload", async () => {
      await authenticatedRequest("post", "/api/step-feedback/insight-deltas").expect(400);
      await authenticatedRequest("post", "/api/step-feedback/insight-deltas").send({ profile_id: mockProfileId, signatures: [] }).expect(400);
    });

    it("returns deltas for posted signatures", async () => {
      const records = [
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(30),
          slider: 5,
          delta_ipp: 0.9,
          delta_but: 0.6,
          recorded_at: isoDaysAgo(5),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(31),
          slider: 10,
          delta_ipp: 3.5,
          delta_but: 2.4,
          recorded_at: isoDaysAgo(6),
        },
      ];
      await insertFeedbackRecords(records);

      const response = await authenticatedRequest("post", "/api/step-feedback/insight-deltas")
        .send({ profile_id: mockProfileId, signatures: records.map((r) => r.signature) })
        .expect(200);

      expect(Object.keys(response.body.deltas)).toHaveLength(2);
      expect(response.body.deltas[records[0].signature].deltaIpp).toBeCloseTo(0.9);
    });

    it("returns empty object when signatures are not found", async () => {
      const response = await authenticatedRequest("post", "/api/step-feedback/insight-deltas")
        .send({ profile_id: mockProfileId, signatures: [signatureForIndex(40)] })
        .expect(200);

      expect(response.body.deltas).toEqual({});
    });
  });

  describe("GET /api/step-feedback/recent-wins", () => {
    it("requires profile_id", async () => {
      await authenticatedRequest("get", "/api/step-feedback/recent-wins").expect(400);
    });

    it("returns only wins ordered by recency", async () => {
      await insertFeedbackRecords([
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(50),
          slider: 8,
          delta_ipp: 2,
          delta_but: 1,
          outcome: "Delivered feature X",
          recorded_at: isoDaysAgo(0),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(51),
          slider: 6,
          delta_ipp: 0.5,
          delta_but: 0.4,
          outcome: "Nearly done",
          recorded_at: isoDaysAgo(1),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(52),
          slider: 9,
          delta_ipp: 3,
          delta_but: 2,
          outcome: "Celebrated milestone",
          recorded_at: isoDaysAgo(2),
        },
      ]);

      const response = await authenticatedRequest("get", `/api/step-feedback/recent-wins?profile_id=${mockProfileId}`).expect(200);
      expect(response.body.wins).toHaveLength(2);
      expect(response.body.wins[0].signature).toBe(signatureForIndex(50));
      expect(response.body.wins.every((win: any) => win.slider >= 7)).toBe(true);
    });

    it("returns empty array when no wins", async () => {
      const response = await authenticatedRequest("get", `/api/step-feedback/recent-wins?profile_id=${mockProfileId}`).expect(200);
      expect(response.body.wins).toEqual([]);
    });
  });

  describe("GET /api/step-feedback/outcome-autocomplete", () => {
    it("requires profile_id", async () => {
      await authenticatedRequest("get", "/api/step-feedback/outcome-autocomplete").expect(400);
    });

    it("deduplicates and limits outcomes", async () => {
      await insertFeedbackRecords([
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(60),
          slider: 8,
          delta_ipp: 1,
          delta_but: 0.8,
          outcome: "Ship onboarding flow",
          recorded_at: isoDaysAgo(0),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(61),
          slider: 7,
          delta_ipp: 1.1,
          delta_but: 0.9,
          outcome: "ship onboarding flow",
          recorded_at: isoDaysAgo(1),
        },
        {
          profile_id: mockProfileId,
          signature: signatureForIndex(62),
          slider: 9,
          delta_ipp: 3,
          delta_but: 2,
          outcome: "Plan marketing blitz",
          recorded_at: isoDaysAgo(2),
        },
      ]);

      const response = await authenticatedRequest("get", `/api/step-feedback/outcome-autocomplete?profile_id=${mockProfileId}`).expect(200);
      expect(response.body.outcomes.length).toBeLessThanOrEqual(20);
      expect(response.body.outcomes).toContain("Ship onboarding flow");
      expect(response.body.outcomes).toContain("ship onboarding flow");
      expect(new Set(response.body.outcomes).size).toBe(response.body.outcomes.length);
    });

    it("returns empty array when no completed outcomes", async () => {
      const response = await authenticatedRequest("get", `/api/step-feedback/outcome-autocomplete?profile_id=${mockProfileId}`).expect(200);
      expect(response.body.outcomes).toEqual([]);
    });
  });

  describe("GET /api/step-feedback/sparkline-data", () => {
    it("requires profile_id", async () => {
      await authenticatedRequest("get", "/api/step-feedback/sparkline-data").expect(400);
    });

    it("returns empty array when there are fewer than 15 records", async () => {
      await insertFeedbackRecords([
        ...Array.from({ length: 3 }, (_, idx) => ({
          profile_id: mockProfileId,
          signature: signatureForIndex(70 + idx),
          slider: 5,
          delta_ipp: 0.5,
          delta_but: 0.4,
          recorded_at: isoDaysAgo(idx),
        })),
      ]);

      const response = await authenticatedRequest("get", `/api/step-feedback/sparkline-data?profile_id=${mockProfileId}`).expect(200);
      expect(response.body.data).toEqual([]);
    });

    it("returns normalized predicted and realized values", async () => {
      const records = Array.from({ length: 16 }, (_, idx) => ({
        profile_id: mockProfileId,
        signature: `spark_sig_${idx}_${Date.now()}`,
        slider: idx % 11,
        delta_ipp: 1,
        delta_but: 0.5,
        recorded_at: isoDaysAgo(16 - idx),
      }));
      await insertFeedbackRecords(records);

      const supabase = getSupabaseClient();
      await supabase.from("signature_cache").insert([
        {
          signature: records[0].signature,
          profile_id: mockProfileId,
          response: { immediate_steps: [{ delta_bucket: "SMALL" }] },
          normalized_input: { situation: "x", goal: "y", current_steps: "z" },
          baseline_ipp: 65,
          baseline_but: 70,
        },
        {
          signature: records[1].signature,
          profile_id: mockProfileId,
          response: { immediate_steps: [{ delta_bucket: "MEDIUM" }] },
          normalized_input: { situation: "x", goal: "y", current_steps: "z" },
          baseline_ipp: 65,
          baseline_but: 70,
        },
        {
          signature: records[2].signature,
          profile_id: mockProfileId,
          response: { immediate_steps: [{ delta_bucket: "LARGE" }] },
          normalized_input: { situation: "x", goal: "y", current_steps: "z" },
          baseline_ipp: 65,
          baseline_but: 70,
        },
      ]);

      const response = await authenticatedRequest("get", `/api/step-feedback/sparkline-data?profile_id=${mockProfileId}`).expect(200);
      expect(response.body.data).toHaveLength(records.length);
      expect(response.body.data[0].predicted).toBe(1);
      expect(response.body.data[1].predicted).toBe(2);
      expect(response.body.data[2].predicted).toBe(3);
      expect(response.body.data[0].realized).toBeCloseTo((records[0].slider / 10) * 3);
    });

    it("handles missing delta bucket gracefully", async () => {
      const records = [
        {
          profile_id: mockProfileId,
          signature: `spark_nil_${Date.now()}`,
          slider: 4,
          delta_ipp: 0.4,
          delta_but: 0.3,
          recorded_at: isoDaysAgo(0),
        },
        ...Array.from({ length: 15 }, (_, idx) => ({
          profile_id: mockProfileId,
          signature: `spark_extra_${idx}_${Date.now()}`,
          slider: idx,
          delta_ipp: 0.5,
          delta_but: 0.5,
          recorded_at: isoDaysAgo(15 - idx),
        })),
      ];
      await insertFeedbackRecords(records);

      const response = await authenticatedRequest("get", `/api/step-feedback/sparkline-data?profile_id=${mockProfileId}`).expect(200);
      expect(response.body.data.some((point: any) => point.predicted === 0)).toBe(true);
    });
  });
});
