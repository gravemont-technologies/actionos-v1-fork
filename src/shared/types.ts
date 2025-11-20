// Shared types between frontend and backend
// These match the LLM response schema

export type ImmediateStep = {
  step: string;
  effort: "L" | "M" | "H";
  delta_bucket: "SMALL" | "MEDIUM" | "LARGE";
  confidence: "HIGH" | "MED" | "LOW";
  est_method: "heuristic" | "cohort" | "user_reported";
  TTI: "minutes" | "hours" | "days";
};

// Deeper dive type
export type DeeperDive = {
  extended_mitigation: string;
  action_steps: string[];
  warning_signals: string[];
  timeline: string;
};

// Risk type with deeper_dive
export type Risk = {
  risk: string;
  mitigation: string;
  deeper_dive: DeeperDive; // Always present (enforced by guards)
};

export type LLMResponse = {
  summary: string;
  immediate_steps: ImmediateStep[];
  strategic_lens: string;
  top_risks: Risk[]; // Includes deeper_dive
  kpi: {
    name: string;
    target: string;
    cadence: string;
  };
  micro_nudge: string;
  module: {
    name: string;
    steps: string[];
  };
  meta: {
    profile_id: string;
    signature_hash: string;
    cached: boolean;
    timestamp: string;
    title?: string;
  };
};

export type AnalyzeResponse = {
  status: "success";
  normalized: {
    situation: string;
    goal: string;
    constraints: string[]; // Array from normalizeConstraints
    current_steps: string;
    deadline: string;
    stakeholders: string;
    resources: string;
    signature: string;
  };
  cached: boolean;
  baseline?: {
    ipp: number;
    but: number;
    updatedAt?: number;
  };
  output: LLMResponse;
  promptVersion?: string; // Prompt version used for this analysis
};

