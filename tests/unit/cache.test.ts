import { describe, it, expect, beforeEach } from "vitest";
import { SignatureCache } from "../../src/server/cache/signatureCache.js";
import { LLMResponse } from "../../src/server/llm/schema.js";

describe("SignatureCache", () => {
  let cache: SignatureCache;
  const testSignature = "test_signature_" + Date.now();
  const testProfileId = "test_profile_123";

  beforeEach(() => {
    cache = new SignatureCache();
  });

  it("should store and retrieve cache entries", async () => {
    const response: LLMResponse = {
      summary: "Test summary",
      immediate_steps: [
        {
          step: "Test step",
          effort: "L",
          delta_bucket: "SMALL",
          confidence: "HIGH",
          est_method: "heuristic",
          TTI: "minutes",
        },
      ],
      strategic_lens: "Test lens",
      top_risks: [{ risk: "Risk", mitigation: "Mitigation" }],
      kpi: { name: "KPI", target: "100", cadence: "weekly" },
      micro_nudge: "Nudge",
      module: { name: "Module", steps: ["1", "2", "3"] },
      meta: {
        profile_id: testProfileId,
        signature_hash: testSignature,
        cached: false,
        timestamp: new Date().toISOString(),
      },
    };

    await cache.set({
      signature: testSignature,
      profileId: testProfileId,
      response,
      normalizedInput: {
        situation: "Test situation",
        goal: "Test goal",
        constraints: ["constraint1"],
        current_steps: "Test steps",
      },
      baselineIpp: 65,
      baselineBut: 72,
    });

    const retrieved = await cache.get(testSignature);

    expect(retrieved).not.toBeNull();
    expect(retrieved?.signature).toBe(testSignature);
    expect(retrieved?.response.summary).toBe("Test summary");
    expect(retrieved?.normalizedInput.situation).toBe("Test situation");
  });

  it("should return null for non-existent signature", async () => {
    const result = await cache.get("nonexistent_signature");
    expect(result).toBeNull();
  });

  it("should invalidate cache entry", async () => {
    // Set cache entry
    const response: LLMResponse = {
      summary: "Test",
      immediate_steps: [
        {
          step: "Step",
          effort: "L",
          delta_bucket: "SMALL",
          confidence: "HIGH",
          est_method: "heuristic",
          TTI: "minutes",
        },
      ],
      strategic_lens: "Lens",
      top_risks: [{ risk: "Risk", mitigation: "Mitigation" }],
      kpi: { name: "KPI", target: "100", cadence: "weekly" },
      micro_nudge: "Nudge",
      module: { name: "Module", steps: ["1", "2", "3"] },
      meta: {
        profile_id: testProfileId,
        signature_hash: testSignature,
        cached: false,
        timestamp: new Date().toISOString(),
      },
    };

    await cache.set({
      signature: testSignature,
      profileId: testProfileId,
      response,
      normalizedInput: {
        situation: "Situation",
        goal: "Goal",
        constraints: [],
        current_steps: "Steps",
      },
      baselineIpp: 65,
      baselineBut: 72,
    });

    // Verify it exists
    expect(await cache.get(testSignature)).not.toBeNull();

    // Invalidate
    await cache.invalidate(testSignature);

    // Verify it's gone
    expect(await cache.get(testSignature)).toBeNull();
  });
});

