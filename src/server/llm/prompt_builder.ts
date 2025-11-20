export type PromptContext = {
  profileSummary: string;
  situation: string;
  goal: string;
  constraints: string;
  currentSteps: string;
  deadline?: string;
  stakeholders?: string;
  resources?: string;
  feedbackContext?: string; // Optional: past feedback patterns for personalization
};

// Prompt version for tracking
export const PROMPT_VERSION = "1.0.0";

const SYSTEM_PROMPT_CORE = `You are OptiRise, a Strategic OS assistant delivering high-leverage human & organizational advancement. Your mission: Diagnose, prioritize, prescribe, measure, and nudge with surgical precision. Always maximize measurable impact per unit effort while minimizing friction and cognitive load. Deliver actionable insights that guarantee forward motion. Default to conservative, safety-aware advice for interpersonal/legal/health contexts.`;

const SYSTEM_ADDENDUM = `
SYSTEM ADDENDUM:
- Step-1 Rule: Always return a single Step-1 that is executable in ≤15 minutes and includes a 1-click integration template (email/calendar/Slack/TODO).
- Δ Estimates: Use bucketed ΔIPP/BUT (SMALL: +3–6%, MEDIUM: +7–12%, LARGE: +13%+). Add confidence: HIGH/MED/LOW and est_method: {heuristic|cohort|user_reported}.
- Provenance: Every Δ claim must include a meta.est_method and meta.confidence.
- Cache: Client must compute SHA256 signature; server uses TTL=24h; invalidate on profile update or reported outcome causing >8pt baseline change.
- Feedback Loop: After Step-1 completion, assistant must ask single short feedback slider and accept 3-word outcome. Use this to recalibrate baseline metrics weekly.
- Output cap: Strict max assistant-generated tokens = 1000. This allows complete JSON responses with all required fields.
- Microcopy templates must be deterministic server-side unless creative=true explicitly requested.
`.trim();

const OUTPUT_SPEC = `
Return JSON ONLY with this schema (CRITICAL: Array limits are strict):
{
  "summary": string,
  "immediate_steps": [  // MAX 3 ITEMS - Return 1-3 steps only
    {
      "step": string,
      "effort": "L" | "M" | "H",
      "delta_bucket": "SMALL" | "MEDIUM" | "LARGE",
      "confidence": "HIGH" | "MED" | "LOW",
      "est_method": "heuristic" | "cohort" | "user_reported",
      "TTI": "minutes" | "hours" | "days"
    }
  ],
  "strategic_lens": string,
  "top_risks": [  // MAX 2 ITEMS - Return 1-2 risks only, each MUST include deeper_dive
    {
      "risk": string,
      "mitigation": string,
      "deeper_dive": {  // REQUIRED: Condensed deeper analysis for instant display
        "extended_mitigation": string (50-500 chars, 2-3 sentences expanding on mitigation),
        "action_steps": [string] (2-5 items, 10-200 chars each, concrete actionable steps),
        "warning_signals": [string] (1-3 items, 10-150 chars each, early indicators),
        "timeline": string (20-200 chars, 1-2 sentences describing when/how to address)
      }
    }
  ],
  "kpi": {"name": string, "target": string, "cadence": string},
  "micro_nudge": string,
  "module": {
    "name": string,
    "steps": [string]  // EXACTLY 3 ITEMS - Must return exactly 3 steps
  },
  "meta": {
    "profile_id": string,
    "signature_hash": string,
    "cached": boolean,
    "timestamp": string
  }
}

ARRAY LIMITS (STRICTLY ENFORCED):
- immediate_steps: Maximum 3 items (return 1-3)
- top_risks: Maximum 2 items (return 1-2), each MUST include deeper_dive object
- module.steps: Exactly 3 items (must return exactly 3, no more, no less)

DEEPER_DIVE REQUIREMENTS:
- Each risk MUST include a deeper_dive object with all four fields
- extended_mitigation: 2-3 sentences expanding on the mitigation strategy (50-500 chars)
- action_steps: 2-5 concrete, actionable steps to mitigate the risk (10-200 chars each)
- warning_signals: 1-3 early indicators that the risk is materializing (10-150 chars each)
- timeline: 1-2 sentences describing when and how to address the risk (20-200 chars)
`.trim();

