# Vercel Deployment Troubleshooting

## ✅ Fixes Applied

1. **Serverless function import path**: Now imports from `dist/server/index.js` in production
2. **Better error handling**: Detailed error messages with stack traces
3. **Build configuration**: Updated `vercel.json` with proper memory allocation

## 🔍 Check Deployment Logs

After pushing, go to:
```
https://vercel.com/gravemont-technologies/actionos-v1-fork/deployments
```

Click on the latest deployment → **View Function Logs**

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '../dist/server/index.js'"
**Solution**: Vercel needs to build the server first. Check that `vercel.json` has:
```json
"buildCommand": "npm run build"
```

And that `package.json` has:
```json
"build": "npm run build:server && npm run build:client"
```

### Issue: "Environment validation failed"
**Solution**: Add ALL environment variables in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add each variable from your `.env` file
- Make sure to set them for **Production**, **Preview**, and **Development**

Required variables:
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CLERK_SECRET_KEY
OPENAI_API_KEY
OPENAI_MODEL
NODE_ENV=production
VITE_CLERK_PUBLISHABLE_KEY
```

### Issue: Function timeout (504)
**Current status**: Free tier = 10s timeout, your LLM calls = 15-45s

**Solutions**:
1. **Upgrade to Pro** ($20/month) → 60s timeout (recommended)
2. **Optimize LLM calls**: Reduce token limits, stream responses

### Issue: CORS errors
**Solution**: Vercel auto-detects `FRONTEND_URL` from `VERCEL_URL`. No action needed.

If you still see CORS errors, add this to Vercel env vars:
```
FRONTEND_URL=https://your-app.vercel.app
```

### Issue: "Failed to compile TypeScript"
**Solution**: Run locally first:
```bash
npm run build
```

Fix any TypeScript errors, then commit and push.

### Issue: Blank page / "Failed to fetch"
**Checklist**:
1. ✅ Environment variables set in Vercel
2. ✅ Build succeeded (check deployment logs)
3. ✅ API responds: `https://your-app.vercel.app/api/health`
4. ✅ Frontend loads: `https://your-app.vercel.app/`

If API returns 500, check **Function Logs** for the actual error.

## 📊 How to Debug

### 1. Check Build Logs
```
Vercel Dashboard → Deployments → [Latest] → Building
```

Look for:
- ✅ "Installing dependencies"
- ✅ "Running build command"
- ✅ "Build completed"

### 2. Check Function Logs
```
Vercel Dashboard → Deployments → [Latest] → Functions → api
```

Look for:
- ✅ "Serverless function invoked"
- ❌ "Error: Cannot find module"
- ❌ "Environment validation failed"

### 3. Test API Directly
```bash
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{"status":"ok","environment":"production"}
```

If you get 500, check the error message in the response.

### 4. Test Frontend
Open browser console (F12) and look for:
- ❌ "Failed to fetch"
- ❌ CORS errors
- ✅ Successful API calls

## 🚀 Force Redeploy

If you've added environment variables:
```
Vercel Dashboard → Deployments → [Latest] → ⋮ → Redeploy
```

Check "Use existing Build Cache" = OFF to force fresh build.

## 📝 Verify Environment Variables

In Vercel Dashboard → Settings → Environment Variables, you should see:

**Production:**
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY
- ✅ CLERK_SECRET_KEY
- ✅ OPENAI_API_KEY
- ✅ OPENAI_MODEL
- ✅ NODE_ENV
- ✅ VITE_CLERK_PUBLISHABLE_KEY

**Important**: If any are missing, add them and **redeploy**.

## 🆘 Still Having Issues?

1. Check Vercel logs (detailed error messages)
2. Test locally: `npm run dev` (should work perfectly)
3. Test build locally: `npm run build` (should complete without errors)
4. Compare local `.env` with Vercel environment variables

The serverless function now includes detailed error logging. Check the Function Logs for the exact error message and stack trace.
