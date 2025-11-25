# Serverless Functions Migration Plan (Vercel)

This document lists all required serverless functions for the MVP core workflow, their endpoints, and implementation notes for Vercel.

---

## 1. `/api/analyze.ts`
- **Purpose:** Analyze user input and return actionable insights.
- **Method:** POST
- **Input:**
  - `profile_id`, `situation`, `goal`, `constraints`, `current_steps`, `deadline?`, `stakeholders?`, `resources?`
- **Output:**
  - Action recommendations, metrics, prompt version, etc.
- **Notes:**
  - Stateless, uses shared DB/LLM utils, timeout-guarded.

---

## 2. `/api/feedback.ts`
- **Purpose:** Accept user feedback on actions and update metrics.
- **Method:** POST
- **Input:**
  - `profile_id`, `original_situation`, `feedback`, etc.
- **Output:**
  - Feedback status, updated metrics.
- **Notes:**
  - Stateless, uses shared DB utils, timeout-guarded.

---

## 3. `/api/stats.ts`
- **Purpose:** Fetch user stats/insights for dashboard.
- **Method:** GET/POST
- **Input:**
  - `profile_id`
- **Output:**
  - Metrics, progress, impact data.
- **Notes:**
  - Stateless, uses shared DB utils.

---

## 4. `/api/health.ts`
- **Purpose:** Health check for deployment/monitoring.
- **Method:** GET
- **Output:** `{ status: "ok" }` if healthy.
- **Notes:**
  - Checks DB, LLM, and env vars.

---

## Implementation Notes
- Each function is a separate file in `/api/`.
- Use only stateless logic; move shared code to `/lib/`.
- Validate all required env vars at the top of each function.
- Use a timeout utility for all external calls.
- All secrets are used only in `/api/` functions (never in frontend code).
- Test each endpoint with Vercel dev and after deployment.

---

## Next Phases
1. Migrate `/api/feedback.ts` and `/api/stats.ts` with core logic.
2. Modularize shared DB/LLM/util code in `/lib/`.
3. Update frontend API calls to use `/api/*` endpoints.
4. Finalize `.env.example` and secure env usage.
5. Add `/api/health.ts` endpoint.
6. Test all flows locally and on Vercel.
7. Deploy and verify live.
