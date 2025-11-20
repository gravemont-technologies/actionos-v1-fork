import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '3m',
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% errors
    http_req_duration: ['p(95)<400'], // p95 < 400ms
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:3001';
const PROFILE_ID = __ENV.PROFILE_ID || 'test-profile';
const SIGNATURE = __ENV.SIGNATURE || 'a'.repeat(64);
const USER_ID = __ENV.USER_ID || 'k6-user';

export default function () {
  const res = http.post(`${BASE}/api/step-feedback`, JSON.stringify({
    profile_id: PROFILE_ID,
    signature: SIGNATURE,
    slider: Math.floor(Math.random() * 11),
    outcome: 'ok',
  }), { headers: { 'Content-Type': 'application/json', 'x-clerk-user-id': USER_ID } });
  check(res, { 'status is 200/403/400': (r) => [200, 400, 403].includes(r.status) });
  sleep(0.5);
}


