# Comprehensive Testing Strategy - Action OS MVP

**Version:** 1.0  
**Last Updated:** 2025-11-20  
**Status:** Production Ready Testing Framework

---

## Executive Summary

This document defines a rigorous testing strategy for Action OS MVP, covering unit tests, integration tests, API tests, and end-to-end workflow validation. The strategy prioritizes the **main workflow** (Input → Analysis → Save → Dashboard) to ensure smooth production deployment.

**Testing Goals:**
- ✅ **95%+ test coverage** on critical workflows
- ✅ **100% API endpoint coverage** with validation
- ✅ **Zero regression** in core functionality
- ✅ **Production-ready** confidence level

---

## Table of Contents

1. [Core Workflow Testing](#core-workflow-testing)
2. [Test Categories](#test-categories)
3. [Testing Infrastructure](#testing-infrastructure)
4. [Manual Testing Checklist](#manual-testing-checklist)
5. [Production Readiness Criteria](#production-readiness-criteria)
6. [Deployment Testing](#deployment-testing)
7. [Performance & Load Testing](#performance--load-testing)
8. [Security Testing](#security-testing)
9. [Continuous Integration](#continuous-integration)
10. [Test Data Management](#test-data-management)

---

## Core Workflow Testing

### Priority 1: Main User Workflow (CRITICAL)

**Workflow:** User Input → LLM Analysis → Save Insight → Dashboard Statistics

#### Test Scenarios

**1. New User Onboarding**
- [ ] User signs up with Clerk
- [ ] User completes onboarding quiz (all 4 questions)
- [ ] Profile is created with baseline IPP/BUT scores
- [ ] User is redirected to /app/analyze
- [ ] Profile persists across sessions

**2. Analysis Submission**
- [ ] User fills required fields (situation, goal, constraints, current_steps)
- [ ] Client-side validation works correctly
- [ ] Signature is computed correctly
- [ ] Analysis request is sent to backend
- [ ] LLM response is received and parsed
- [ ] Response is cached with 24h TTL
- [ ] Active step is set correctly
- [ ] User sees formatted response

**3. Insight Saving**
- [ ] User can save analysis with custom title
- [ ] User can add tags to saved insight
- [ ] Insight appears in /app/insights view
- [ ] Search functionality works
- [ ] Pagination works (20 items per page)
- [ ] User can update title/tags
- [ ] User can delete saved insights

**4. Dashboard Statistics**
- [ ] User navigates to /app/dashboard
- [ ] Active step is displayed correctly
- [ ] Timer shows elapsed time
- [ ] User can mark step as done
- [ ] Slider value (0-10) is captured
- [ ] Outcome text is captured
- [ ] Retrospective insights are generated
- [ ] Baseline IPP/BUT updates
- [ ] Dashboard stats update:
  - Completed count increments
  - Total ΔIPP updates
  - Streak calculates correctly
- [ ] Recent wins display
- [ ] Sparkline chart renders

**5. Feedback Loop**
- [ ] Subsequent analyses use feedback context
- [ ] Baseline shifts invalidate related cache entries
- [ ] Personalization improves over time
- [ ] Patterns are detected and used

---

## Test Categories

### 1. Unit Tests (Target: 90%+ coverage)

**Files to Test:**
- ✅ `src/server/llm/prompt_builder.ts` - All prompt templates
- ✅ `src/server/llm/post_process.ts` - Response guards and fallbacks
- ✅ `src/server/utils/signature.ts` - Input normalization
- ✅ `src/server/utils/feedbackAnalyzer.ts` - Pattern detection
- ✅ `src/server/utils/retry.ts` - Retry logic
- ✅ `src/server/cache/signatureCache.ts` - Cache operations
- ✅ `src/server/llm/tokenTracker.ts` - Token tracking
- ✅ `src/shared/signature.ts` - Client-side signature computation

**Test Commands:**
```bash
npm run test:unit
```

### 2. API Integration Tests (Target: 100% endpoint coverage)

**Endpoints to Test:**

**Onboarding:**
- `GET /api/onboarding/questions` - 200, correct question format
- `GET /api/onboarding/insights` - 200, correct insight for option
- `POST /api/onboarding/profile` - 201, profile created, baseline set
- `GET /api/onboarding/profile?user_id=X` - 200, existing profile or null

**Analysis:**
- `POST /api/analyze` - 200, LLM response, caching, validation
- `POST /api/analyze/follow-up` - 200, follow-up analysis
- `POST /api/analyze/micro-nudge` - 200, micro nudge generation
- `GET /api/analyze/demo/data` - 200, demo data

**Feedback:**
- `POST /api/step-feedback` - 200, feedback recorded, baseline updated
- `GET /api/step-feedback/recent?profile_id=X` - 200, recent feedback
- `GET /api/step-feedback/baseline?profile_id=X` - 200, current baseline
- `GET /api/step-feedback/timer?profile_id=X&signature=Y` - 200, elapsed time
- `GET /api/step-feedback/active-step?profile_id=X` - 200, active step or null
- `GET /api/step-feedback/stats?profile_id=X` - 200, dashboard stats
- `GET /api/step-feedback/insight-deltas?profile_id=X&signatures=Y` - 200, deltas
- `POST /api/step-feedback/insight-deltas` - 200, batch deltas
- `GET /api/step-feedback/recent-wins?profile_id=X` - 200, recent wins
- `GET /api/step-feedback/outcome-autocomplete?profile_id=X` - 200, outcomes
- `GET /api/step-feedback/sparkline-data?profile_id=X` - 200, sparkline data
- `POST /api/step-feedback/retrospective` - 200, retrospective insights

**Insights:**
- `POST /api/insights/save` - 200, insight saved
- `GET /api/insights` - 200, user insights, pagination, search
- `GET /api/insights/:signature` - 200, single insight
- `PATCH /api/insights/:signature` - 200, insight updated
- `DELETE /api/insights/:signature` - 200, insight deleted

**Health:**
- `GET /api/health` - 200, health status
- `GET /api/health/ready` - 200, readiness check

**Test Commands:**
```bash
npm run test:api
```

### 3. Integration/Workflow Tests (Target: All critical paths)

**Workflows to Test:**
- ✅ Complete user journey: signup → onboarding → analyze → feedback → dashboard
- ✅ Cache hit/miss scenarios
- ✅ Baseline update and cache invalidation
- ✅ Multi-user scenarios (isolation)
- ✅ Error recovery paths

**Test Commands:**
```bash
npm run test:integration
```

### 4. Component Tests (Target: All user-facing components)

**Components to Test:**
- ✅ `AnalyzeForm` - Form validation, submission, demo data
- ✅ `ResponseDisplay` - LLM output rendering, follow-up, save
- ✅ `Dashboard` - Stats, timer, mark done, retrospective
- ✅ `OnboardingQuiz` - Question flow, insight display
- ✅ `InsightsView` - List, search, pagination, delete
- ✅ `ProtectedRoute` - Auth guard, onboarding requirement

**Test Commands:**
```bash
npm run test:ui
```

---

## Testing Infrastructure

### Setup Requirements

1. **Supabase Test Project**
   - Create separate test project
   - Run `supabase/schema.sql`
   - Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.test`

2. **Clerk Test Environment**
   - Use test publishable key
   - Mock auth in tests via `x-clerk-user-id` header

3. **OpenAI API**
   - Use mock LLM provider in tests (set `NODE_ENV=test`)
   - Real API key optional for integration tests

### Test Environment Variables

Create `.env.test`:
```bash
NODE_ENV=test
PORT=3002
SUPABASE_URL=https://your-test-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-test-service-role-key
CLERK_SECRET_KEY=  # Optional, uses header auth
OPENAI_API_KEY=    # Optional, uses mock provider
```

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:api         # API tests only
npm run test:integration # Integration tests only
npm run test:ui          # Component tests only

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

---

## Manual Testing Checklist

**⚠️ CRITICAL: These require manual intervention**

### Pre-Deployment Manual Tests

#### 1. Authentication Flow
- [ ] Sign up with Clerk works
- [ ] Sign in with Clerk works
- [ ] Sign out clears session
- [ ] Protected routes redirect to /sign-in
- [ ] After sign-in, user redirects to intended page
- [ ] Session persists across tab refresh

#### 2. Onboarding Flow
- [ ] Quiz displays all 4 questions
- [ ] Selecting option shows insight (3s display)
- [ ] Cannot submit without answering all questions
- [ ] Submit creates profile in database
- [ ] Profile has correct baseline scores (40-60 range)
- [ ] User redirects to /app/analyze after completion
- [ ] Skipping onboarding (if exists) redirects to quiz

#### 3. Analysis Flow (CRITICAL PATH)
- [ ] Form validation shows errors for:
  - Situation too short (<10 chars)
  - Goal too short (<5 chars)
  - Constraints missing
  - Current steps missing
- [ ] Demo data button pre-fills form correctly
- [ ] Submitting shows loading state
- [ ] Analysis completes within 10 seconds
- [ ] Response displays all sections:
  - Summary
  - Immediate steps (1-3 steps)
  - Strategic lens
  - Top risks
  - Recommended KPI
- [ ] Save insight button appears
- [ ] Follow-up buttons work for each section
- [ ] Escape key resets form

#### 4. Save Insight Flow
- [ ] Save insight modal opens
- [ ] User can set custom title
- [ ] User can add tags (max 10)
- [ ] Save creates entry in database
- [ ] Save button changes to "Saved" state
- [ ] Saved insight appears in /app/insights
- [ ] Insight can be updated (title, tags)
- [ ] Insight can be deleted

#### 5. Dashboard Flow (CRITICAL PATH)
- [ ] Dashboard loads without errors
- [ ] Active step displays (if exists)
- [ ] Timer shows elapsed time (MM:SS format)
- [ ] Timer updates every second
- [ ] Mark done button opens overlay
- [ ] Slider (0-10) is interactive
- [ ] Outcome autocomplete suggests previous outcomes
- [ ] Submit feedback:
  - Shows retrospective modal
  - Generates 3-5 insights
  - Updates baseline scores
  - Updates stats (completed, ΔIPP, streak)
  - Emits step1.completed event
  - Dashboard tab pulses
- [ ] Recent wins display (last 8)
- [ ] Clicking win navigates to analysis
- [ ] Sparkline chart renders (if 15+ data points)
- [ ] Giant metrics update

#### 6. Insights View
- [ ] Saved insights list loads
- [ ] Search filters insights
- [ ] Pagination works (load more)
- [ ] Clicking insight navigates to analysis
- [ ] Delete removes insight
- [ ] Flash effect on return from analysis

#### 7. Navigation & UX
- [ ] Tab switching (Analyze, Dashboard, Insights) works
- [ ] Escape key navigates to /app/analyze from any tab
- [ ] Streak bar displays at top
- [ ] Abandoned step indicator shows (if >24h)
- [ ] Dashboard pulses after marking step done
- [ ] URL changes reflect tab selection
- [ ] Back/forward browser buttons work

#### 8. Error Handling
- [ ] Network error shows user-friendly message
- [ ] API rate limit shows clear error
- [ ] Invalid input shows validation errors
- [ ] Missing profile redirects to onboarding
- [ ] LLM timeout shows retry option
- [ ] Database error shows clear message

#### 9. Performance
- [ ] Initial page load <3 seconds
- [ ] Analysis completes <10 seconds
- [ ] Dashboard loads <2 seconds
- [ ] Insights list loads <2 seconds
- [ ] Tab switching is instant
- [ ] No UI freezing or jank

#### 10. Responsive Design
- [ ] Works on mobile (375px width)
- [ ] Works on tablet (768px width)
- [ ] Works on desktop (1920px width)
- [ ] Touch interactions work on mobile
- [ ] Keyboard navigation works

#### 11. Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

#### 12. Data Persistence
- [ ] Profile persists across sessions
- [ ] Active step persists across sessions
- [ ] Saved insights persist
- [ ] Dashboard stats are accurate
- [ ] Baseline updates are reflected
- [ ] Cache expires after 24 hours

---

## Production Readiness Criteria

### Automated Tests (MUST PASS)

- [ ] **All unit tests pass** (90%+ coverage)
- [ ] **All API tests pass** (100% endpoint coverage)
- [ ] **All integration tests pass** (critical paths)
- [ ] **All component tests pass** (user-facing components)
- [ ] **No TypeScript errors** (`npm run lint`)
- [ ] **Build succeeds** (`npm run build`)

### Manual Verification (MUST COMPLETE)

- [ ] **All 12 manual test sections pass** (see above)
- [ ] **No console errors** in browser dev tools
- [ ] **No 4xx/5xx errors** in normal workflows
- [ ] **Performance meets targets** (see section 9)

### Security Verification (MUST PASS)

- [ ] **HTTPS enabled** in production
- [ ] **CORS configured** correctly
- [ ] **Rate limiting active** on all endpoints
- [ ] **Input validation** on all user inputs
- [ ] **Authentication required** on protected routes
- [ ] **Ownership validation** on all data access
- [ ] **No secrets in client code**
- [ ] **Environment variables** not exposed

### Database Verification (MUST PASS)

- [ ] **Schema applied** (`supabase/schema.sql`)
- [ ] **All tables exist** (6 tables)
- [ ] **All indexes created** (performance)
- [ ] **Constraints enforced** (data validation)
- [ ] **Backup configured** (Supabase auto-backup)

### Monitoring & Logging (RECOMMENDED)

- [ ] **Error tracking** (Sentry/Bugsnag)
- [ ] **Analytics events** tracked
- [ ] **Server logs** configured (pino)
- [ ] **Performance monitoring** (optional)

---

## Deployment Testing

### Staging Environment Tests

Before deploying to production, deploy to staging and verify:

1. **Environment Variables**
   - [ ] All required variables set
   - [ ] Correct Supabase project
   - [ ] Correct Clerk environment
   - [ ] Correct OpenAI API key

2. **Database Connection**
   - [ ] Connection succeeds
   - [ ] Queries work
   - [ ] Writes persist

3. **Authentication**
   - [ ] Clerk works in staging
   - [ ] JWT verification works
   - [ ] Sign up/in/out works

4. **Core Workflow**
   - [ ] Complete workflow from sign-up to dashboard
   - [ ] No errors in any step

### Production Smoke Tests

After deploying to production:

1. **Health Check**
   ```bash
   curl https://your-domain.com/api/health
   # Should return 200 with "ok" status
   ```

2. **Critical Endpoints**
   ```bash
   # Test onboarding
   curl https://your-domain.com/api/onboarding/questions
   
   # Test health readiness
   curl https://your-domain.com/api/health/ready
   ```

3. **UI Load Test**
   - [ ] Visit landing page
   - [ ] Sign up/sign in
   - [ ] Complete one analysis
   - [ ] View dashboard
   - [ ] Check insights

---

## Performance & Load Testing

### Load Test Scripts

Use k6 for load testing:

```bash
# Test analyze endpoint (2 VUs, 30s)
k6 run -e BASE_URL=https://your-domain.com scripts/k6-analyze.js

# Test feedback endpoint
k6 run -e BASE_URL=https://your-domain.com \
  -e PROFILE_ID=<id> \
  -e SIGNATURE=<sig> \
  -e USER_ID=<user> \
  scripts/k6-feedback.js
```

### Performance Targets

- **API Response Time:** <500ms (p95)
- **LLM Analysis:** <10s (p95)
- **Page Load Time:** <3s (initial)
- **Tab Switch Time:** <200ms
- **Dashboard Load:** <2s

### Lighthouse CI

```bash
# Run Lighthouse on key pages
npx @lhci/cli@0.13.0 autorun \
  --collect.url=https://your-domain.com \
  --collect.url=https://your-domain.com/app/analyze
```

**Targets:**
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

---

## Security Testing

### Automated Security Checks

1. **Dependency Vulnerabilities**
   ```bash
   npm audit
   # Should show 0 high/critical vulnerabilities
   ```

2. **OWASP Top 10 Coverage**
   - [ ] Injection prevention (parameterized queries)
   - [ ] Broken authentication (Clerk)
   - [ ] Sensitive data exposure (HTTPS, no secrets in code)
   - [ ] XML external entities (N/A)
   - [ ] Broken access control (ownership validation)
   - [ ] Security misconfiguration (headers, CORS)
   - [ ] XSS (React escaping, CSP headers)
   - [ ] Insecure deserialization (N/A)
   - [ ] Using components with known vulnerabilities (npm audit)
   - [ ] Insufficient logging & monitoring (pino, analytics)

### Manual Security Tests

1. **Authentication Bypass**
   - [ ] Try accessing /app/* without auth → redirects to /sign-in
   - [ ] Try accessing API without auth → 401 error

2. **Authorization Bypass**
   - [ ] Try accessing another user's profile → 403 error
   - [ ] Try accessing another user's insights → 403 error

3. **Input Validation**
   - [ ] Try SQL injection in text fields → rejected
   - [ ] Try XSS payloads in text fields → escaped
   - [ ] Try invalid data types → validation error

4. **Rate Limiting**
   - [ ] Rapid requests trigger rate limit → 429 error
   - [ ] Rate limit resets after time window

---

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test & Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Lint
        run: npm run lint
        
      - name: Build
        run: npm run build
        
      - name: Run tests
        run: npm test
        env:
          NODE_ENV: test
          SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.TEST_SUPABASE_SERVICE_ROLE_KEY }}
```

---

## Test Data Management

### Test User Conventions

- **User IDs:** `user_test_<timestamp>_<random>`
- **Profile IDs:** `profile_test_<timestamp>_<random>`
- **Test Data Prefix:** All test data uses `test_` prefix

### Cleanup Strategy

1. **After Each Test:**
   - Delete created profiles
   - Delete feedback records
   - Delete cache entries
   - Delete active steps

2. **Daily Cleanup:**
   - Delete all test data older than 24 hours
   - Run cleanup script:
   ```bash
   npm run cleanup:testdata
   ```

### Data Isolation

- Each test creates its own profile
- Tests use unique user IDs
- No shared state between tests
- Parallel test execution supported

---

## Test Maintenance

### When to Update Tests

- **New feature added:** Add tests for new functionality
- **Bug fixed:** Add regression test
- **API changed:** Update API tests
- **Schema changed:** Update integration tests

### Test Review Checklist

- [ ] Tests are clear and well-named
- [ ] Tests are isolated (no dependencies)
- [ ] Tests clean up after themselves
- [ ] Tests use realistic data
- [ ] Tests cover edge cases
- [ ] Tests are fast (<5s each)

---

## Appendix: Test Files Reference

### Unit Tests
- `tests/signature.test.ts` - Input normalization
- `tests/prompt_builder.test.ts` - Prompt templates
- `tests/feedbackAnalyzer.test.ts` - Pattern analysis
- `tests/unit/postProcess.test.ts` - Response guards
- `tests/unit/cache.test.ts` - Cache operations
- `tests/unit/tokenTracker.test.ts` - Token tracking

### API Tests
- `tests/api/analyze.test.ts` - Analysis endpoints
- `tests/api/feedback.test.ts` - Feedback endpoints
- `tests/api/onboarding.test.ts` - Onboarding endpoints
- `tests/api/health.test.ts` - Health checks
- `tests/api/middleware.test.ts` - Middleware
- `tests/api/analyze-comprehensive.test.ts` - Comprehensive analyze tests
- `tests/api/feedback-retention.test.ts` - Feedback retention

### Integration Tests
- `tests/integration/workflow.test.ts` - Complete workflows
- `tests/integration/workflow-retention-insights.test.ts` - Retention & insights

### Component Tests
- `tests/protectedRoute.test.tsx` - Route protection
- `tests/responseDisplay.cta.test.tsx` - Response display

---

## Success Criteria

**Production deployment is approved when:**

✅ All automated tests pass (100%)  
✅ All manual tests pass (12/12 sections)  
✅ Performance targets met  
✅ Security checks pass  
✅ Staging deployment successful  
✅ Production smoke tests pass  

**Estimated Testing Time:** 4-6 hours for complete manual testing  
**Recommended Team:** 2 testers (parallel workflows)

---

**Document Prepared By:** GitHub Copilot Agent  
**Review Status:** Ready for Manual Testing  
**Next Steps:** Execute manual testing checklist → Deploy to staging → Production smoke tests
