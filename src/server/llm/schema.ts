import { z } from "zod";

export const immediateStepSchema = z
  .object({
    step: z.string().min(1),
    effort: z.enum(["L", "M", "H"]),
    delta_bucket: z.enum(["SMALL", "MEDIUM", "LARGE"]),
    confidence: z.enum(["HIGH", "MED", "LOW"]),
    est_method: z.enum(["heuristic", "cohort", "user_reported"]),
    TTI: z.enum(["minutes", "hours", "days"]),
  })
  .strict();

// Deeper dive schema (condensed, token-efficient)
export const deeperDiveSchema = z
  .object({
    extended_mitigation: z.string().min(50).max(500),
    action_steps: z.array(z.string().min(10).max(200)).min(2).max(5),
    warning_signals: z.array(z.string().min(10).max(150)).min(1).max(3),
    timeline: z.string().min(20).max(200),
  })
  .strict();

// Risk schema with deeper_dive
export const riskSchema = z
  .object({
    risk: z.string().min(1),
    mitigation: z.string().min(1),
    deeper_dive: deeperDiveSchema, // REQUIRED for new responses
  })
  .strict();

export const responseSchema = z
  .object({
    summary: z.string().min(1),
    immediate_steps: z.array(immediateStepSchema).min(1).max(3),
    strategic_lens: z.string().min(1),
    top_risks: z.array(riskSchema).min(1).max(2), // Uses riskSchema with deeper_dive
    kpi: z
      .object({
        name: z.string().min(1),
        target: z.string().min(1),
        cadence: z.string().min(1),
      })
      .strict(),
    micro_nudge: z.string().min(1),
    module: z
      .object({
        name: z.string().min(1),
        steps: z.array(z.string().min(1)).min(3).max(3),
      })
      .strict(),
    meta: z
      .object({
        profile_id: z.string().min(1),
        signature_hash: z.string().min(1),
        cached: z.boolean(),
        timestamp: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type LLMResponse = z.infer<typeof responseSchema>;

// Retrospective insights schema
export const retrospectiveInsightsSchema = z
  .object({
    insights: z.string().min(1),
    what_worked: z.string().min(1),
    what_didnt: z.string().min(1),
    improvements: z.array(z.string().min(1)).min(1),
  })
  .strict();

export type RetrospectiveInsights = z.infer<typeof retrospectiveInsightsSchema>;

