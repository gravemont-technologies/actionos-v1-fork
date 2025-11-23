import { getSupabaseClient } from "../db/supabase.js";
import type { Database } from "../../types/database.types";
import { logger } from "./logger.js";

type StepMetricsInsert = Database['public']['Tables']['step_metrics']['Insert'];
type UserDailyMetricsInsert = Database['public']['Tables']['user_daily_metrics']['Insert'];
type StepMetricsRow = Database['public']['Tables']['step_metrics']['Row'];

/**
 * Core metrics calculation utilities
 * NO complex abstractions, NO premature optimization
 * Calculates IPP, BUT, and secondary metrics with validation
 */

export interface StepMetricsInput {
  stepId: string;
  profileId: string;
  signature: string;
  
  // IPP components
  magnitude: number; // 1-10
  reach: number; // number of people
  depth: number; // 0.1-3.0
  
  // BUT components
  easeScore: number; // 1-10
  alignmentScore: number; // 1-10
  frictionScore: number; // 0-10
  hadUnexpectedWins: boolean;
  unexpectedWinsDescription?: string;
  
  // Time
  estimatedMinutes: number;
  actualMinutes: number;
  
  // Outcome
  outcomeDescription?: string;
}

/**
 * Validate metric input ranges
 */
function validateMetrics(input: StepMetricsInput): void {
  if (input.magnitude < 1 || input.magnitude > 10) {
    throw new Error(`Invalid magnitude: ${input.magnitude}. Must be 1-10.`);
  }
  if (input.reach < 0) {
    throw new Error(`Invalid reach: ${input.reach}. Must be >= 0.`);
  }
  if (input.depth < 0.1 || input.depth > 3.0) {
    throw new Error(`Invalid depth: ${input.depth}. Must be 0.1-3.0.`);
  }
  if (input.easeScore < 1 || input.easeScore > 10) {
    throw new Error(`Invalid easeScore: ${input.easeScore}. Must be 1-10.`);
  }
  if (input.alignmentScore < 1 || input.alignmentScore > 10) {
    throw new Error(`Invalid alignmentScore: ${input.alignmentScore}. Must be 1-10.`);
  }
  if (input.frictionScore < 0 || input.frictionScore > 10) {
    throw new Error(`Invalid frictionScore: ${input.frictionScore}. Must be 0-10.`);
  }
  if (input.estimatedMinutes <= 0 || input.actualMinutes <= 0) {
    throw new Error("Time values must be > 0");
  }
}

/**
 * Calculate IPP Score
 * Formula: Magnitude × Reach × Depth
 */
export function calculateIPP(magnitude: number, reach: number, depth: number): number {
  return magnitude * reach * depth;
}

/**
 * Calculate BUT Score
 * Formula: (Positive Outcomes / Time) × Multipliers
 */
export function calculateBUT(
  easeScore: number,
  alignmentScore: number,
  frictionScore: number,
  actualMinutes: number,
  hadUnexpectedWins: boolean
): number {
  // Normalize to 0-1
  const normalizedEase = easeScore / 10;
  const normalizedAlignment = alignmentScore / 10;
  const normalizedFriction = 1 - (frictionScore / 10);
  
  // Base positive outcomes (average of ease and alignment)
  const positiveOutcomes = (normalizedEase + normalizedAlignment) / 2;
  
  // Per-hour efficiency
  const timeInHours = actualMinutes / 60;
  const baseEfficiency = positiveOutcomes / Math.max(timeInHours, 0.1); // Prevent division by tiny numbers
  
  // Multipliers
  const alignmentMultiplier = 0.5 + (normalizedAlignment * 1.5); // 0.5-2.0
  const momentumMultiplier = hadUnexpectedWins ? 1.5 : 1.0;
  const frictionMultiplier = 0.5 + (normalizedFriction * 1.5); // 0.5-2.0
  
  return baseEfficiency * alignmentMultiplier * momentumMultiplier * frictionMultiplier;
}

/**
 * Calculate Time Allocation Accuracy
 * Formula: 1 - |est - act| / est
 */
export function calculateTAA(estimatedMinutes: number, actualMinutes: number): number {
  if (estimatedMinutes === 0) return 0;
  const accuracy = 1 - (Math.abs(estimatedMinutes - actualMinutes) / estimatedMinutes);
  return Math.max(0, Math.min(1, accuracy)); // Clamp 0-1
}

/**
 * Record Step-1 completion metrics
 * This is called when user submits the post-completion form
 */
