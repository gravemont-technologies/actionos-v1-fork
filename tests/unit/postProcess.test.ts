import { describe, it, expect } from "vitest";
import { enforceResponseGuards } from "../../src/server/llm/post_process.js";
import { LLMResponse } from "../../src/server/llm/schema.js";

describe("Post-Processing: enforceResponseGuards", () => {
  it("should enforce Step-1 TTI to be minutes", () => {
    const response: LLMResponse = {
      summary: "Test summary",
      immediate_steps: [
        {
          step: "Test step",
          effort: "L",
          delta_bucket: "SMALL",
          confidence: "HIGH",
          est_method: "heuristic",
          TTI: "hours", // Should be changed to "minutes"
        },
      ],
      strategic_lens: "Test lens",
      top_risks: [{ risk: "Test risk", mitigation: "Test mitigation" }],
      kpi: { name: "Test KPI", target: "100", cadence: "weekly" },
      micro_nudge: "Test nudge",
      module: { name: "Test Module", steps: ["Step 1", "Step 2", "Step 3"] },
      meta: {
        profile_id: "test123",
        signature_hash: "abc123",
        cached: false,
        timestamp: new Date().toISOString(),
      },
    };

    const result = enforceResponseGuards(response, "test_signature");

    expect(result.immediate_steps[0].TTI).toBe("minutes");
  });

  it("should append timebox instruction if missing", () => {
    const response: LLMResponse = {
      summary: "Test",
      immediate_steps: [
        {
          step: "Test step without timebox",
          effort: "L",
          delta_bucket: "SMALL",
          confidence: "HIGH",
          est_method: "heuristic",
          TTI: "minutes",
        },
      ],
      strategic_lens: "Test",
      top_risks: [{ risk: "Risk", mitigation: "Mitigation" }],
      kpi: { name: "KPI", target: "100", cadence: "weekly" },
      micro_nudge: "Nudge",
      module: { name: "Module", steps: ["1", "2", "3"] },
      meta: {
        profile_id: "test",
        signature_hash: "test",
        cached: false,
        timestamp: new Date().toISOString(),
      },
    };

    const result = enforceResponseGuards(response, "test");

    expect(result.immediate_steps[0].step).toContain("Execute in ≤15 minutes");
  });

  it("should append CTA templates to Step-1", () => {
    const response: LLMResponse = {
      summary: "Test",
      immediate_steps: [
        {
          step: "Send email to team",
          effort: "L",
          delta_bucket: "SMALL",
          confidence: "HIGH",
          est_method: "heuristic",
          TTI: "minutes",
        },
      ],
      strategic_lens: "Test",
      top_risks: [{ risk: "Risk", mitigation: "Mitigation" }],
      kpi: { name: "KPI", target: "100", cadence: "weekly" },
      micro_nudge: "Nudge",
      module: { name: "Module", steps: ["1", "2", "3"] },
      meta: {
        profile_id: "test",
        signature_hash: "test",
        cached: false,
        timestamp: new Date().toISOString(),
      },
    };

    const result = enforceResponseGuards(response, "test");

    const stepText = result.immediate_steps[0].step;
    expect(stepText).toContain("Email template");
    expect(stepText).toContain("Calendar template");
    expect(stepText).toContain("Slack template");
    expect(stepText).toContain("TODO template");
  });

  it("should inject default micro-nudge if missing", () => {
    const response: LLMResponse = {
      summary: "Test",
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
      strategic_lens: "Test",
      top_risks: [{ risk: "Risk", mitigation: "Mitigation" }],
      kpi: { name: "KPI", target: "100", cadence: "weekly" },
      micro_nudge: "", // Empty
      module: { name: "Module", steps: ["1", "2", "3"] },
      meta: {
        profile_id: "test",
        signature_hash: "test",
        cached: false,
        timestamp: new Date().toISOString(),
      },
    };

    const result = enforceResponseGuards(response, "test");

    expect(result.micro_nudge.length).toBeGreaterThan(0);
    expect(result.micro_nudge).not.toBe("");
  });
});

