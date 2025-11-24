import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import analyzeRouter from '../../src/server/routes/analyze';
import { computeServerSignature } from '../../src/server/utils/signature';

// Mock dependencies
vi.mock('../../src/server/llm/client', () => ({
  llmProvider: {
    complete: vi.fn().mockResolvedValue(JSON.stringify({
      summary: 'Test summary for MVP launch',
      immediate_steps: [
        { 
          action: 'Fix critical auth bug', 
          why: 'Blocking user signups', 
          delta_bucket: 5,
          deeper_dive: 'Check JWT token expiry handling in middleware'
        },
        { 
          action: 'Deploy to staging', 
          why: 'Test with real users', 
          delta_bucket: 3,
          deeper_dive: 'Verify database migrations run cleanly'
        }
      ],
      strategic_lens: 'Focus on core user path first',
      top_risks: [
        { risk: 'Database migration failure', mitigation: 'Test on staging copy first' }
      ],
      kpi: 'First 10 successful signups',
      meta: {
        baseline_ipp: 50,
        baseline_but: 50
      }
    }))
  }
}));

vi.mock('../../src/server/middleware/clerkAuth', () => ({
  clerkAuthMiddleware: (req: any, res: any, next: any) => {
    res.locals.userId = 'test-user-123';
    next();
  }
}));

vi.mock('../../src/server/middleware/ensureProfile', () => ({
  ensureProfile: (req: any, res: any, next: any) => next()
}));

vi.mock('../../src/server/middleware/validateOwnership', () => ({
  validateOwnership: (req: any, res: any, next: any) => next()
}));

vi.mock('../../src/server/middleware/rateLimiter', () => ({
  analyzeRateLimiter: (req: any, res: any, next: any) => next()
}));

vi.mock('../../src/server/store/singletons', () => ({
  getSignatureCache: () => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined)
  }),
  getProfileStore: () => ({
    getBaseline: vi.fn().mockResolvedValue({ ipp: 50, but: 50 }),
    getProfile: vi.fn().mockResolvedValue({
      tags: ['SYSTEMATIC', 'ACTION_READY'],
      baseline: { ipp: 50, but: 50 },
      strengths: ['execution', 'focus']
    }),
    listFeedback: vi.fn().mockResolvedValue([]),
    setActiveStep: vi.fn().mockResolvedValue(undefined)
  })
}));

vi.mock('../../src/server/utils/metricsCalculator', () => ({
  getProfileMetrics: vi.fn().mockResolvedValue({
    metrics: {
      seven_day_ipp: 60,
      seven_day_but: 55,
      rsi: 0.8
    }
  })
}));

vi.mock('../../src/analytics/events', () => ({
  trackEvent: vi.fn()
}));

describe('POST /api/analyze', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.id = 'test-request-id';
      next();
    });
    app.use('/api/analyze', analyzeRouter);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should accept valid analyze request with correct signature', async () => {
    const payload = {
      profile_id: 'test-profile-123',
      situation: 'Test situation',
      goal: 'Test goal',
      constraints: 'time, money',
      current_steps: 'Building',
      deadline: '3 days',
      stakeholders: '',
      resources: '',
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

    const response = await request(app)
      .post('/api/analyze')
      .set('x-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');
    expect(response.body.output).toBeDefined();
    expect(response.body.output.immediate_steps).toHaveLength(2);
  });

  it('should reject request with invalid signature', async () => {
    const payload = {
      profile_id: 'test-profile-123',
      situation: 'Test situation',
      goal: 'Test goal',
      constraints: 'time, money',
      current_steps: 'Building',
    };

    const response = await request(app)
      .post('/api/analyze')
      .set('x-signature', 'invalid-signature-123')
      .send(payload);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('signature');
  });

  it('should reject request with missing signature', async () => {
    const payload = {
      profile_id: 'test-profile-123',
      situation: 'Test situation',
      goal: 'Test goal',
      constraints: 'time, money',
      current_steps: 'Building',
    };

    const response = await request(app)
      .post('/api/analyze')
      .send(payload);

    expect(response.status).toBe(401);
    expect(response.body.error).toContain('signature');
  });

  it('should reject request with missing required fields', async () => {
    const payload = {
      profile_id: 'test-profile-123',
      situation: 'Test situation',
      // Missing goal, constraints, current_steps
    };

    const signature = computeServerSignature({
      profileId: payload.profile_id,
      situation: payload.situation,
      goal: '',
      constraints: '',
      currentSteps: '',
      deadline: '',
      stakeholders: '',
      resources: '',
    });

    const response = await request(app)
      .post('/api/analyze')
      .set('x-signature', signature)
      .send(payload);

    expect(response.status).toBe(400);
  });

  it('should handle signature with normalized input', async () => {
    const payload = {
      profile_id: 'test-profile-123',
      situation: 'Test   with   extra   spaces',
      goal: 'Test goal',
      constraints: 'money, time', // Different order
      current_steps: 'Building',
      deadline: '',
      stakeholders: '',
      resources: '',
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

    const response = await request(app)
      .post('/api/analyze')
      .set('x-signature', signature)
      .send(payload);

    expect(response.status).toBe(200);
  });
});
