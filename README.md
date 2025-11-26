# ActionOS: Instant GitHub/Vercel Deploy

## 1. Prerequisites
- Node.js 20.x
- Vercel account (or local Node)
- Supabase project (Postgres)
- OpenAI, Clerk API keys

## 2. One-Click Deploy (Vercel)
1. **Fork or clone this repo to your GitHub.**
2. **Connect your repo to Vercel:**
   - Import project in Vercel dashboard
   - Set all required environment variables (see `.env.example`)
   - Vercel auto-detects `vercel.json` and deploys all API endpoints
3. **Apply the database schema:**
   - In Supabase SQL editor, run `supabase/schema.sql`
4. **Done!**
   - All endpoints and frontend are live instantly.

## 3. Local Development
```sh
npm install
cp .env.example .env
# Edit .env with your keys
npm run dev
```
- Frontend: http://localhost:3000
- API: http://localhost:3001

## 4. Manual Steps (if needed)
- See `manual-stuff.md` for any non-automatable actions (e.g., DB triggers, migrations).

## 5. Troubleshooting
- See `docs/README.md` for full troubleshooting, API, and architecture docs.

---
**Deploys are seamless. If you hit any blocker, check your env vars and DB schema first!**
