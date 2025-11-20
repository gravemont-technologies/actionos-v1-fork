# Action OS MVP

Strategic guidance platform delivering 1–3 high-leverage actions per session with measurable ΔIPP/BUT tracking.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a Supabase project
   - Run `supabase/schema.sql` in your Supabase SQL editor
   - Copy your project URL and service role key

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials and OpenAI API key
   ```

4. **Test OpenAI API Key (recommended):**
   ```bash
   npm run test:openai
   ```
   This verifies your API key has the required `model.request` scope.

5. **Run development servers:**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

6. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## Architecture

- **Backend:** Express.js with TypeScript, Supabase for persistence
- **Frontend:** React + Vite (unified build system)
- **Storage:** Supabase PostgreSQL with RLS policies
- **LLM:** OpenAI (configurable via `OPENAI_API_KEY`)

## Key Features

- Onboarding quiz → profile generation with baseline IPP/BUT
- Structured input form with client-side signature computation
- LLM-powered analysis with strict 200-token output cap
- Signature-based caching (24h TTL)
- Feedback loop with baseline recalibration
- Analytics events tracked in Supabase

## Sound Assets

The app uses a metallic clang sound effect (80ms) when marking Step-1 as done.

### File Location
Place the sound file at: `/sounds/metallic-clang.mp3` (root level)

Vite serves static files from the root by default, so `/sounds/metallic-clang.mp3` will be accessible.

### Fallback Behavior
If the sound file is missing, the app will automatically generate a synthetic sound using the Web Audio API. This ensures the feature works even without the asset file.

### Creating the Sound File
- Duration: 80ms
- Format: MP3
- Style: Metallic clang/impact sound
- Recommended tools: Audacity, online sound generators, or royalty-free sound libraries

## API Endpoints

- `GET /api/onboarding/questions` - List quiz questions
- `POST /api/onboarding/profile` - Generate profile from responses
- `POST /api/analyze` - Analyze situation and return actions
- `POST /api/step-feedback` - Submit Step-1 completion feedback
- `GET /api/step-feedback/recent?profile_id=...` - List recent feedback

## Environment Variables

See `.env.example` for required configuration.

**Important Notes:**
- `CLERK_SECRET_KEY` is optional in development - if not set, the app uses header-based auth (`x-clerk-user-id`)
- In development, even if `CLERK_SECRET_KEY` is set, header-based auth is prioritized for easier workflow
- Production requires `CLERK_SECRET_KEY` and proper JWT token verification

## Database Schema

See `supabase/schema.sql` for complete schema with RLS policies, redaction functions, and indexes.

**Setup Steps:**
1. Create a Supabase project at https://supabase.com
2. Go to SQL Editor in your Supabase dashboard
3. Copy and paste the entire contents of `supabase/schema.sql`
4. Run the SQL script
5. Verify tables are created: `profiles`, `signature_cache`, `active_steps`, `feedback_records`, `analytics_events`

## Troubleshooting

### Database Errors

**Error: "Could not find the table 'public.profiles' in the schema cache"**
- **Solution:** Run `supabase/schema.sql` in your Supabase SQL Editor
- **Verify:** Check `/api/health/ready` endpoint - it will show database status

**Error: "Database schema not initialized"**
- **Solution:** The schema hasn't been applied. Run the SQL script in Supabase
- **Check:** Visit `http://localhost:3001/api/health/ready` to see detailed health status

### Authentication Errors

**Error: "Missing authentication token" (401)**
- **In Development:** Ensure `x-clerk-user-id` header is being sent (automatically handled by `useAuthHeaders()` hook)
- **In Production:** Requires proper Clerk JWT token in `Authorization: Bearer <token>` header
- **Note:** Development mode prioritizes header-based auth even if `CLERK_SECRET_KEY` is set

### LLM API Errors

**Error: "You have insufficient permissions for this operation. Missing scopes: model.request" (401)**
- **Quick Test:** Run `npm run test:openai` to verify your API key permissions
- **This error has TWO possible causes:**

### Cause 1: Organization Role Issue (Most Common)
The error mentions "organization (Reader, Writer, Owner)" - this is an **organization role problem**, not API key permissions.

**Fix:**
1. **Check your organization role:** Go to https://platform.openai.com/org/settings
2. **Verify your role:** You need **Writer** or **Owner** role (Reader is insufficient)
3. **If you're only a Reader:** Ask an organization Owner to upgrade you to Writer/Owner
4. **Alternative:** Create a new API key from a **personal account** (not tied to an organization)

### Cause 2: API Key Capabilities Not Enabled
If your organization role is correct, check API key capabilities.

**Fix:**
1. **Go to OpenAI API Keys:** https://platform.openai.com/api-keys
2. **Find your key:** Look for the key starting with `sk-proj...` (check server logs for exact prefix)
3. **Click "Edit"** on that API key
4. **Enable Chat completions:**
   - Under "Model capabilities", enable **"Chat completions (/v1/chat/completions)"**
   - **OR** enable **"All"** capabilities (recommended for development)
5. **Save changes** and wait 10-30 seconds for propagation
6. **Test again:** Run `npm run test:openai` to verify it works
7. **Restart server:** After verification, restart your server (`npm run dev`)

- **Important Notes:**
  - The error message says "model.request" but this is OpenAI's internal scope name
  - The actual permission you need is **"Chat completions"** under Model capabilities
  - **Organization role** (Writer/Owner) is often the real blocker, not API key permissions
  - If using a **restricted key**, you must explicitly enable "Chat completions"
  - If using an **unrestricted key**, it should work by default (if organization role allows)
- **Common Issues:**
  - **Organization role too low:** You're a "Reader" but need "Writer" or "Owner"
  - **Project role insufficient:** If key is tied to a project, you need "Member" or "Owner" role
  - **Wrong API key:** The key in `.env` doesn't match the one you updated
  - **Server not restarted:** `.env` changes only take effect after restarting the server
  - **Model configuration:** Ensure `OPENAI_MODEL` in `.env` matches a valid model you have access to
- **Note:** This is a configuration issue, not a code bug. Check both organization role AND API key permissions.

### Rate Limiting

**Error: "Rate limit exceeded" (429) on `/api/onboarding/insights`**
- **Solution:** The insights endpoint now has a more lenient rate limiter (10,000 req/min in dev, 500 in prod)
- **Note:** Rate limiting has been fixed - rapid quiz clicking should work smoothly

### Authorization Errors

**Error: "Profile not found" (403) when profile exists**
- **Cause:** Profile was created without `user_id` (legacy profile or created before authentication)
- **Solution:** In development mode, the system automatically updates the profile with your user ID on first use
- **Note:** Production requires proper ownership - profiles must have matching `user_id`
- **Check:** Verify your profile has `user_id` set in Supabase dashboard

## Bug & Error Tracking

All bugs fixed and errors encountered are documented in `docs/errors.md` (also accessible as `docs/bugs-and-errors.md`). This includes:
- Comprehensive error tracking with unique error IDs (ERR-YYYYMMDD-XXX format)
- Fix attempts tracked with success/failure status
- Bug fixes with solutions and testing strategies
- Terminal errors with resolutions
- Repeated error patterns and monitoring strategies
- Proactive monitoring and prevention measures
- Statistics and trend analysis

To log a new error:
- **Windows (PowerShell):** `.\scripts\track-error.ps1 "Error description" "Component" "Severity"`
- **Unix/Mac:** `./scripts/track-error.sh "Error description" "Component" "Severity"`

For detailed usage instructions and error tracking guidelines, see `docs/errors.md`.

