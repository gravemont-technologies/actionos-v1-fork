# Tests: Health endpoint & CSS build

## Purpose
- Prevent regressions that break the frontend build due to PostCSS @import ordering.
- Ensure /api/health is available for both GET and POST so probes/tools won't get 404s.

## How to run locally
- Start dev: `npm run dev`
- Run tests: `npm run test:api` (or `vitest run tests/api`)
- Build client: `npm run build:client` (validates PostCSS @import ordering)

## CI Recommendations
- Ensure `npm run build` runs during CI to catch PostCSS errors.
- Run `vitest run tests/api` as part of CI test steps.

## What was fixed
1. **PostCSS @import ordering**: Moved `@import './ui/styles/design-tokens.css'` to the very top of src/index.css, before @tailwind directives. PostCSS requires @import statements to precede all other statements (except @charset).
2. **Health endpoint POST support**: Added POST handler to /api/health endpoint to accept health checks from probes/tools that use POST method, preventing 404 errors.

## Testing strategy
- **CSS build validation**: The `npm run build:client` command will fail if @import ordering is violated.
- **Health endpoint validation**: Integration tests in `tests/api/health.test.ts` verify both GET and POST methods return 200 status with `{status: 'ok'}` response.

## Notes
- The health router is registered at `/api/health` in src/server/index.ts (line 75).
- Health endpoint responses include the current NODE_ENV for debugging purposes.
- The endpoint is intentionally lightweight with no authentication required for health checks.
