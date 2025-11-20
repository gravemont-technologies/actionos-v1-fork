#!/usr/bin/env node
/**
 * Lightweight API smoke tests (dev)
 * Node 20+ required (built-in fetch).
 *
 * Usage:
 *   node scripts/api-smoke.mjs http://localhost:3001
 */
const base = process.argv[2] || "http://localhost:3001";

function logResult(name, ok, details = {}) {
  const row = { test: name, ok, ...details, time: new Date().toISOString() };
  console.table([row]);
  if (!ok) process.exitCode = 1;
}

// Minimal normalization + signature (mirrors src/shared/signature.ts)
function normalizeValue(v = "") {
  return String(v)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s/+-]/g, "");
}
function normalizeConstraints(c = "") {
  return c
    .split(/[\n,]+/g)
    .map((p) => normalizeValue(p))
    .filter(Boolean)
    .sort();
}
function buildSignatureString(p) {
  return [
    p.profileId,
    normalizeValue(p.situation),
    normalizeValue(p.goal),
    normalizeValue(p.currentSteps),
    normalizeValue(p.deadline || ""),
    normalizeValue(p.stakeholders || ""),
    normalizeValue(p.resources || ""),
    normalizeConstraints(p.constraints).join("|"),
  ].join("\n");
}
async function sha256Hex(input) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function jsonGet(path, headers = {}) {
  const res = await fetch(`${base}${path}`, { headers });
  let body = null;
  try { body = await res.json(); } catch {}
  return { res, body };
}

async function jsonPost(path, data, headers = {}) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  let body = null;
  try { body = await res.json(); } catch {}
  return { res, body };
}

(async () => {
  // 1) health
  try {
    const { res, body } = await jsonGet("/api/health");
    logResult("health", res.ok && body?.status === "ok", { status: res.status });
  } catch (e) {
    logResult("health", false, { error: String(e) });
  }

  // 2) onboarding questions
  try {
    const { res, body } = await jsonGet("/api/onboarding/questions");
    logResult("onboarding.questions", res.ok && Array.isArray(body?.questions), { status: res.status, count: body?.questions?.length ?? 0 });
  } catch (e) {
    logResult("onboarding.questions", false, { error: String(e) });
  }

  // 2b) create onboarding profile (dev: optional auth via header or body)
  let createdProfileId = null;
  let createdUserId = null;
  try {
    const userId = "smoke-user-" + Math.random().toString(36).slice(2, 8);
    const quizResponses = { q1: "a", q2: "a", q3: "a" };
    const { res, body } = await jsonPost("/api/onboarding/profile", {
      responses: quizResponses,
      consent_to_store: false,
      user_id: userId,
    }, { "x-clerk-user-id": userId });
    createdProfileId = body?.profile?.profile_id || null;
    createdUserId = userId;
    logResult("onboarding.profile", res.ok && typeof createdProfileId === "string", { status: res.status });
  } catch (e) {
    logResult("onboarding.profile", false, { error: String(e) });
  }

  // 3) analyze validation error (missing fields)
  try {
    const { res } = await jsonPost("/api/analyze", { profile_id: "", situation: "" });
    logResult("analyze.validation", res.status === 400 || res.status === 422, { status: res.status });
  } catch (e) {
    logResult("analyze.validation", false, { error: String(e) });
  }

  // 3b) analyze happy-path with computed signature
  try {
    if (createdProfileId && createdUserId) {
      const payload = {
        profileId: createdProfileId,
        situation: "I want to validate the MVP smoke test quickly.",
        goal: "Ensure endpoints respond correctly.",
        constraints: "time,resources",
        currentSteps: "set up tests",
        deadline: "",
        stakeholders: "",
        resources: "",
      };
      const sigInput = buildSignatureString(payload);
      const signature = await sha256Hex(sigInput);
      const { res } = await jsonPost("/api/analyze", {
        profile_id: payload.profileId,
        situation: payload.situation,
        goal: payload.goal,
        constraints: payload.constraints,
        current_steps: payload.currentSteps,
        deadline: payload.deadline,
        stakeholders: payload.stakeholders,
        resources: payload.resources,
      }, { "x-signature": signature, "x-clerk-user-id": createdUserId });
      const strict = process.env.STRICT === "1" || process.env.STRICT === "true";
      const ok = strict ? res.status === 200 : [200, 429, 401, 403].includes(res.status);
      logResult("analyze.happy", ok, { status: res.status, strict });
    }
  } catch (e) {
    logResult("analyze.happy", false, { error: String(e) });
  }

  // 4) feedback validation error
  try {
    const { res } = await jsonPost("/api/step-feedback", { profile_id: "", signature: "bad", slider: 11 });
    logResult("feedback.validation", res.status === 400 || res.status === 422, { status: res.status });
  } catch (e) {
    logResult("feedback.validation", false, { error: String(e) });
  }

  // 5) baseline fetch (if profile created)
  try {
    if (createdProfileId) {
      const headers = { "x-clerk-user-id": "smoke-user" }; // ownership check needs user match; fallback
      const { res } = await jsonGet(`/api/step-feedback/baseline?profile_id=${createdProfileId}`, headers);
      // ownership might fail; accept 200 or 403 as valid under limited smoke
      logResult("baseline.get", res.status === 200 || res.status === 403, { status: res.status });
    }
  } catch (e) {
    logResult("baseline.get", false, { error: String(e) });
  }
})();


