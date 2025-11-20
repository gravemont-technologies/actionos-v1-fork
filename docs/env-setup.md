# Environment Variables Setup Guide

## Quick Start

**Never commit `.env` files to git.** They contain secrets and are already in `.gitignore`.

### Local Development

```bash
# 1. Copy template (if exists) or create new file
cp .env.example .env  # OR: touch .env

# 2. Edit with your credentials
nano .env  # or your preferred editor

# 3. Verify it's ignored
git status  # .env should NOT appear
```

### Required Variables

```bash
# Required (all environments)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required in production
CLERK_SECRET_KEY=sk_test_or_sk_live_key

# Optional (with defaults)
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
OPENAI_API_KEY=sk-proj-your_key
OPENAI_MODEL=gpt-4o-mini
ANALYTICS_WEBHOOK=https://your-webhook-url
```

## Production/CI Deployment

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
```

**Setup:** Repository Settings → Secrets and variables → Actions → New repository secret

### Vercel
```bash
vercel env add SUPABASE_URL
vercel env add CLERK_SECRET_KEY
# Enter values when prompted
```

### Docker
```bash
docker run -e SUPABASE_URL=value -e CLERK_SECRET_KEY=value your-image
```

### Heroku
```bash
heroku config:set SUPABASE_URL=value
heroku config:set CLERK_SECRET_KEY=value
```

## Security Best Practices

✅ **DO:**
- Keep `.env` in `.gitignore`
- Use `.env.example` with placeholder values (can be committed)
- Rotate credentials if exposed
- Use different credentials per environment (dev/staging/prod)
- Use environment-specific `.env` files: `.env.local`, `.env.production`

❌ **DON'T:**
- Commit `.env` to git
- Share credentials in chat/email/Slack
- Use production credentials in development
- Hardcode secrets in source code

## Alternative Methods

### 1. `.env.example` Template (Recommended)
Create a template file that can be safely committed:
```bash
# .env.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
CLERK_SECRET_KEY=your_clerk_key_here
OPENAI_API_KEY=your_openai_key_here
```

Developers copy and fill in real values:
```bash
cp .env.example .env
# Edit .env with actual credentials
```

### 2. Encrypted Secrets (Advanced)
```bash
# Using git-crypt
git-crypt init
echo ".env filter=git-crypt diff=git-crypt" >> .gitattributes
git-crypt add-gpg-user YOUR_GPG_KEY_ID

# Using SOPS
sops --encrypt .env > .env.encrypted
# Commit .env.encrypted, not .env
```

### 3. Secret Management Services
- **1Password CLI**: `op run --env-file=".env" -- npm start`
- **AWS Secrets Manager**: Fetch at runtime
- **HashiCorp Vault**: Dynamic secret injection
- **Doppler**: Centralized secret management

### 4. Environment-Specific Files
```bash
.env.local          # Local overrides (highest priority, ignored)
.env.development    # Development defaults
.env.production     # Production defaults
.env                # Shared defaults (ignored)
```

Load order (most frameworks):
```
.env.local > .env.{NODE_ENV} > .env
```

## Troubleshooting

**Problem:** Variables not loading
```bash
# Check file exists and has values
cat .env

# Verify it's being read (add debug logging)
console.log('ENV loaded:', process.env.SUPABASE_URL ? 'yes' : 'no');
```

**Problem:** Accidentally committed `.env`
```bash
# Remove from git history
git rm --cached .env
git commit -m "Remove .env from tracking"

# Rotate ALL credentials in the file immediately
```

**Problem:** Different values needed per developer
```bash
# Use .env.local (not tracked)
cp .env.example .env.local
# Edit .env.local with your personal credentials
```

## Verification Checklist

- [ ] `.env` is in `.gitignore`
- [ ] `.env` does NOT appear in `git status`
- [ ] `.env.example` exists with placeholder values
- [ ] Team members know to copy `.env.example` to `.env`
- [ ] Production uses separate credential management
- [ ] Credentials are never in source code or public comments
- [ ] You have rotated any exposed credentials