export async function recordStepMetrics(input: StepMetricsInput): Promise<void> {
  validateMetrics(input);
  
  const supabase = getSupabaseClient();
  const ippScore = calculateIPP(input.magnitude, input.reach, input.depth);
  const butScore = calculateBUT(
    input.easeScore,
    input.alignmentScore,
    input.frictionScore,
    input.actualMinutes,
    input.hadUnexpectedWins
  );
  const taaScore = calculateTAA(input.estimatedMinutes, input.actualMinutes);
  
  const metricsRow: any = {
    step_id: input.stepId,
    profile_id: input.profileId,
    signature: input.signature,
    magnitude: input.magnitude,
    reach: input.reach,
    depth: input.depth,
    ease_score: input.easeScore,
    alignment_score: input.alignmentScore,
    friction_score: input.frictionScore,
    had_unexpected_wins: input.hadUnexpectedWins,
    unexpected_wins_description: input.unexpectedWinsDescription || null,
    estimated_minutes: input.estimatedMinutes,
    actual_minutes: input.actualMinutes,
    outcome_description: input.outcomeDescription || null,
    completed_at: new Date().toISOString(),
  };
  
  const { error } = await supabase.from("step_metrics").insert(metricsRow as any);
  
  if (error) {
    logger.error({ error, profileId: input.profileId }, "Failed to record step metrics");
    throw new Error(`Failed to record metrics: ${error.message}`);
  }
  
  // Update daily aggregates
  await updateDailyMetrics(input.profileId);
  
  logger.info({ 
    profileId: input.profileId, 
    ipp: ippScore.toFixed(2), 
    but: butScore.toFixed(2),
    taa: taaScore.toFixed(2)
  }, "Step metrics recorded");
}

/**
 * Update daily aggregated metrics for a profile
 * Called after each step completion
 */
async function updateDailyMetrics(profileId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Get metrics for different time windows
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Fetch all step metrics for calculations
  const { data, error: fetchError } = await supabase
    .from("step_metrics")
    .select<"*", StepMetricsRow>('*')
    .eq("profile_id", profileId)
    .order("completed_at", { ascending: false });
  
  const allMetrics = (data || []) as any[];
  
  if (fetchError) {
    logger.error({ error: fetchError, profileId }, "Failed to fetch metrics for aggregation");
    return;
  }
  
  if (allMetrics.length === 0) return;
  
  // Calculate IPP sums by time period
  const todayMetrics = allMetrics.filter(m => m.completed_at && m.completed_at.startsWith(today));
  const last7Days = allMetrics.filter(m => m.completed_at && new Date(m.completed_at) >= sevenDaysAgo);
  const last30Days = allMetrics.filter(m => m.completed_at && new Date(m.completed_at) >= thirtyDaysAgo);
  
  const dailyIpp = todayMetrics.reduce((sum, m) => {
    const ipp = calculateIPP(m.magnitude || 0, m.reach || 0, m.depth || 1);
    return sum + ipp;
  }, 0);
  
  const sevenDayIpp = last7Days.reduce((sum, m) => {
    const ipp = calculateIPP(m.magnitude || 0, m.reach || 0, m.depth || 1);
    return sum + ipp;
  }, 0);
  
  const thirtyDayIpp = last30Days.reduce((sum, m) => {
    const ipp = calculateIPP(m.magnitude || 0, m.reach || 0, m.depth || 1);
    return sum + ipp;
  }, 0);
  
  const allTimeIpp = allMetrics.reduce((sum, m) => {
    const ipp = calculateIPP(m.magnitude || 0, m.reach || 0, m.depth || 1);
    return sum + ipp;
  }, 0);
  
  // Calculate BUT averages
  const calcAvgBut = (metrics: typeof allMetrics) => {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((s, m) => {
      const but = calculateBUT(
        m.ease_score || 5,
        m.alignment_score || 5,
        m.friction_score || 5,
        m.actual_minutes || 60,
        m.had_unexpected_wins || false
      );
      return s + but;
    }, 0);
    return sum / metrics.length;
  };
  
  const dailyBut = calcAvgBut(todayMetrics);
  const sevenDayBut = calcAvgBut(last7Days);
  const thirtyDayBut = calcAvgBut(last30Days);
  
  // Calculate S1SR (steps with IPP > 0)
  const stepsWithImpact = todayMetrics.filter(m => {
    const ipp = calculateIPP(m.magnitude || 0, m.reach || 0, m.depth || 1);
    return ipp > 0;
  }).length;
  const s1sr = todayMetrics.length > 0 ? (stepsWithImpact / todayMetrics.length) * 100 : 0;
  
  // Calculate TAA average
  const taaScores = todayMetrics
    .filter(m => m.estimated_minutes && m.actual_minutes)
    .map(m => calculateTAA(m.estimated_minutes!, m.actual_minutes!));
  const avgTaa = taaScores.length > 0 
    ? (taaScores.reduce((s, t) => s + t, 0) / taaScores.length) * 100 
    : 0;
  
  // Calculate HLAD (high-leverage action density)
  const allIpps = allMetrics.map(m => calculateIPP(m.magnitude || 0, m.reach || 0, m.depth || 1));
  allIpps.sort((a, b) => b - a);
  const p80Index = Math.floor(allIpps.length * 0.2);
  const p80Threshold = allIpps[p80Index] || 0;
  
  const highLeverageToday = todayMetrics.filter(m => {
    const ipp = calculateIPP(m.magnitude || 0, m.reach || 0, m.depth || 1);
    return ipp >= p80Threshold;
  }).length;
  const hlad = todayMetrics.length > 0 ? (highLeverageToday / todayMetrics.length) * 100 : 0;
  
  // Calculate RSI (Reality Shift Index)
  // RSI = (IPP_trend * 0.6) + (BUT_trend * 0.4)
  // Need previous 7-day values
  const prev7DayMetrics = allMetrics.filter(m => {
    const date = new Date(m.completed_at);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    return date >= fourteenDaysAgo && date < sevenDaysAgo;
  });
  
  const prev7DayIpp = prev7DayMetrics.reduce((sum, m) => {
    const ipp = calculateIPP(m.magnitude || 0, m.reach || 0, m.depth || 1);
    return sum + ipp;
  }, 0);
  
  const prev7DayBut = calcAvgBut(prev7DayMetrics);
  
  const ippTrend = prev7DayIpp > 0 ? ((sevenDayIpp - prev7DayIpp) / prev7DayIpp) * 100 : 0;
  const butTrend = prev7DayBut > 0 ? ((sevenDayBut - prev7DayBut) / prev7DayBut) * 100 : 0;
  const rsi = (ippTrend * 0.6) + (butTrend * 0.4);
  
  // ICR will be calculated separately when we have insights tracking
  const icr = 0;
  const insightsCreated = 0;
  const insightsConverted = 0;
  
  // Upsert daily metrics
  const dailyMetricsRow: any = {
    profile_id: profileId,
    date: today,
    daily_ipp: Number(dailyIpp.toFixed(2)),
    seven_day_ipp: Number(sevenDayIpp.toFixed(2)),
    thirty_day_ipp: Number(thirtyDayIpp.toFixed(2)),
    all_time_ipp: Number(allTimeIpp.toFixed(2)),
    daily_but: Number(dailyBut.toFixed(2)),
    seven_day_but: Number(sevenDayBut.toFixed(2)),
    thirty_day_but: Number(thirtyDayBut.toFixed(2)),
    icr: Number(icr.toFixed(2)),
    s1sr: Number(s1sr.toFixed(2)),
    rsi: Number(rsi.toFixed(2)),
    taa: Number(avgTaa.toFixed(2)),
    hlad: Number(hlad.toFixed(2)),
    steps_completed: todayMetrics.length,
    steps_with_impact: stepsWithImpact,
    high_leverage_steps: highLeverageToday,
    insights_created: insightsCreated,
    insights_converted: insightsConverted,
  };
  
  const { error: upsertError } = await supabase
    .from("user_daily_metrics")
    .upsert(dailyMetricsRow as any, { onConflict: "profile_id,date" });
  
  if (upsertError) {
    logger.error({ error: upsertError, profileId }, "Failed to upsert daily metrics");
  } else {
    logger.debug({ profileId, date: today, rsi: rsi.toFixed(2) }, "Daily metrics updated");
  }
}