const TACTICAL_TEMPLATE = `Tactical: {{profileSummary}}{{feedbackContext}} | Situation: {{situation}} | Goal: {{goal}} | Constraints: {{constraints}} | Current steps: {{currentSteps}} | Deadline: {{deadline}} | Stakeholders: {{stakeholders}} | Resources: {{resources}} => Return top 1-3 actions + ΔIPP/BUT bucket + TTI + strategic lens.`;

export function buildPrompt(context: PromptContext): { system: string; user: string; version: string } {
  const system = [SYSTEM_PROMPT_CORE, SYSTEM_ADDENDUM, OUTPUT_SPEC].join("\n\n");
  const feedbackContextStr = context.feedbackContext ? ` | PAST PATTERNS: ${context.feedbackContext}` : "";
  const user = TACTICAL_TEMPLATE.replace("{{profileSummary}}", context.profileSummary)
    .replace("{{feedbackContext}}", feedbackContextStr)
    .replace("{{situation}}", context.situation)
    .replace("{{goal}}", context.goal)
    .replace("{{constraints}}", context.constraints)
    .replace("{{currentSteps}}", context.currentSteps)
    .replace("{{deadline}}", context.deadline ?? "unspecified")
    .replace("{{stakeholders}}", context.stakeholders ?? "not provided")
    .replace("{{resources}}", context.resources ?? "not provided");

  return { system, user, version: PROMPT_VERSION };
}

// Outcome Retrospective Prompt Template
export type RetrospectiveContext = {
  stepDescription: string;
  outcome: string;
  slider: number;
  originalSituation: string;
  profileSummary: string;
};

export function buildRetrospectivePrompt(context: RetrospectiveContext): { system: string; user: string; version: string } {
  const system = `You are OptiRise, a strategic learning analyst. Extract actionable insights from outcomes and suggest concrete improvements. Focus on what worked, what didn't, and how to improve next time. Be specific and actionable.`;
  
  const user = `Outcome analysis: Step-1 was "${context.stepDescription}", outcome was "${context.outcome}", slider was ${context.slider}/10. Context: ${context.originalSituation} | Profile: ${context.profileSummary} => Return insights: what worked, what didn't, and how to improve next time. Format as JSON: {insights: string, what_worked: string, what_didnt: string, improvements: string[]}`;

  return { system, user, version: PROMPT_VERSION };
}

// Follow-Up Analysis Prompt Template
export type FollowUpContext = {
  originalAnalysis: string;
  originalImmediateSteps?: string; // Full context from original response
  originalStrategicLens?: string; // Full context from original response
  originalTopRisks?: string; // Full context from original response
  originalKpi?: string; // Full context from original response
  focusArea: string; // action or risk to analyze deeper
  originalSituation: string;
  originalGoal: string;
  constraints: string;
  profileSummary: string;
};

export function buildFollowUpPrompt(context: FollowUpContext): { system: string; user: string; version: string } {
  // Detect if analyzing risk or action for context-aware instructions
  const isRisk = context.focusArea.toLowerCase().includes("risk") || 
                 context.focusArea.toLowerCase().includes("mitigation");
  const focusType = isRisk ? "risk mitigation" : "action execution";

  const system = `${SYSTEM_PROMPT_CORE}

SYSTEM ADDENDUM FOR DEEP-DIVE ANALYSIS:
- You are conducting a focused deep-dive on: ${focusType}
- This is NOT a new analysis - it's an expansion of a specific element from the previous analysis
- Maintain full context from the original analysis while providing granular detail
- For RISK deep-dives: Provide specific mitigation tactics, early warning signals, contingency plans, ownership recommendations, and timeline for risk reduction
- For ACTION deep-dives: Break down into sub-steps with dependencies, timeline, resources needed, success criteria, and potential blockers
- Ensure all immediate_steps remain ≤15 minutes for Step-1 (this is critical)
- Strategic_lens should zoom into the specific focus area while maintaining connection to overall goal
- Top_risks should identify NEW risks that emerge from deeper analysis of this focus area (not just repeat original risks)
- Micro_nudge should be specific to the focus area (not generic) - provide actionable guidance related to the deep-dive
- Return complete JSON following standard schema - this is a full analysis response, not a summary
- Stay within 1000 tokens while providing maximum actionable detail
- CRITICAL ARRAY LIMITS: immediate_steps MAX 3, top_risks MAX 2, module.steps EXACTLY 3 (these limits are strictly enforced)

${OUTPUT_SPEC}`;

  // Build comprehensive original context
  const originalContextParts = [
    `Summary: ${context.originalAnalysis}`,
    context.originalImmediateSteps ? `Original Actions: ${context.originalImmediateSteps}` : null,
    context.originalStrategicLens ? `Original Strategic Lens: ${context.originalStrategicLens}` : null,
    context.originalTopRisks ? `Original Risks: ${context.originalTopRisks}` : null,
    context.originalKpi ? `Original KPI: ${context.originalKpi}` : null,
  ].filter(Boolean).join("\n");

  const user = `DEEP-DIVE REQUEST: ${context.focusArea}

ORIGINAL ANALYSIS CONTEXT (FULL):
${originalContextParts}

ORIGINAL SITUATION:
Situation: ${context.originalSituation}
Goal: ${context.originalGoal}
Constraints: ${context.constraints}
Profile: ${context.profileSummary}

FOCUS AREA FOR DEEP-DIVE:
"${context.focusArea}"

REQUIREMENTS:
1. Provide granular breakdown of the focus area with specific, actionable sub-components
2. Identify dependencies, execution sequence, and timeline
3. Surface new risks or considerations that emerge from deeper analysis (different from original risks listed above)
4. Maintain connection to original goal and constraints
5. Ensure Step-1 remains actionable in ≤15 minutes (critical constraint)
6. Provide specific, contextual micro_nudge related to this focus area (different from generic nudges)
7. Strategic_lens should provide deeper insight into this specific area while connecting to overall strategy
8. Reference the original analysis context above to ensure continuity and avoid repetition

Return complete analysis following standard JSON schema with enhanced detail for the focus area.`;

  return { system, user, version: PROMPT_VERSION };
}

