# Deployment Workflow & Troubleshooting

## Health Check
- The backend exposes `/health`, `/health/live`, and `/health/ready` endpoints.
- Use `/health/ready` for monitoring (checks DB, Clerk, OpenAI config).
- Example: `curl https://your-backend-host.com/health/ready`

## Monitoring
- Add UptimeRobot or similar to monitor `/health/ready`.
- Alerts if status != 200 or response.status != "ready".

## Troubleshooting
- If `/health/ready` fails:
  - Check DB connection and schema
  - Check Clerk and OpenAI env vars
  - Check logs for error details

---

# End-to-End QA
- After deploy, run through:
  1. Sign up/in (Clerk)
  2. Submit action (ActionModal)
  3. Receive feedback/metrics
  4. View dashboard/metrics
- Log and fix any CORS, 401, 404, or integration errors.

## Regression Testing
- Add/expand tests in `tests/` for all critical flows.
- Run tests on every deploy (CI/CD).

---

# CI/CD
- Set up GitHub Actions or deploy hooks to:
  - Run lint and tests
  - Deploy on main branch push
  - Fail build if health check fails

---

# Common Errors
- 401/403: Clerk config or CORS
- 404/502: API URL or backend down
- CORS: Backend must allow exact frontend URL
- Health check fails: See `/health/ready` details
