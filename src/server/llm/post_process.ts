import { LLMResponse } from "./schema.js";

const DEFAULT_MICRO_NUDGE = "Replace “maybe” with “decide by EOD” in your next update.";

const EMAIL_TEMPLATE = `Email template — Subject: "Quick: [Action] — 15m to test" | Body: Hi [Name], I’ll run a 15-minute experiment now: [Action short description]. Can you briefly watch for [metric/outcome]? I'll report results by [date/time]. — [You]`;
const CALENDAR_TEMPLATE =
  'Calendar template — Title: "15m: Execute Step-1 — [Action short]" | Description: Do this: [Action sentence]. Goal: [KPI target]. After: mark complete & submit 3-word result.';
const SLACK_TEMPLATE =
  'Slack template — "@here Quick 15m test: [Action]. Goal: [KPI]. Ping me when done — I’ll post result."';
const TODO_TEMPLATE = 'TODO template — "Create task: [Action], timebox: 15m, due: today + 1h."';

export function enforceResponseGuards(response: any, fallbackSignature: string): LLMResponse {
  // Handle potential field name mismatches (e.g., immediate_step vs immediate_steps)
  if (response.immediate_step && !response.immediate_steps) {
    response.immediate_steps = response.immediate_step;
    delete response.immediate_step;
  }

  const updated: any = { ...response };
  
  // Ensure meta object exists
  if (!updated.meta) {
    updated.meta = {};
  }
  updated.meta.signature_hash = updated.meta.signature_hash || fallbackSignature;
  updated.meta.timestamp = updated.meta.timestamp || new Date().toISOString();
  updated.meta.cached = updated.meta.cached ?? false;
  updated.meta.profile_id = updated.meta.profile_id || "";

  if (!updated.micro_nudge) {
    updated.micro_nudge = DEFAULT_MICRO_NUDGE;
  }

  // Ensure arrays exist
  if (!Array.isArray(updated.immediate_steps)) {
    updated.immediate_steps = [];
  }
  if (!Array.isArray(updated.top_risks)) {
    updated.top_risks = [];
  }
  if (!updated.module) {
    updated.module = { name: "", steps: [] };
  }
  if (!Array.isArray(updated.module.steps)) {
    updated.module.steps = [];
  }
  if (!updated.module.name) {
    updated.module.name = "Execution Module";
  }

  // Enforce array limits BEFORE validation to prevent Zod errors
  // immediate_steps: max 3 items
  if (updated.immediate_steps.length > 3) {
    updated.immediate_steps = updated.immediate_steps.slice(0, 3);
  }

  // top_risks: max 2 items
  if (updated.top_risks.length > 2) {
    updated.top_risks = updated.top_risks.slice(0, 2);
  }

  // module.steps: exactly 3 items (min 3, max 3)
  if (updated.module.steps.length > 3) {
    updated.module.steps = updated.module.steps.slice(0, 3);
  } else if (updated.module.steps.length < 3) {
    // Pad with placeholder if less than 3
    while (updated.module.steps.length < 3) {
      updated.module.steps.push("Complete previous step");
    }
  }

  // Ensure minimum requirements
  if (updated.immediate_steps.length === 0) {
    updated.immediate_steps = [{
      step: "Review the analysis and identify the first actionable step",
      effort: "L" as const,
      delta_bucket: "SMALL" as const,
      confidence: "MED" as const,
      est_method: "heuristic" as const,
      TTI: "minutes" as const,
    }];
  }

  if (updated.top_risks.length === 0) {
    updated.top_risks = [{
      risk: "Unforeseen obstacles may arise during execution",
      mitigation: "Maintain flexibility and have contingency plans ready",
      deeper_dive: { // NEW: Default deeper_dive
        extended_mitigation: "This requires careful monitoring and proactive mitigation.",
        action_steps: ["Review current mitigation approach", "Identify potential gaps", "Implement additional safeguards"],
        warning_signals: ["Early indicators of risk materialization", "Metrics trending in wrong direction"],
        timeline: "Address immediately and monitor continuously.",
      },
    }];
  } else {
    // ENHANCED: Ensure deeper_dive exists for all risks (backward compatibility)
    updated.top_risks = updated.top_risks.map((risk: any) => {
      // If deeper_dive missing, generate fallback
      if (!risk.deeper_dive || typeof risk.deeper_dive !== 'object') {
        risk.deeper_dive = {
          extended_mitigation: risk.mitigation + " This requires careful monitoring and proactive mitigation.",
          action_steps: [
            "Review current mitigation approach",
            "Identify potential gaps",
            "Implement additional safeguards"
          ],
          warning_signals: [
            "Early indicators of risk materialization",
            "Metrics trending in wrong direction"
          ],
          timeline: "Address immediately and monitor continuously.",
        };
      } else {
        // Validate and enforce limits
        if (risk.deeper_dive.action_steps && risk.deeper_dive.action_steps.length > 5) {
          risk.deeper_dive.action_steps = risk.deeper_dive.action_steps.slice(0, 5);
        }
        if (risk.deeper_dive.warning_signals && risk.deeper_dive.warning_signals.length > 3) {
          risk.deeper_dive.warning_signals = risk.deeper_dive.warning_signals.slice(0, 3);
        }
        // Ensure all required fields exist
        if (!risk.deeper_dive.extended_mitigation) {
          risk.deeper_dive.extended_mitigation = risk.mitigation + " This requires careful monitoring.";
        }
        if (!risk.deeper_dive.timeline) {
          risk.deeper_dive.timeline = "Address immediately and monitor continuously.";
        }
        // Ensure arrays exist
        if (!Array.isArray(risk.deeper_dive.action_steps)) {
          risk.deeper_dive.action_steps = ["Review current mitigation approach"];
        }
        if (!Array.isArray(risk.deeper_dive.warning_signals)) {
          risk.deeper_dive.warning_signals = ["Early indicators of risk materialization"];
        }
      }
      return risk;
    });
  }

  // Ensure required string fields exist
  if (!updated.summary) {
    updated.summary = "Analysis completed";
  }
  if (!updated.strategic_lens) {
    updated.strategic_lens = "Strategic analysis of the focus area";
  }
  if (!updated.kpi) {
    updated.kpi = {
      name: "Progress",
      target: "Achieve goal",
      cadence: "Weekly",
    };
  }

  if (updated.immediate_steps.length > 0) {
    updated.immediate_steps = [
      applyStepOneConstraints(updated.immediate_steps[0]),
      ...updated.immediate_steps.slice(1),
    ];
  }

  return updated as LLMResponse;
}

function applyStepOneConstraints(step: LLMResponse["immediate_steps"][number]) {
  const updated = { ...step };
  updated.TTI = "minutes";
  updated.step = ensureTimeboxedInstruction(updated.step);
  updated.step = [
    updated.step,
    EMAIL_TEMPLATE,
    CALENDAR_TEMPLATE,
    SLACK_TEMPLATE,
    TODO_TEMPLATE,
  ].join(" | ");
  return updated;
}

function ensureTimeboxedInstruction(instruction: string): string {
  if (/15\s?m(in|inutes)/i.test(instruction)) {
    return instruction;
  }
  return `${instruction} (Execute in ≤15 minutes)`;
}

