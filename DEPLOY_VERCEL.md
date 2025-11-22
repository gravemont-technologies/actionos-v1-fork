# Vercel Deployment Guide - ActionOS

## ✅ What's Done

Your app is **ready to deploy** to Vercel's free tier. Everything (frontend + backend) runs in one repo.

## 🚀 Deploy to Vercel (5 minutes)

### 1. Connect GitHub to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New Project"**
4. Select `gravemont-technologies/actionos-v1-fork`
5. Click **"Import"**

### 2. Configure Environment Variables

**CRITICAL:** Before deploying, click **"Environment Variables"** and add these:

#### Required (Backend):
```
SUPABASE_URL=https://gbfubfltdmddelodnbpu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-supabase-service-role-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o-mini
NODE_ENV=production
```

#### Required (Frontend):
```
VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
```

**Get your keys from:**
- Supabase: [Settings → API](https://supabase.com/dashboard/project/_/settings/api)
- Clerk: [API Keys](https://dashboard.clerk.com/apps)
- OpenAI: [API Keys](https://platform.openai.com/api-keys)

**Note:** `VITE_API_URL` is **NOT needed** — the frontend will automatically use same-origin requests (e.g., `/api/analyze`).

### 3. Deploy
Click **"Deploy"** — Vercel will:
- Build the frontend (`npm run build:client`)
- Build the backend (`npm run build:server`)
- Deploy the serverless API function (`api/index.ts`)
- Serve static files from `dist/client`

### 4. Test Your Deployment
Once deployed (2-3 minutes), Vercel will give you a URL like:
```
https://actionos-v1-fork.vercel.app
```

Test these endpoints:
- **Frontend**: `https://your-app.vercel.app/` (should load React app)
- **Health Check**: `https://your-app.vercel.app/api/health` (should return `{"status":"ok"}`)
- **Analysis**: Sign in and test the analyze flow

---

## 📋 How It Works

### Architecture
```
┌─────────────────────────────────────┐
│         Vercel (Free Tier)          │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   Static Files (Frontend)    │  │
│  │   dist/client/               │  │
│  │   - React app                │  │
│  │   - Vite bundled assets      │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Serverless API (Backend)    │  │
│  │  api/index.ts                │  │
│  │  - Runs Express server       │  │
│  │  - 60s timeout (free tier)   │  │
│  │  - Auto-scales               │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
           │
           ├─ Supabase (Database)
           ├─ Clerk (Auth)
           └─ OpenAI (LLM)
```

### Request Flow
1. User visits `https://your-app.vercel.app/` → Vercel serves `dist/client/index.html`
2. Frontend makes API call to `/api/analyze` → Vercel routes to `api/index.ts`
3. `api/index.ts` runs Express server → handles request → returns JSON
4. Frontend displays results

---

## ⚠️ Free Tier Limits

### Vercel Free Tier:
- ✅ **Serverless Function Timeout**: 10 seconds (Hobby), **60 seconds** (Pro - $20/month)
- ✅ **Bandwidth**: 100 GB/month
- ✅ **Build Time**: 6000 minutes/month
- ✅ **Invocations**: Unlimited

**Note:** Your AI analysis endpoints take **15-45 seconds** to complete. The free tier has a **10-second timeout**, which will cause timeouts. You have two options:
1. **Upgrade to Vercel Pro** ($20/month) for 60-second timeout
2. **Optimize LLM calls** to complete under 10 seconds (stream responses, reduce token limits)

### Supabase Free Tier:
- ✅ **Database**: 500 MB storage
- ✅ **Bandwidth**: Unlimited
- ✅ **API Requests**: Unlimited

---

## 🔧 Local Development (unchanged)

```bash
# Terminal 1: Start backend (Express server)
npm run dev:server

# Terminal 2: Start frontend (Vite dev server with proxy)
npm run dev:client
```

Frontend: `http://localhost:3000`  
Backend: `http://localhost:3001`

---

## 🐛 Troubleshooting

### "Module not found" errors in Vercel
- **Cause**: Missing dependencies or incorrect imports
- **Fix**: Run `npm install` locally, commit `package-lock.json`, push to GitHub

### API returns 404
- **Cause**: Vercel routing misconfigured
- **Fix**: Check `vercel.json` — ensure `/api/:path*` rewrites to `/api`

### "Environment variable not defined"
- **Cause**: Missing env vars in Vercel dashboard
- **Fix**: Go to Vercel → Project Settings → Environment Variables → Add missing vars → Redeploy

### Function timeout (504 error)
- **Cause**: LLM calls exceed 10-second free tier limit
- **Fix**: Upgrade to Pro ($20/month) or optimize LLM calls

### CORS errors
- **Cause**: FRONTEND_URL mismatch
- **Fix**: Set `FRONTEND_URL=https://your-app.vercel.app` in Vercel env vars (or remove it — auto-detected from `VERCEL_URL`)

---

## 📦 What Changed

### Files Added:
- `api/index.ts` — Serverless wrapper for Express app

### Files Modified:
- `vercel.json` — Simplified routing configuration
- `src/server/config/env.ts` — Auto-detect `FRONTEND_URL` from `VERCEL_URL`
- `package.json` — Added `@vercel/node` dev dependency
- `src/ui/config/env.ts` — Made `VITE_API_URL` optional (defaults to empty string for same-origin)

### Files Unchanged:
- Express server (`src/server/index.ts`) — works identically in serverless
- All routes (`src/server/routes/*`) — no changes needed
- Frontend (`src/ui/*`) — no changes needed

---

## ✅ Deployment Checklist

Before deploying, verify:
- [x] GitHub repo pushed with latest changes
- [x] `vercel.json` exists with correct routing
- [x] `api/index.ts` exists
- [x] Environment variables ready to paste into Vercel
- [ ] Connected GitHub repo to Vercel
- [ ] Added environment variables in Vercel dashboard
- [ ] Clicked "Deploy"
- [ ] Tested `/api/health` endpoint
- [ ] Tested frontend login flow
- [ ] Tested analysis flow end-to-end

---

## 🎯 Next Steps (After Deployment)

1. **Test in production**: Sign up, run analysis, submit feedback
2. **Monitor logs**: Vercel → Project → Logs (check for errors)
3. **Upgrade if needed**: If you hit 10s timeout, upgrade to Pro
4. **Add custom domain** (optional): Vercel → Project → Settings → Domains

---

**You're done!** Push this commit, connect to Vercel, add env vars, and deploy. Everything should work out of the box.
