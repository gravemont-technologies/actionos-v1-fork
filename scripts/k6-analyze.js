import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 3,
  duration: '5m',
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% errors
    http_req_duration: ['p(95)<1500'], // p95 < 1500ms
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3001';

export default function () {
  const res = http.post(`${BASE}/api/analyze`, JSON.stringify({
    profile_id: 'test-profile',
    situation: 'Short example situation for load test.',
    goal: 'Example goal.',
    constraints: 'none',
    current_steps: 'none',
  }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'status is 200/400': (r) => r.status === 200 || r.status === 400 });
  sleep(1);
}


