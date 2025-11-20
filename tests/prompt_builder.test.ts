import { describe, it, expect } from "vitest";
import { buildPrompt, buildRetrospectivePrompt, buildFollowUpPrompt, buildMicroNudgePrompt, PROMPT_VERSION } from "../src/server/llm/prompt_builder.js";

describe("Prompt Builder", () => {
  describe("buildPrompt", () => {
    it("should build main analysis prompt with all fields", () => {
      const context = {
        profileSummary: "PROFILE test123: SYSTEMATIC | BASELINE: IPP=65.0, BUT=72.5 | STRENGTHS: Quick execution",
        situation: "Need to improve team productivity",
        goal: "Increase output by 20%",
        constraints: "budget limited, time constrained",
        currentSteps: "reviewing current processes",
        deadline: "end of quarter",
        stakeholders: "team lead, finance",
        resources: "existing tools",
      };

      const result = buildPrompt(context);

      expect(result.version).toBe(PROMPT_VERSION);
      expect(result.system).toContain("OptiRise");
      expect(result.system).toContain("Strategic OS assistant");
      expect(result.user).toContain(context.profileSummary);
      expect(result.user).toContain(context.situation);
      expect(result.user).toContain(context.goal);
      expect(result.user).toContain(context.constraints);
    });

    it("should include feedback context when provided", () => {
      const context = {
        profileSummary: "PROFILE test123: SYSTEMATIC",
        situation: "test situation",
        goal: "test goal",
        constraints: "test constraints",
        currentSteps: "test steps",
        feedbackContext: "high satisfaction (avg 8.0/10); improving trend; themes: success, completed",
      };

      const result = buildPrompt(context);

      expect(result.user).toContain("PAST PATTERNS");
      expect(result.user).toContain("high satisfaction");
    });

    it("should handle optional fields with defaults", () => {
      const context = {
        profileSummary: "PROFILE test123: SYSTEMATIC",
        situation: "test situation",
        goal: "test goal",
        constraints: "test constraints",
        currentSteps: "test steps",
      };

      const result = buildPrompt(context);

      expect(result.user).toContain("unspecified");
      expect(result.user).toContain("not provided");
    });
  });

  describe("buildRetrospectivePrompt", () => {
    it("should build retrospective prompt with outcome data", () => {
      const context = {
        stepDescription: "Schedule a 15-minute win",
        outcome: "completed successfully",
        slider: 8,
        originalSituation: "Need to improve productivity",
        profileSummary: "PROFILE test123: SYSTEMATIC",
      };

      const result = buildRetrospectivePrompt(context);

      expect(result.version).toBe(PROMPT_VERSION);
      expect(result.system).toContain("strategic learning analyst");
      expect(result.user).toContain(context.stepDescription);
      expect(result.user).toContain(context.outcome);
      expect(result.user).toContain("slider was 8/10");
    });
  });

  describe("buildMicroNudgePrompt", () => {
    it("should build micro nudge prompt with context", () => {
      const prompt = buildMicroNudgePrompt({
        situation: "I need to finish my project",
        goal: "Complete project by Friday",
        constraints: "time, budget",
        currentSteps: "Working on features",
        deadline: "Friday",
        profileSummary: "PROFILE test: SYSTEMATIC | BASELINE: IPP=65, BUT=72 | STRENGTHS: Quick execution",
        previousNudge: "Send one email to stakeholder",
      });

      expect(prompt.system).toContain("micro-nudge generator");
      expect(prompt.system).toContain("QUALITY CRITERIA");
      expect(prompt.user).toContain("I need to finish my project");
      expect(prompt.user).toContain("Complete project by Friday");
      expect(prompt.user).toContain("time, budget");
      expect(prompt.user).toContain("Previous nudge was");
      expect(prompt.version).toBeDefined();
    });

    it("should build micro nudge prompt without previous nudge", () => {
      const prompt = buildMicroNudgePrompt({
        situation: "Test situation",
        goal: "Test goal",
        constraints: "Test constraints",
        profileSummary: "PROFILE test: SYSTEMATIC | BASELINE: IPP=65, BUT=72",
      });

      expect(prompt.user).not.toContain("Previous nudge");
      expect(prompt.version).toBeDefined();
    });
  });

  describe("buildFollowUpPrompt", () => {
    it("should build follow-up prompt with full context", () => {
      const prompt = buildFollowUpPrompt({
        originalAnalysis: "Focus on quick wins",
        originalImmediateSteps: "Step 1: Review | Step 2: Execute",
        originalStrategicLens: "Strategic view",
        originalTopRisks: "Risk 1: No follow-through - Mitigation: Deadlines",
        originalKpi: "Productivity: 20% increase",
        focusArea: "Risk: No follow-through",
        originalSituation: "Need productivity",
        originalGoal: "Increase output",
        constraints: "budget limited",
        profileSummary: "PROFILE test: SYSTEMATIC | BASELINE: IPP=65, BUT=72",
      });

      expect(prompt.user).toContain("Original Actions: Step 1: Review | Step 2: Execute");
      expect(prompt.user).toContain("Original Strategic Lens: Strategic view");
      expect(prompt.user).toContain("Original Risks: Risk 1: No follow-through");
      expect(prompt.user).toContain("Original KPI: Productivity: 20% increase");
      expect(prompt.system).toContain("DEEP-DIVE ANALYSIS");
      expect(prompt.version).toBeDefined();
    });

    it("should build follow-up prompt with focus area", () => {
      const context = {
        originalAnalysis: "Focus on a tiny experiment",
        focusArea: "Risk: No follow-through",
        originalSituation: "Need to improve productivity",
        originalGoal: "Increase output",
        constraints: "budget limited",
        profileSummary: "PROFILE test123: SYSTEMATIC",
      };

      const result = buildFollowUpPrompt(context);

      expect(result.version).toBe(PROMPT_VERSION);
      expect(result.system).toContain("OptiRise");
      expect(result.user).toContain(context.focusArea);
      expect(result.user).toContain(context.originalAnalysis);
    });
  });
});

