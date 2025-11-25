# ActionOS Frontend Environment Variables

## Required for seamless integration

- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk frontend key
- `VITE_FRONTEND_URL`: The deployed frontend URL (e.g., https://your-app.vercel.app)
- `VITE_API_URL`: The backend API base URL (e.g., https://your-backend-host.com)

**Never hardcode API URLs. Always use `import.meta.env.VITE_API_URL` for all API calls.**

## Example `.env`

```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_FRONTEND_URL=https://your-app.vercel.app
VITE_API_URL=https://your-backend-host.com
```

## Deployment
- Set these variables in Vercel dashboard for production.
- For local dev, copy `.env.example` to `.env` and fill in values.

---

# Backend CORS
- The backend must set `Access-Control-Allow-Origin` to the exact frontend URL (from `FRONTEND_URL` env).
- Never use `*` in production.

---

# Troubleshooting
- 401/403: Check Clerk keys and CORS.
- 404/502: Check `VITE_API_URL` and backend deployment.
- CORS errors: Ensure backend allows the deployed frontend domain.
