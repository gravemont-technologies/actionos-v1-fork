# Testing Strategy — OptiRise Elevate

## Overview

Comprehensive testing strategy covering all aspects of the application: unit tests, integration tests, API tests, and end-to-end workflow tests.

## Test Structure

```
tests/
├── api/              # API endpoint tests
│   ├── analyze.test.ts
│   ├── feedback.test.ts
│   ├── onboarding.test.ts
│   ├── health.test.ts
│   └── middleware.test.ts
├── integration/      # End-to-end workflow tests
│   └── workflow.test.ts
├── unit/            # Unit tests for utilities
│   ├── postProcess.test.ts
│   ├── cache.test.ts
│   └── tokenTracker.test.ts
├── feedbackAnalyzer.test.ts
├── prompt_builder.test.ts
├── signature.test.ts
├── protectedRoute.test.tsx
├── responseDisplay.cta.test.tsx
└── setup.ts
```

## Test Categories

### 1. Unit Tests
- **Purpose:** Test individual functions and utilities in isolation
- **Files:**
  - `prompt_builder.test.ts` - Prompt construction logic
  - `feedbackAnalyzer.test.ts` - Feedback pattern analysis
  - `signature.test.ts` - Input normalization
  - `postProcess.test.ts` - Response post-processing
  - `cache.test.ts` - Cache operations
  - `tokenTracker.test.ts` - Token usage tracking

### 2. API Integration Tests
- **Purpose:** Test API endpoints with real database interactions
- **Files:**
  - `api/analyze.test.ts` - Analysis endpoint (POST /api/analyze, POST /api/analyze/follow-up)
  - `api/feedback.test.ts` - Feedback endpoints (POST /api/step-feedback, GET /api/step-feedback/*)
  - `api/onboarding.test.ts` - Onboarding endpoints (GET /api/onboarding/*, POST /api/onboarding/profile)
  - `api/health.test.ts` - Health check endpoint
  - `api/middleware.test.ts` - Middleware (CORS, auth, rate limiting, validation)

### 3. End-to-End Workflow Tests
- **Purpose:** Test complete user journeys
- **Files:**
  - `integration/workflow.test.ts` - Full workflow: onboarding → analyze → feedback → retrospective

### 4. Component Tests
- **Purpose:** Test React components
- **Files:**
  - `protectedRoute.test.tsx` - Route protection
  - `responseDisplay.cta.test.tsx` - Response display component

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run UI/component tests
npm run test:ui

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## Test Coverage Goals

- **Unit Tests:** 90%+ coverage for utilities and core logic
- **API Tests:** 100% endpoint coverage
- **Integration Tests:** All critical user workflows
- **Component Tests:** All user-facing components

## Test Data Management

- Tests use isolated test user IDs (`user_test_*`)
- Test data is cleaned up in `afterAll` hooks
- Each test creates its own test profile to avoid conflicts
- Database operations use test-specific IDs

## Mocking Strategy

- **Clerk Authentication:** Mocked via `x-clerk-user-id` header
- **LLM Provider:** Uses mock provider in test environment
- **Database:** Uses real Supabase (test project recommended)
- **Time:** Uses real time (no time mocking for simplicity)

## API Test Patterns

### Authentication
```typescript
function authenticatedRequest(method, path) {
  return request(app)[method](path)
    .set("x-clerk-user-id", mockUserId);
}
```

### Test Profile Setup
```typescript
beforeAll(async () => {
  // Create test profile
  const supabase = getSupabaseClient();
  await supabase.from("profiles").insert({
    profile_id: mockProfileId,
    user_id: mockUserId,
    // ... profile data
  });
});

afterAll(async () => {
  // Cleanup
  await supabase.from("profiles").delete()
    .eq("profile_id", mockProfileId);
});
```

## What's Tested

### API Endpoints
- ✅ POST /api/analyze (validation, caching, feedback context)
- ✅ POST /api/analyze/follow-up (follow-up analysis)
- ✅ POST /api/step-feedback (feedback submission, baseline updates)
- ✅ GET /api/step-feedback/recent (recent feedback list)
- ✅ GET /api/step-feedback/baseline (baseline retrieval)
- ✅ GET /api/step-feedback/active-step (active step retrieval)
- ✅ POST /api/step-feedback/retrospective (retrospective insights)
- ✅ GET /api/onboarding/questions (quiz questions)
- ✅ GET /api/onboarding/insights (question insights)
- ✅ POST /api/onboarding/profile (profile generation)
- ✅ GET /api/health (health check)

### Middleware
- ✅ CORS headers
- ✅ Authentication (Clerk)
- ✅ Rate limiting
- ✅ Request validation (zod schemas)
- ✅ Error handling

### Core Workflows
- ✅ Complete user journey: onboarding → analyze → feedback → retrospective
- ✅ Cache behavior (hits, misses, invalidation)
- ✅ Baseline updates on feedback
- ✅ Active step management

### Utilities
- ✅ Prompt building (all templates)
- ✅ Feedback pattern analysis
- ✅ Input normalization
- ✅ Response post-processing
- ✅ Cache operations
- ✅ Token tracking

## Continuous Integration

Tests should run:
- On every commit (pre-commit hook)
- On every pull request
- Before deployment

## Performance Testing

Separate performance tests exist:
- `npm run test:smoke` - API smoke tests
- `npm run load:server` - k6 load tests
- `npm run perf:client` - Lighthouse CI

## Notes

- Tests require a running Supabase instance (use test project)
- Tests require environment variables (use `.env.test`)
- Some tests may be flaky due to external dependencies (LLM, database)
- Rate limiting tests may not trigger in test environment