/**
 * Get current metrics for a profile
 */
export async function getProfileMetrics(profileId: string): Promise<UserDailyMetricsInsert | null> {
  const supabase = getSupabaseClient();
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from("user_daily_metrics")
    .select("*")
    .eq("profile_id", profileId)
    .eq("date", today)
    .single();
  
  if (error) {
    if (error.code === "PGRST116") return null; // No rows
    logger.error({ error, profileId }, "Failed to fetch profile metrics");
    return null;
  }
  
  return data;
}

/**
 * Get metrics history for a profile
 */
export async function getMetricsHistory(
  profileId: string, 
  days: number = 30
): Promise<UserDailyMetricsInsert[]> {
  const supabase = getSupabaseClient();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from("user_daily_metrics")
    .select("*")
    .eq("profile_id", profileId)
    .gte("date", cutoff)
    .order("date", { ascending: false });
  
  if (error) {
    logger.error({ error, profileId }, "Failed to fetch metrics history");
    return [];
  }
  
  return data || [];
}

/**
 * Map delta_bucket (from LLM response) to estimated metric components
 * These are conservative estimates used for prediction before actual completion
 */
export interface EstimatedComponents {
  magnitude: number; // 1-10
  reach: number; // people impacted
  depth: number; // 0.1-3.0
  estimatedMinutes: number;
}

export function mapDeltaBucketToComponents(bucket: string): EstimatedComponents {
  switch (bucket.toUpperCase()) {
    case "SMALL":
      return {
        magnitude: 3,
        reach: 1,
        depth: 0.5,
        estimatedMinutes: 15,
      };
    case "MEDIUM":
      return {
        magnitude: 6,
        reach: 3,
        depth: 1.0,
        estimatedMinutes: 45,
      };
    case "LARGE":
      return {
        magnitude: 9,
        reach: 10,
        depth: 1.5,
        estimatedMinutes: 120,
      };
    default:
      // Default to SMALL if unknown
      return {
        magnitude: 3,
        reach: 1,
        depth: 0.5,
        estimatedMinutes: 15,
      };
  }
}
