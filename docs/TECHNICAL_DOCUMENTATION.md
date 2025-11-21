# Action OS - Technical Documentation

**Version:** 1.0 MVP  
**Architecture:** Full-Stack TypeScript Application  
**Last Updated:** 2025-11-20

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Documentation](#api-documentation)
5. [Frontend Architecture](#frontend-architecture)
6. [LLM Integration](#llm-integration)
7. [Authentication & Authorization](#authentication--authorization)
8. [Caching Strategy](#caching-strategy)
9. [Performance Optimization](#performance-optimization)
10. [Deployment](#deployment)
11. [Environment Configuration](#environment-configuration)
12. [Security](#security)
13. [Monitoring & Logging](#monitoring--logging)
14. [Development Workflow](#development-workflow)

---

## System Architecture

### High-Level Overview

```
┌─────────────┐
│   Browser   │
│  (React UI) │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────┐
│  Vite Dev Server│ (Development)
│  Vercel CDN     │ (Production)
└──────┬──────────┘
       │
       ▼
┌──────────────────────┐
│  Express Backend API │
│  (Node.js + TypeScript)
└──────┬───────────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌────────────┐
│  Supabase   │   │  OpenAI    │
│  (PostgreSQL)   │  (LLM API) │
└─────────────┘   └────────────┘
       │
       ▼
┌─────────────┐
│    Clerk    │
│   (Auth)    │
└─────────────┘
```

### Component Diagram

```
Frontend (React)
├── Pages
│   ├── Landing (/)
│   ├── Sign In (/sign-in)
│   ├── Sign Up (/sign-up)
│   ├── Onboarding (/onboarding)
│   └── App (/app/*)
│       ├── Analyze (/app/analyze)
│       ├── Dashboard (/app/dashboard)
│       └── Insights (/app/insights)
│
Backend (Express)
├── Routes
│   ├── /api/onboarding/*
│   ├── /api/analyze/*
│   ├── /api/step-feedback/*
│   ├── /api/insights/*
│   └── /api/health/*
├── Middleware
│   ├── clerkAuth
│   ├── rateLimiter
│   ├── validateInput
│   ├── validateOwnership
│   ├── timeout
│   └── errorHandler
└── Services
    ├── LLM Provider
    ├── Signature Cache
    ├── Profile Store
    └── Analytics Events
```

---

## Technology Stack

### Frontend
- **Framework:** React 19.2.0
- **Build Tool:** Vite 7.2.2
- **Language:** TypeScript 5.9.3
- **Styling:** Tailwind CSS 3.4.17
- **UI Components:** Radix UI + shadcn/ui
- **Icons:** Lucide React
- **State Management:** React Context + hooks
- **Routing:** React Router 6.30.1
- **Forms:** React Hook Form 7.61.1
- **Validation:** Zod 4.1.12
- **Auth:** @clerk/clerk-react 5.55.0

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express 5.1.0
- **Language:** TypeScript 5.9.3
- **Database Client:** @supabase/supabase-js 2.81.1
- **Auth:** @clerk/backend 1.20.0
- **Rate Limiting:** express-rate-limit 7.4.1
- **Logging:** pino 9.5.0 + pino-pretty 13.0.0
- **Validation:** Zod 4.1.12

### Database
- **Provider:** Supabase (hosted PostgreSQL)
- **Version:** PostgreSQL 15+
- **Extensions:** uuid-ossp, pg_trgm

### LLM
- **Provider:** OpenAI
- **Default Model:** gpt-4o-mini
- **Fallback:** Mock provider (test/dev mode)

### Testing
- **Framework:** Vitest 2.1.3
- **Component Testing:** Testing Library + jsdom
- **API Testing:** Supertest 7.1.4
- **Load Testing:** k6

### DevOps
- **Version Control:** Git + GitHub
- **CI/CD:** GitHub Actions (recommended)
- **Hosting:** Vercel (frontend) + Railway (backend)
- **Monitoring:** Pino logs + optional Sentry

---

## Database Schema

### Tables Overview

```sql
-- 6 tables total
profiles              -- User profiles with baseline scores
signature_cache       -- LLM response cache + saved insights
active_steps          -- Current action being worked on
feedback_records      -- Step completion feedback
analytics_events      -- Event tracking for BI
token_usage          -- LLM API usage tracking
```

### profiles

**Purpose:** Store user profiles with baseline IPP/BUT scores

```sql
CREATE TABLE profiles (
  profile_id TEXT PRIMARY KEY 
    CHECK (LENGTH(profile_id) >= 8 AND profile_id ~ '^[a-f0-9]+$'),
  user_id TEXT,  -- Clerk user ID (external auth)
  tags TEXT[] NOT NULL DEFAULT '{}',
  baseline_ipp NUMERIC(5,2) NOT NULL DEFAULT 50.0 
    CHECK (baseline_ipp >= 20 AND baseline_ipp <= 95),
  baseline_but NUMERIC(5,2) NOT NULL DEFAULT 50.0 
    CHECK (baseline_but >= 20 AND baseline_but <= 95),
  strengths TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  consent_to_store BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_profiles_user_id_unique 
  ON profiles(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_profiles_updated_at ON profiles(updated_at DESC);
CREATE INDEX idx_profiles_tags_gin ON profiles USING GIN(tags);
```

### signature_cache

**Purpose:** Cache LLM responses (24h TTL) and store saved insights

```sql
CREATE TABLE signature_cache (
  signature TEXT PRIMARY KEY 
    CHECK (LENGTH(signature) >= 32 AND signature ~ '^[a-f0-9]+$'),
  profile_id TEXT NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  response JSONB NOT NULL,
  normalized_input JSONB NOT NULL,
  baseline_ipp NUMERIC(5,2) NOT NULL,
  baseline_but NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ CHECK (expires_at IS NULL OR expires_at > created_at),
  -- Insights columns
  user_id TEXT,
  is_saved BOOLEAN DEFAULT FALSE,
  title TEXT,
  tags TEXT[] DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_signature_cache_profile ON signature_cache(profile_id);
CREATE INDEX idx_signature_cache_expires ON signature_cache(expires_at);
CREATE INDEX idx_signature_cache_user_saved 
  ON signature_cache(user_id, is_saved) WHERE is_saved = TRUE;
CREATE INDEX idx_signature_cache_tags_gin 
  ON signature_cache USING GIN(tags);
```

### active_steps

**Purpose:** Track current action being worked on

```sql
CREATE TABLE active_steps (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(profile_id) ON DELETE CASCADE,
  signature TEXT NOT NULL,
  step_description TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_active_steps_signature ON active_steps(signature);
```

### feedback_records

**Purpose:** Store step completion feedback

```sql
CREATE TABLE feedback_records (
  feedback_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id TEXT NOT NULL REFERENCES profiles(profile_id) ON DELETE CASCADE,
  signature TEXT NOT NULL,
  slider NUMERIC(3,1) NOT NULL CHECK (slider >= 0 AND slider <= 10),
  outcome TEXT,
  delta_ipp NUMERIC(5,2) NOT NULL,
  delta_but NUMERIC(5,2) NOT NULL,
  baseline_ipp NUMERIC(5,2) NOT NULL,
  baseline_but NUMERIC(5,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feedback_profile_recorded 
  ON feedback_records(profile_id, recorded_at DESC);
CREATE INDEX idx_feedback_signature ON feedback_records(signature);
```

### analytics_events

**Purpose:** Track events for business intelligence

```sql
CREATE TABLE analytics_events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  profile_id TEXT,
  signature TEXT,
  metadata JSONB DEFAULT '{}',
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_profile ON analytics_events(profile_id);
CREATE INDEX idx_analytics_tracked ON analytics_events(tracked_at DESC);
```

### token_usage

**Purpose:** Track LLM API usage and costs

```sql
CREATE TABLE token_usage (
  usage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT,
  profile_id TEXT,
  model TEXT NOT NULL,
  prompt_tokens INT NOT NULL,
  completion_tokens INT NOT NULL,
  total_tokens INT NOT NULL,
  cost_usd NUMERIC(10,6),
  tracked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_token_usage_user_date 
  ON token_usage(user_id, tracked_at DESC);
```

---

## API Documentation

### Base URL
- **Development:** `http://localhost:3001`
- **Production:** `https://your-domain.com`

### Authentication
All protected endpoints require either:
- **Production:** `Authorization: Bearer <clerk_jwt_token>`
- **Development:** `x-clerk-user-id: <user_id>` header

### Onboarding Endpoints

#### GET /api/onboarding/questions
**Purpose:** Get onboarding quiz questions

**Response:**
```json
{
  "questions": [
    {
      "id": "pivot",
      "prompt": "When facing a critical decision, you tend to:",
      "options": [
        {
          "id": "systematic",
          "label": "Research extensively, model outcomes, then commit",
          "insight": "Systematic thinker - high IPP ceiling, slower pivots"
        }
      ]
    }
  ]
}
```

#### GET /api/onboarding/insights
**Purpose:** Get insight for selected quiz option

**Query Params:**
- `questionId`: Question ID
- `optionId`: Option ID

**Response:**
```json
{
  "questionId": "pivot",
  "optionId": "systematic",
  "insight": "Systematic thinker - high IPP ceiling, slower pivots"
}
```

#### POST /api/onboarding/profile
**Purpose:** Create profile from quiz responses

**Request:**
```json
{
  "responses": {
    "pivot": "systematic",
    "risk": "medium",
    "action": "ready",
    "timeline": "balanced"
  },
  "consent_to_store": true,
  "user_id": "user_2abc123..."
}
```

**Response:**
```json
{
  "profile": {
    "profile_id": "a1b2c3d4...",
    "tags": ["SYSTEMATIC", "MEDIUM_RISK", "ACTION_READY"],
    "baseline": {
      "ipp": 52.5,
      "but": 48.0
    },
    "strengths": ["Clear goal-setting", "Risk assessment"]
  }
}
```

### Analysis Endpoints

#### POST /api/analyze
**Purpose:** Analyze situation and return actionable steps

**Headers:**
- `x-signature`: SHA-256 signature of normalized input

**Request:**
```json
{
  "profile_id": "a1b2c3d4...",
  "situation": "I'm 3 days from missing rent...",
  "goal": "Functionalize core activation path...",
  "constraints": "money, independence, time (3 days)",
  "current_steps": "Integrating auth, fixing billing...",
  "deadline": "3 days",
  "stakeholders": "",
  "resources": ""
}
```

**Response:**
```json
{
  "status": "success",
  "normalized": {
    "situation": "normalized text...",
    "goal": "normalized text...",
    "constraints": ["money", "independence", "time"],
    "signature": "abc123..."
  },
  "cached": false,
  "baseline": {
    "ipp": 52.5,
    "but": 48.0
  },
  "output": {
    "summary": "Your core tension is...",
    "immediate_steps": [
      {
        "step": "Fix critical auth bug blocking 80% of signups",
        "delta_bucket": "LARGE",
        "delta_ipp": 7.5,
        "predicted_time_hrs": 2.5
      }
    ],
    "strategic_lens": "You're in crisis mode...",
    "top_risks": [
      {
        "risk": "Users churn before onboarding",
        "mitigation": "Add demo video to landing page"
      }
    ],
    "recommended_kpi": "Successful signups in next 24h",
    "meta": {
      "cached": false,
      "timestamp": 1732111200
    }
  },
  "promptVersion": "v2.5.1"
}
```

#### POST /api/analyze/follow-up
**Purpose:** Deep dive into specific section of analysis

**Request:**
```json
{
  "profile_id": "a1b2c3d4...",
  "original_analysis": "Your core tension is...",
  "original_immediate_steps": "Step 1: ...",
  "focus_area": "Strategic lens - expand on crisis mode implications",
  "original_situation": "I'm 3 days from missing rent...",
  "original_goal": "Functionalize core activation path...",
  "constraints": "money, independence, time (3 days)"
}
```

**Response:** Same schema as `/api/analyze`

#### POST /api/analyze/micro-nudge
**Purpose:** Generate quick action nudge

**Request:**
```json
{
  "profile_id": "a1b2c3d4...",
  "situation": "I'm 3 days from missing rent...",
  "goal": "Functionalize core activation path...",
  "constraints": "money, independence, time (3 days)",
  "current_steps": "Integrating auth...",
  "deadline": "3 days",
  "previous_nudge": "Replace 'maybe' with 'decide by EOD'"
}
```

**Response:**
```json
{
  "status": "success",
  "nudge": "Ship broken, fix in prod. 3 days = no runway for perfection.",
  "promptVersion": "v2.5.1",
  "fallback": false
}
```

### Feedback Endpoints

#### POST /api/step-feedback
**Purpose:** Submit step completion feedback

**Request:**
```json
{
  "profile_id": "a1b2c3d4...",
  "signature": "abc123...",
  "slider": 8.5,
  "outcome": "Fixed auth, 50 users onboarded"
}
```

**Response:**
```json
{
  "status": "recorded",
  "baseline": {
    "ipp": 54.8,
    "but": 47.2
  },
  "previous_baseline": {
    "ipp": 52.5,
    "but": 48.0
  },
  "delta": {
    "ipp": 2.3,
    "but": -0.8
  }
}
```

#### GET /api/step-feedback/stats
**Purpose:** Get dashboard statistics

**Query Params:**
- `profile_id`: Profile ID

**Response:**
```json
{
  "completed": 12,
  "totalDeltaIpp": "28.5",
  "streak": 5
}
```

#### GET /api/step-feedback/active-step
**Purpose:** Get current active step

**Query Params:**
- `profile_id`: Profile ID

**Response:**
```json
{
  "activeStep": {
    "signature": "abc123...",
    "description": "Fix critical auth bug..."
  },
  "is_abandoned": false,
  "hours_elapsed": 2
}
```

#### GET /api/step-feedback/recent-wins
**Purpose:** Get recent successful completions (slider ≥ 7)

**Query Params:**
- `profile_id`: Profile ID

**Response:**
```json
{
  "wins": [
    {
      "signature": "abc123...",
      "title": "Auth Fix Analysis",
      "slider": 8.5,
      "deltaIpp": 7.5,
      "outcome": "Fixed auth, 50 users onboarded",
      "recordedAt": "2025-11-20T10:30:00Z"
    }
  ]
}
```

### Insights Endpoints

#### POST /api/insights/save
**Purpose:** Save analysis as insight

**Request:**
```json
{
  "signature": "abc123...",
  "title": "Auth Fix Analysis",
  "tags": ["crisis", "technical", "auth"]
}
```

**Response:**
```json
{
  "status": "success"
}
```

#### GET /api/insights
**Purpose:** List user's saved insights

**Query Params:**
- `limit`: Max results (default: 20, max: 100)
- `offset`: Pagination offset (default: 0)
- `search`: Search query (optional)

**Response:**
```json
{
  "status": "success",
  "insights": [
    {
      "signature": "abc123...",
      "title": "Auth Fix Analysis",
      "tags": ["crisis", "technical"],
      "situation": "I'm 3 days from missing rent...",
      "goal": "Functionalize core activation path...",
      "summary": "Your core tension is...",
      "createdAt": 1732111200
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Health Endpoints

#### GET /api/health
**Purpose:** Basic health check

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1732111200
}
```

#### GET /api/health/ready
**Purpose:** Readiness check (database, auth, etc.)

**Response:**
```json
{
  "status": "ready",
  "database": "connected",
  "auth": "configured",
  "llm": "configured"
}
```

---

## Frontend Architecture

### Component Hierarchy

```
App
├── ClerkProvider (auth wrapper)
├── ThemeProvider (light/dark mode)
├── ProfileProvider (profile_id context)
├── QueryClientProvider (React Query)
└── BrowserRouter
    └── Routes
        ├── Landing (/)
        ├── SignIn (/sign-in)
        ├── SignUp (/sign-up)
        ├── OnboardingQuiz (/onboarding)
        └── AppLayout (/app/*)
            ├── ProtectedRoute (auth guard)
            ├── StreakBar (progress indicator)
            ├── Nav (Analyze | Dashboard | Insights)
            └── Outlet
                ├── AnalyzeView (/app/analyze)
                │   └── AnalyzeForm
                │       └── ResponseDisplay
                ├── DashboardView (/app/dashboard)
                │   └── Dashboard
                │       ├── GiantMetric
                │       ├── MarkDoneOverlay
                │       ├── RetrospectiveModal
                │       ├── Sparkline
                │       └── Recent Wins
                └── InsightsView (/app/insights)
                    └── Insight Cards
```

### State Management

**Global State (React Context):**
- `ProfileContext`: Current profile_id
- `ClerkProvider`: Auth state (user, session)

**Local State (useState):**
- Form inputs
- Loading states
- Error states
- Modal open/closed

**Server State (React Query):**
- Not used (direct fetch via api.ts utility)

### Custom Hooks

```typescript
// Auth hooks
useUserId()         // Get Clerk user ID
useAuthHeaders()    // Get auth headers for API calls

// Profile hooks
useProfileId()      // Get current profile_id
useProfileContext() // Get profile context methods

// Dashboard hooks
useStep1Timer()     // Track active step elapsed time
useStats()          // Fetch dashboard statistics
useInsightDeltas()  // Batch fetch insight feedback

// Utility hooks
useEscapeKey()      // Global keyboard shortcut
```

### Routing Strategy

**Public Routes:**
- `/` - Landing page
- `/sign-in` - Clerk sign-in
- `/sign-up` - Clerk sign-up

**Protected Routes (require auth):**
- `/onboarding` - Quiz (one-time)
- `/app/*` - Main app (requires onboarding completion)

**App Routes:**
- `/app/analyze` - Analysis form (default)
- `/app/dashboard` - Progress dashboard
- `/app/insights` - Saved insights

**Navigation:**
- Tab switching via React Router
- Escape key → `/app/analyze`
- Browser back/forward works

---

## LLM Integration

### Provider Architecture

```typescript
interface LLMProvider {
  complete(request: CompletionRequest): Promise<string>;
}

// Production: OpenAI GPT-4o-mini
class OpenAIProvider implements LLMProvider { ... }

// Test/Dev: Mock provider
class MockProvider implements LLMProvider { ... }
```

### Prompt Structure

**System Prompt:**
- Role definition ("You are a strategic advisor...")
- Output constraints (max 200 tokens, JSON only)
- Quality guidelines (specific, actionable, measurable)

**User Prompt:**
- Profile summary (IPP, BUT, tags, strengths)
- User input (situation, goal, constraints, etc.)
- Feedback context (if available)
- Structured format specification

**Example Prompt:**
```
System: You are a strategic advisor. Return ONLY valid JSON...

User:
PROFILE user123: SYSTEMATIC | MEDIUM_RISK | BASELINE: IPP=52.5, BUT=48.0

SITUATION: I'm 3 days from missing rent and need...
GOAL: Functionalize core activation path...
CONSTRAINTS: money, independence, time
CURRENT: Integrating auth, fixing billing...

FEEDBACK CONTEXT: User overestimates time by 30% (5 feedbacks)

Return JSON with: summary, immediate_steps, strategic_lens, top_risks, recommended_kpi
```

### Response Parsing

```typescript
// 1. LLM returns raw string
const raw = await llmProvider.complete({ system, user });

// 2. Parse JSON
const parsedJson = JSON.parse(raw);

// 3. Validate with Zod schema
const parsedResponse = responseSchema.parse(parsedJson);

// 4. Apply guardrails (fallbacks for incomplete data)
const finalPayload = enforceResponseGuards(parsedResponse, signature);
```

### Token Tracking

```typescript
// Track usage per user
await trackTokenUsage({
  user_id,
  profile_id,
  model: "gpt-4o-mini",
  prompt_tokens: 150,
  completion_tokens: 180,
  total_tokens: 330,
  cost_usd: 0.000165  // $0.50/1M tokens
});
```

---

## Authentication & Authorization

### Clerk Integration

**Frontend:**
```typescript
<ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
  <App />
</ClerkProvider>

// Get user
const { user } = useUser();

// Get auth token
const { getToken } = useAuth();
const token = await getToken();
```

**Backend:**
```typescript
// Verify JWT token
import { verifyToken } from "@clerk/backend";

const { userId } = await verifyToken(token, {
  secretKey: CLERK_SECRET_KEY
});

// Development: Header-based auth
const userId = req.headers["x-clerk-user-id"];
```

### Authorization Flow

1. **Authentication:** Clerk verifies user identity
2. **Profile Resolution:** Map user_id → profile_id
3. **Ownership Validation:** Verify user owns profile/resource
4. **Access Control:** Allow/deny based on ownership

**Example:**
```typescript
// User tries to access profile
GET /api/step-feedback/stats?profile_id=abc123

// Middleware validates:
1. User is authenticated (userId exists)
2. Profile belongs to user (profile.user_id === userId)
3. If not: 403 Forbidden
```

---

## Caching Strategy

### Signature-Based Caching

**How It Works:**
1. Client computes SHA-256 signature of normalized input
2. Server checks cache for signature
3. Cache hit: Return cached response
4. Cache miss: Call LLM, cache response, return

**Cache Key:**
```typescript
// Input normalization
const normalized = {
  situation: normalizeValue(situation),
  goal: normalizeValue(goal),
  constraints: normalizeConstraints(constraints),
  current_steps: normalizeValue(currentSteps)
};

// Signature computation
const signatureString = buildSignatureString(normalized);
const signature = sha256(signatureString);
```

**Cache TTL:**
- **Default:** 24 hours
- **Saved insights:** Permanent (no expiration)
- **Invalidation:** On baseline shift (>5Δ IPP/BUT)

**Cache Storage:**
- **Table:** `signature_cache`
- **Index:** On signature (primary key)
- **Cleanup:** Automatic on read (expired entries deleted)

### Baseline Shift Invalidation

```typescript
// After feedback submission
if (delta_ipp > 5 || delta_but > 5) {
  // Invalidate related cache entries
  await cache.invalidateOnBaselineShift(profile_id, delta);
}
```

---

## Performance Optimization

### Frontend Optimizations

1. **Code Splitting:**
   - Lazy load routes with `React.lazy()`
   - Separate chunks for landing, app, admin

2. **Memoization:**
   - `useMemo` for expensive computations (signature)
   - `useCallback` for stable function references

3. **Request Optimization:**
   - AbortController for cancellable requests
   - Debouncing for search inputs (300ms)
   - Batch fetching for insight deltas

4. **Rendering:**
   - Virtual scrolling for long lists (future)
   - Optimistic UI updates (mark done)

### Backend Optimizations

1. **Database Indexing:**
   - Composite indexes for common queries
   - GIN indexes for array/JSONB columns
   - Partial indexes for filtered queries

2. **Query Optimization:**
   - Batch fetches (getBatchInsights)
   - Limit results (pagination)
   - Select only needed columns

3. **Caching:**
   - LLM response caching (24h)
   - Profile caching (in-memory)

4. **Rate Limiting:**
   - Per-endpoint limits
   - User-based limits (future)

---

## Deployment

### Environment Setup

**Development:**
```bash
# Clone repo
git clone https://github.com/your-org/actionos-v1-fork.git
cd actionos-v1-fork

# Install dependencies
npm install

# Setup env vars
cp .env.example .env
# Edit .env with your credentials

# Run Supabase schema
# (In Supabase dashboard SQL editor)

# Start dev servers
npm run dev
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
```

**Production (Vercel + Railway):**

**Frontend (Vercel):**
1. Connect GitHub repo
2. Set build command: `npm run build:client`
3. Set output directory: `dist`
4. Set environment variables:
   - `VITE_CLERK_PUBLISHABLE_KEY`
   - `VITE_API_URL` (Railway backend URL)

**Backend (Railway):**
1. Create new project
2. Connect GitHub repo
3. Set start command: `npm run start:prod`
4. Set environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `CLERK_SECRET_KEY`
   - `OPENAI_API_KEY`
   - `FRONTEND_URL` (Vercel URL)

**Database (Supabase):**
1. Create production project
2. Run `supabase/schema.sql` in SQL editor
3. Copy URL and service role key to Railway

---

## Environment Configuration

See `.env.example` for complete reference.

**Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Recommended:**
- `OPENAI_API_KEY` (or uses mock)
- `CLERK_SECRET_KEY` (required in prod)

**Optional:**
- `NODE_ENV` (development/production/test)
- `PORT` (default: 3001)
- `FRONTEND_URL` (default: http://localhost:3000)
- `OPENAI_MODEL` (default: gpt-4o-mini)
- `LOG_LEVEL` (default: info)
- `ANALYTICS_WEBHOOK`

---

## Security

### Threat Model

**Threats:**
- Unauthorized access to user data
- SQL injection
- XSS attacks
- CSRF attacks
- Rate limit abuse
- API key exposure

**Mitigations:**
- Authentication (Clerk JWT)
- Authorization (ownership validation)
- Input validation (Zod schemas)
- Parameterized queries (Supabase)
- React escaping (XSS protection)
- Signature verification (CSRF)
- Rate limiting (abuse prevention)
- Environment variables (secret management)

### Security Checklist

- [ ] HTTPS enforced in production
- [ ] CORS configured (restrict origins)
- [ ] Rate limiting active
- [ ] Input validation on all endpoints
- [ ] Authentication required on protected routes
- [ ] Ownership validation on data access
- [ ] No secrets in client code
- [ ] Environment variables not committed

---

## Monitoring & Logging

### Server Logging (Pino)

```typescript
logger.info({ userId, profileId }, "Analysis request");
logger.error({ error }, "LLM request failed");
logger.debug({ signature }, "Cache hit");
```

**Log Levels:**
- `trace`: Very detailed (disabled in prod)
- `debug`: Debugging info
- `info`: General info (default)
- `warn`: Warnings
- `error`: Errors
- `fatal`: Fatal errors

### Analytics Events

```typescript
trackEvent("analyze.response", {
  profileId,
  signature,
  cached: true,
  deltaBuckets: ["LARGE", "MEDIUM"]
});
```

**Event Types:**
- `analyze.response` - Analysis completed
- `step1.marked_done` - Step marked complete
- `step1.feedback` - Feedback submitted
- `retrospective.complete` - Retrospective generated

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Backend
npm run dev:server

# Terminal 2: Frontend
npm run dev:client

# Or both:
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run specific suites
npm run test:unit
npm run test:api
npm run test:integration

# Coverage
npm run test:coverage
```

### Linting & Type Checking

```bash
# Type check
npm run lint

# Build (validates types)
npm run build
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes, commit
git add .
git commit -m "Add feature X"

# Push to GitHub
git push origin feature/my-feature

# Open pull request
# CI runs tests
# Merge to main
```

---

## Appendix: File Structure

```
action-os/
├── src/
│   ├── server/              # Backend code
│   │   ├── index.ts         # Express app entry
│   │   ├── config/          # Environment config
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Express middleware
│   │   ├── llm/             # LLM integration
│   │   ├── cache/           # Caching logic
│   │   ├── store/           # Data access layer
│   │   ├── db/              # Database client
│   │   └── utils/           # Utilities
│   ├── ui/                  # Frontend code
│   │   ├── App.tsx          # React app entry
│   │   ├── pages/           # Route pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── contexts/        # React contexts
│   │   ├── landing/         # Landing page
│   │   └── utils/           # Utilities
│   └── shared/              # Shared types
├── tests/                   # Test suites
├── supabase/                # Database schema
├── scripts/                 # Utility scripts
├── .env.example             # Env template
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── vite.config.ts           # Vite config
└── vitest.config.ts         # Test config
```

---

**Document Version:** 1.0 MVP  
**Last Updated:** 2025-11-20  
**Maintained By:** Engineering Team  
**Next Review:** After first production deployment
