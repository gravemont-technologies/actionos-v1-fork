import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../src/server/index.js";
import { getSupabaseClient } from "../../src/server/db/supabase.js";
import { computeServerSignature } from "../../src/server/utils/signature.js";

const mockUserId = "user_retention_flow";
const supabase = getSupabaseClient();
const createdProfiles = new Set<string>();

function authenticatedRequest(method: "get" | "post" | "patch" | "delete", path: string) {
  return request(app)[method](path).set("x-clerk-user-id", mockUserId);
}

function isoDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString();
}

function signatureForIndex(index: number) {
  const suffix = index.toString(16).padStart(4, "0");
  return "a".repeat(28) + suffix;
}

async function onboardProfile() {
  const questionsResponse = await authenticatedRequest("get", "/api/onboarding/questions").expect(200);
  const questions = questionsResponse.body.questions || [];
  const responses: Record<string, string> = {};
  questions.forEach((question: any) => {
    if (question.options && question.options.length) {
      responses[question.id] = question.options[0].id;
    }
  });
  const profileResponse = await authenticatedRequest("post", "/api/onboarding/profile")
    .send({ responses })
    .expect(200);
  const profileId = profileResponse.body.profile?.profile_id;
  if (!profileId) throw new Error("Failed to create profile");
  createdProfiles.add(profileId);
  return profileId;
}

async function runAnalysis(profileId: string) {
  const payload = {
    profile_id: profileId,
    situation: "Need to accelerate learning loops",
    goal: "Ship a small experiment next week",
    constraints: "limited time, remote team",
    current_steps: "planning, quick sync",
    deadline: "",
    stakeholders: "team",
    resources: "existing toolkit",
  };
  const signature = computeServerSignature({
    profileId: payload.profile_id,
    situation: payload.situation,
    goal: payload.goal,
    constraints: payload.constraints,
    currentSteps: payload.current_steps,
    deadline: payload.deadline,
    stakeholders: payload.stakeholders,
    resources: payload.resources,
  });
  const response = await authenticatedRequest("post", "/api/analyze")
    .set("x-signature", signature)
    .send(payload)
    .expect(200);
  return response.body.normalized.signature as string;
}

async function cleanupProfile(profileId: string) {
  const tables = ["feedback_records", "active_steps", "signature_cache", "profiles"];
  for (const table of tables) {
    await supabase.from(table).delete().eq("profile_id", profileId);
  }
}