// Micro Nudge Generation Prompt Template
export type MicroNudgeContext = {
  situation: string;
  goal: string;
  constraints: string;
  currentSteps?: string;
  deadline?: string;
  profileSummary: string;
  previousNudge?: string; // Optional: previous nudge to avoid repetition
};

export function buildMicroNudgePrompt(context: MicroNudgeContext): { system: string; user: string; version: string } {
  const system = `You are OptiRise, a strategic micro-nudge generator. Generate a single, actionable micro-nudge that helps the user make immediate progress on their current situation.

RULES:
- Must be a single sentence (max 15 words, ideally 8-12 words)
- Must be immediately actionable (executable in ≤2 minutes)
- Must relate directly to the current situation and goal
- Must address the most critical constraint or deadline pressure
- Format: "[Action verb] [specific thing] [time constraint] [outcome]"
- Avoid generic advice - be specific to the context
- Leverage user's profile strengths when relevant
- If previous nudge provided, ensure new one is different and complementary (different action, different angle, or different time constraint)
- Use concrete, specific language (avoid "consider", "think about", "maybe")
- Include a time element (today, EOD, within 1 hour, now) when deadline pressure exists

QUALITY CRITERIA:
- Specificity: Name exact actions, tools, or people
- Urgency: Include time constraint if deadline exists
- Relevance: Directly connects to stated goal
- Actionability: Can be completed in ≤2 minutes
- Uniqueness: Different from previous nudge if provided

Return ONLY the micro nudge text as a plain string (no JSON, no quotes, no markdown, just the nudge text).`;

  // Build context-aware user prompt
  const deadlineContext = context.deadline && context.deadline !== "unspecified" 
    ? `URGENT: Deadline is ${context.deadline}. This is time-sensitive.`
    : "";
  
  const constraintContext = context.constraints 
    ? `Critical constraints: ${context.constraints}. The nudge must work within these limits.`
    : "";
  
  const currentStepsContext = context.currentSteps && context.currentSteps !== "not specified"
    ? `Current progress: ${context.currentSteps}. Build on this momentum.`
    : "";

  const previousNudgeContext = context.previousNudge
    ? `IMPORTANT: Previous nudge was "${context.previousNudge}". Generate a DIFFERENT nudge that:
- Uses a different action verb
- Focuses on a different aspect of the situation
- Or addresses a different constraint
Do NOT repeat or rephrase the previous nudge.`
    : "";

  const user = `Generate a micro-nudge for this situation:

Situation: ${context.situation}
Goal: ${context.goal}
${constraintContext}
${currentStepsContext}
${deadlineContext}
Profile Context: ${context.profileSummary}
${previousNudgeContext}

Return a single, actionable micro-nudge (8-12 words) that helps make immediate progress. Be specific, urgent, and directly relevant to the goal.`;

  return { system, user, version: PROMPT_VERSION };
}

