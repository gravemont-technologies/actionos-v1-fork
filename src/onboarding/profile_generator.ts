import { createHash, randomUUID } from "crypto";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const questions: QuizQuestion[] = require("./questions.json");

export type BaselineMetric = {
  ipp: number; // Impact Per Person proxy (0-100 scale)
  but: number; // Barakah Per Unit Time proxy (0-100 scale)
};

export type QuizOption = {
  id: string;
  label: string;
  tags: string[];
  insight: string;
  baselineAdjustments: BaselineMetric;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
};

export type QuizResponseMap = Record<string, string>;

export type Profile = {
  profile_id: string;
  tags: string[];
  baseline: BaselineMetric;
  strengths: string[];
  metadata: {
    risk_tolerance?: string;
    peak_hours?: string;
    cadence?: string;
  };
};

export type ResponseInsight = {
  questionId: string;
  optionId: string;
  insight: string;
};

const DEFAULT_BASELINE: BaselineMetric = { ipp: 50, but: 50 };
const DEFAULT_TAGS = ["SYSTEMATIC", "HIGH_LEVERAGE", "MEDIUM_RISK", "ACTION_READY"];

const STRENGTH_TAG_MAP: Record<string, string> = {
  OPERATOR: "Operational rigor",
  PROCESS_DRIVEN: "Process excellence",
  PRODUCT_MIND: "Product insight",
  SYNTHESIS: "Insight synthesis",
  RELATIONAL: "Influence loops",
  ASC_ACCELERATOR: "Community amplification",
};

const METADATA_QUESTION_MAP: Record<string, keyof Profile["metadata"]> = {
  risk_tolerance: "risk_tolerance",
  peak_hours: "peak_hours",
  execution_cadence: "cadence",
};

export function listQuestions(): QuizQuestion[] {
  return questions;
}

export function getOption(questionId: string, optionId: string): QuizOption {
  const question = questions.find((q) => q.id === questionId);
  if (!question) {
    throw new Error(`Unknown question id "${questionId}"`);
  }

  const option = question.options.find((opt) => opt.id === optionId);
  if (!option) {
    throw new Error(`Unknown option id "${optionId}" for question "${questionId}"`);
  }

  return option;
}

export function collectInsights(responses: QuizResponseMap): ResponseInsight[] {
  return Object.entries(responses).map(([questionId, optionId]) => {
    const option = getOption(questionId, optionId);
    return { questionId, optionId, insight: option.insight };
  });
}

export function generateProfile(
  responses: QuizResponseMap,
  existingProfileId?: string
): Profile {
  enforceCompleteness(responses);

  const tagScores = new Map<string, number>();
  let baseline = { ...DEFAULT_BASELINE };

  Object.entries(responses).forEach(([questionId, optionId]) => {
    const option = getOption(questionId, optionId);

    option.tags.forEach((tag) => {
      tagScores.set(tag, (tagScores.get(tag) ?? 0) + 1);
    });

    baseline = {
      ipp: clamp(baseline.ipp + option.baselineAdjustments.ipp, 20, 95),
      but: clamp(baseline.but + option.baselineAdjustments.but, 20, 95),
    };
  });

  const derivedTags = deriveTopTags(tagScores, DEFAULT_TAGS, 4);
  const strengths = deriveStrengths(derivedTags);
  const profile_id = existingProfileId ?? createProfileId(responses);
  const metadata = deriveMetadata(responses);

  return {
    profile_id,
    tags: derivedTags,
    baseline,
    strengths,
    metadata,
  };
}

function deriveTopTags(
  scores: Map<string, number>,
  defaults: string[],
  desiredCount: number
): string[] {
  const sorted = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);

  const unique = Array.from(new Set([...sorted, ...defaults]));
  return unique.slice(0, desiredCount);
}

function deriveStrengths(tags: string[]): string[] {
  const strengths = tags
    .map((tag) => STRENGTH_TAG_MAP[tag])
    .filter((value): value is string => Boolean(value));

  if (strengths.length === 0) {
    return ["Operational rigor", "Action bias"];
  }

  return Array.from(new Set(strengths));
}

function createProfileId(responses: QuizResponseMap): string {
  const hash = createHash("sha256")
    .update(JSON.stringify(responses))
    .update(randomUUID())
    .digest("hex");

  return hash.slice(0, 12);
}

function deriveMetadata(responses: QuizResponseMap): Profile["metadata"] {
  return Object.entries(METADATA_QUESTION_MAP).reduce<Profile["metadata"]>(
    (acc, [questionId, key]) => {
      const answer = responses[questionId];
      if (answer) {
        acc[key] = answer;
      }
      return acc;
    },
    {}
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function enforceCompleteness(responses: QuizResponseMap): void {
  const unanswered = questions
    .filter((question) => !responses[question.id])
    .map((question) => question.id);

  if (unanswered.length > 0) {
    throw new Error(
      `Missing responses for: ${unanswered
        .map((id) => `"${id}"`)
        .join(", ")}`
    );
  }
}