describe("Integration: retention + insights workflows", () => {
  beforeEach(async () => {
    // Ensure no leftover data from previous runs for this user
    const supabaseProfiles = await supabase
      .from("profiles")
      .select("profile_id")
      .eq("user_id", mockUserId);
    if (supabaseProfiles.data) {
      await Promise.all(supabaseProfiles.data.map((row) => cleanupProfile(row.profile_id)));
    }
  });

  afterEach(async () => {
    for (const profileId of createdProfiles) {
      await cleanupProfile(profileId);
    }
    createdProfiles.clear();
  });

  it("Flow A – Analyze → Save → Insights lifecycle", async () => {
    const profileId = await onboardProfile();
    const signature = await runAnalysis(profileId);

    const saveResponse = await authenticatedRequest("post", "/api/insights/save")
      .send({ profile_id: profileId, signature, title: "Flow A Insight", tags: ["test"] })
      .expect(200);
    expect(saveResponse.body.status).toBe("success");

    const secondSave = await authenticatedRequest("post", "/api/insights/save")
      .send({ profile_id: profileId, signature })
      .expect(200);
    expect(secondSave.body.message).toContain("Already saved");

    const listResponse = await authenticatedRequest("get", "/api/insights?limit=10&offset=0&search=Flow%20A")
      .expect(200);
    expect(Array.isArray(listResponse.body.insights)).toBe(true);
    expect(listResponse.body.insights.some((insight: any) => insight.signature === signature)).toBe(true);

    await authenticatedRequest("patch", `/api/insights/${signature}`)
      .send({ title: "Flow A Updated", tags: ["test", "updated"] })
      .expect(200);

    const detailResponse = await authenticatedRequest("get", `/api/insights/${signature}`)
      .expect(200);
    expect(detailResponse.body.insight.title).toBe("Flow A Updated");
    expect(detailResponse.body.insight.tags).toContain("updated");

    await authenticatedRequest("delete", `/api/insights/${signature}`).expect(200);
    await authenticatedRequest("get", `/api/insights/${signature}`).expect(404);
  });

  it("Flow B – Analyze → Feedback → Stats & Wins + Sparkline", async () => {
    const profileId = await onboardProfile();
    const signature = await runAnalysis(profileId);

    const feedbackResponse = await authenticatedRequest("post", "/api/step-feedback")
      .send({ profile_id: profileId, signature, slider: 8, outcome: "Delivered result" })
      .expect(200);
    expect(feedbackResponse.body.status).toBe("recorded");

    await supabase
      .from("feedback_records")
      .update({ recorded_at: isoDaysAgo(0) })
      .eq("profile_id", profileId)
      .eq("signature", signature);

    const apiDelta = 2.3;
    await supabase
      .from("feedback_records")
      .update({ delta_ipp: apiDelta, slider: 8 })
      .eq("profile_id", profileId)
      .eq("signature", signature);

    const manualEntries: Array<{ signature: string; slider: number; delta: number; recorded_at: string }> = [];
    manualEntries.push({
      signature: signatureForIndex(1),
      slider: 8,
      delta: 1.1,
      recorded_at: isoDaysAgo(1), // For streak (yesterday)
    });

    for (let i = 0; i < 15; i += 1) {
      manualEntries.push({
        signature: signatureForIndex(100 + i),
        slider: 4 + (i % 6),
        delta: 0.5 + i * 0.1,
        recorded_at: isoDaysAgo(3 + i),
      });
    }

    const manualInsert = await supabase.from("feedback_records").insert(
      manualEntries.map((entry) => ({
        profile_id: profileId,
        signature: entry.signature,
        slider: entry.slider,
        delta_ipp: entry.delta,
        delta_but: entry.delta * 0.8,
        outcome: entry.slider >= 7 ? "Streak win" : "Practice",
        recorded_at: entry.recorded_at,
      }))
    );
    if (manualInsert.error) {
      throw new Error(`Manual feedback seed failed: ${manualInsert.error.message}`);
    }

    const deltaBucketSignatures = [signature, manualEntries[0].signature];
    await supabase.from("signature_cache").insert(
      deltaBucketSignatures.map((sig, idx) => ({
        signature: sig,
        profile_id: profileId,
        response: {
          immediate_steps: [
            { delta_bucket: idx === 0 ? "LARGE" : "MEDIUM" },
          ],
        },
        normalized_input: { situation: "sparkline", goal: "validate", constraints: [], current_steps: "" },
        baseline_ipp: 65,
        baseline_but: 70,
        expires_at: isoDaysAgo(-1),
      }))
    );

    const completedCount = 1 + [manualEntries[0], ...manualEntries.slice(1)].filter((r) => r.slider >= 7).length;
    const manualDeltaSum = manualEntries.reduce((sum, r) => sum + r.delta, 0) + apiDelta;

    const statsResponse = await authenticatedRequest("get", `/api/step-feedback/stats?profile_id=${profileId}`).expect(200);
    expect(statsResponse.body.streak).toBeGreaterThanOrEqual(1);
    expect(statsResponse.body.completed).toBe(completedCount);
    expect(statsResponse.body.totalDeltaIpp).toBe(manualDeltaSum.toFixed(1));

    const winsResponse = await authenticatedRequest("get", `/api/step-feedback/recent-wins?profile_id=${profileId}`).expect(200);
    expect(Array.isArray(winsResponse.body.wins)).toBe(true);
    expect(winsResponse.body.wins.every((win: any) => win.slider >= 7)).toBe(true);
    if (winsResponse.body.wins.length >= 2) {
      expect(new Date(winsResponse.body.wins[0].recordedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(winsResponse.body.wins[1].recordedAt).getTime()
      );
    }

    const sparklineResponse = await authenticatedRequest("get", `/api/step-feedback/sparkline-data?profile_id=${profileId}`).expect(200);
    expect(Array.isArray(sparklineResponse.body.data)).toBe(true);
    expect(sparklineResponse.body.data.length).toBe(manualEntries.length + 1);
    expect(sparklineResponse.body.data.some((point: any) => point.predicted === 0)).toBe(true);
    sparklineResponse.body.data.forEach((point: any) => {
      expect(typeof point.predicted).toBe("number");
      expect(typeof point.realized).toBe("number");
    });
  });

  it("Flow C – Retrospective insights after multi-session feedback", async () => {
    const profileId = await onboardProfile();
    const signature = await runAnalysis(profileId);

    await supabase.from("feedback_records").insert([
      { profile_id: profileId, signature: signatureForIndex(250), slider: 7, delta_ipp: 0.8, recorded_at: isoDaysAgo(7) },
      { profile_id: profileId, signature: signatureForIndex(251), slider: 6, delta_ipp: 0.2, recorded_at: isoDaysAgo(10) },
    ]);

    await supabase.from("signature_cache").insert({
      signature,
      profile_id: profileId,
      response: {
        immediate_steps: [{ delta_bucket: "MEDIUM", step: "Deep dive" }],
      },
      normalized_input: { situation: "Retrospective situation", goal: "Improve", constraints: [], current_steps: "" },
      baseline_ipp: 68,
      baseline_but: 74,
      expires_at: isoDaysAgo(-1),
    });

    const retrospectiveResponse = await authenticatedRequest("post", "/api/step-feedback/retrospective")
      .send({
        profile_id: profileId,
        signature,
        step_description: "Completed follow-up",
        outcome: "Refined execution",
        slider: 9,
        original_situation: "Retrospective situation",
      })
      .expect(200);

    expect(retrospectiveResponse.body.status).toBe("success");
    expect(retrospectiveResponse.body.promptVersion).toBeDefined();
    const insights = retrospectiveResponse.body.insights;
    expect(insights).toHaveProperty("insights");
    expect(insights).toHaveProperty("what_worked");
    expect(insights).toHaveProperty("what_didnt");
    expect(Array.isArray(insights.improvements)).toBe(true);
    expect(insights.improvements.length).toBeGreaterThan(0);
  });
});
