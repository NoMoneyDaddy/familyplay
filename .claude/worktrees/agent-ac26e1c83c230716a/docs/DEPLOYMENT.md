# FamilyPlay Deployment Guide

## Overview

FamilyPlay is deployed across three platforms with environment-specific configurations:

- **Web (PWA)**: Deployed to Zeabur (Taiwan/Taipei node) via Docker, triggered by `git push origin main`
- **Mobile (iOS/Android)**: Built via EAS (Expo Application Services), submitted to App Store and Google Play Store
- **Database**: Supabase with Row-Level Security (RLS), migrations manually executed

### Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
└─────────────┬───────────────────────────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
    ▼                   ▼
┌────────────┐    ┌────────────┐
│  Develop   │    │   Main     │
│  Branch    │    │  Branch    │
└─────┬──────┘    └─────┬──────┘
      │                 │
      ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  Preview CI  │  │ Production CI│
│ (run tests,  │  │ (migrations, │
│  build demo) │  │  final build)│
└──────┬───────┘  └──────┬───────┘
       │                 │
       ▼                 ▼
┌─────────────────┐  ┌──────────────┐
│  EAS Preview    │  │ EAS + Zeabur │
│  Build (APK)    │  │ Production   │
└─────────────────┘  └──────────────┘
       │                 │
       ├─────┬───────────┤
       ▼     ▼           ▼
    [iOS] [Android]   [Web]
```

---

## CI/CD Workflow

### GitHub Actions Triggers

#### Preview Pipeline (`.github/workflows/preview.yml`)

**Trigger**: Push to `develop` branch or PR created

**Steps**:
1. Lint & Type Check (Biome + TypeScript)
2. Unit Tests (Turbo)
3. Conditional EAS Preview Build:
   - Only runs if commit message contains `[mobile]` tag
   - Creates internal distribution APK for Android testing
   - Uses channel `preview` for Expo Updates

**Environment Variables Required**:
- `EXPO_TOKEN`: EAS CLI authentication token

**Duration**: ~15 minutes (test) + ~30 minutes (mobile build, if triggered)

#### Production Pipeline (`.github/workflows/production.yml`)

**Trigger**: Push to `main` branch

**Steps**:
1. Lint & Type Check
2. Database Migration Execution (manual)
3. EAS Production Build:
   - iOS: App Store release build (`.ipa`)
   - Android: Google Play release build (`.aab`)
   - Uses channel `production` for Expo Updates
4. Zeabur Deployment:
   - Docker image built and pushed
   - Health check verifies /api/health returns 200 OK
   - Previous versions retained for rollback
5. Telegram Notification (success or failure)

**Environment Variables Required**:
- `EXPO_TOKEN`: EAS CLI authentication
- `SENTRY_ORG`, `SENTRY_PROJECT`: Error tracking
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`: Notifications
- All Supabase, AI provider, and payment service keys

**Duration**: ~45 minutes

### Branch Protection Rules

```
main branch requires:
  ✓ Status checks (lint, type-check, test) pass
  ✓ Code review (1 approval)
  ✓ Dismiss stale reviews on new commits
```

---

## Deployment Procedures

### Web Deployment (Zeabur)

#### Automatic Deployment

```bash
# 1. Local development and testing
git checkout -b feature/my-feature
pnpm install
pnpm biome check .
pnpm turbo type-check
pnpm turbo test
git commit -m "feat: description"

# 2. Create PR to develop branch
git push origin feature/my-feature
# → Preview CI runs automatically

# 3. Merge to main
git checkout main
git pull origin main
git merge feature/my-feature
git push origin main
# → Production CI runs, Zeabur automatically deploys
```

#### Manual Deployment (Emergency)

If you need to deploy without going through CI:

```bash
# 1. Ensure you have Docker installed
docker --version

# 2. Build locally (simulate Zeabur build)
pnpm install
pnpm turbo build --filter=apps/web

# 3. Test standalone build
node apps/web/.next/standalone/server.js
# Should be accessible at http://localhost:3000

# 4. Verify via curl
curl -s http://localhost:3000/api/health | jq
# Expected: { "status": "ok" }

# 5. Push to main (Zeabur auto-deploys)
git push origin main
```

#### Zeabur Dashboard Deployment

If git push fails or you need to force redeploy:

1. Go to [Zeabur Console](https://console.zeabur.com)
2. Navigate to `familyplay` project → `web` service
3. Click "Redeploy" button
4. Monitor logs in "Deployments" tab
5. Verify health check passes (green checkmark)

### Mobile Deployment (EAS)

#### Preview Build (Staging)

```bash
# Trigger via commit message
git commit -m "feat: new feature [mobile]"
git push origin develop
# → GitHub Actions automatically builds APK via EAS

# Monitor build progress
eas build --status
```

**Distribution**: Internal (via EAS app for testers)

**Duration**: ~30 minutes

#### Production Build (App Store / Google Play)

##### iOS App Store

```bash
# Prerequisites
# - Apple Developer account with valid certificate
# - APPLE_ASC_API_ISSUER_ID set in GitHub Secrets
# - APPLE_ASC_API_KEY_ID set in GitHub Secrets
# - APPLE_ASC_API_KEY_PATH set to base64-encoded P8 key

# Triggered automatically on main branch push
git push origin main
# → GitHub Actions builds and submits to App Store

# Monitor submission
# - Go to App Store Connect → Builds
# - Wait for processing (~5-30 minutes)
# - Review and manually publish from "Releases"
```

##### Android Google Play

```bash
# Prerequisites
# - Google Play developer account
# - Service account JSON key in GitHub Secrets
# - GOOGLE_PLAY_SERVICE_ACCOUNT_PATH set in GitHub Secrets

# Triggered automatically on main branch push
git push origin main
# → GitHub Actions builds AAB and submits to Play Console

# Monitor submission
# - Go to Google Play Console → Internal Testing → Releases
# - Wait for processing (~5 minutes)
# - Review and release to internal testing first
```

### Database Migrations

**Important**: Supabase migrations are executed **manually only** (not via CI).

#### Adding a New Migration

```bash
# 1. Create migration file locally
pnpm db:migrate
# Creates: supabase/migrations/[timestamp]_description.sql

# 2. Edit the migration file
vim supabase/migrations/[timestamp]_description.sql

# 3. Test locally (if using Supabase local stack)
supabase db push

# 4. Commit and push
git add supabase/migrations/
git commit -m "migration: description"
git push origin main

# 5. Execute in production (manual step)
# - Go to Supabase Dashboard → SQL Editor
# - Copy-paste the migration SQL file content
# - Execute and verify
```

**Rules**:
- Never modify existing migration files
- Only add new migrations
- Always test in local stack before production
- Keep migrations small and focused
- Include rollback SQL as comments

---

## Environment Setup

### Local Development

#### 1. Clone and Install

```bash
git clone https://github.com/your-org/familyplay.git
cd familyplay
pnpm install
```

#### 2. Setup Environment Variables

```bash
# Copy example file
cp .env.example .env.local

# Edit with your values
nano .env.local
```

See `ENV_SETUP.md` for detailed variable descriptions.

#### 3. Start Development Servers

```bash
# Web (Next.js) - http://localhost:3000
pnpm dev

# Or run specific workspace
cd apps/web && pnpm dev

# Mobile (Expo) - expo-go://localhost:19000
cd apps/mobile && pnpm start
```

### Staging Environment

**Web Staging**: https://staging.familyplay.app

**Mobile Staging**: Built from `develop` branch with `[mobile]` tag

**Database**: Separate Supabase project (staging-specific)

**Setup**:
1. Contact DevOps team for staging credentials
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in env
3. Deploy: `git push origin develop` (with `[mobile]` for mobile)

### Production Environment

**Web Production**: https://familyplay.app

**Mobile Production**: Released to App Store and Google Play

**Database**: Production Supabase instance with RLS enabled

**Setup**:
1. Complete verification from staging
2. Merge feature to main via PR
3. All secrets configured in GitHub Secrets
4. Zeabur auto-deploys on `git push origin main`
5. Mobile builds auto-submit (manual review step in stores)

---

## Health Checks and Monitoring

### Web Health Check Endpoint

```bash
# Zeabur uses this to verify the app is running
curl https://familyplay.app/api/health

# Expected response (200 OK):
{
  "status": "ok",
  "timestamp": "2024-06-16T12:34:56Z"
}
```

**Configuration**: `.zeabur.yaml` defines:
- Path: `/api/health`
- Interval: 30 seconds
- Timeout: 5 seconds
- Retries: 3 (service marked down after 3 failures)

### Error Tracking (Sentry)

**Dashboard**: https://sentry.io/organizations/your-org/

**Features**:
- Real-time error alerts
- Source map support (production builds hide source maps)
- Release tracking (git commit hash)
- Performance monitoring

**Configuration**:
- `SENTRY_ORG`: Set in GitHub Secrets
- `SENTRY_PROJECT`: Set in GitHub Secrets
- Auto-captured by `next.config.ts` Sentry wrapper

### Analytics (PostHog)

**Dashboard**: https://posthog.com

**Features**:
- User event tracking
- Feature flag rollout
- Session recording (optional)
- Funnel analysis

**Configuration**: Enabled via CSP allowlist in `next.config.ts`

### Performance Monitoring

**Metrics to Track**:
- Page load time (Sentry performance)
- API response times (Supabase logs)
- Database query performance (Supabase pgAdmin)
- Mobile app startup time (EAS analytics)

---

## Rollback Procedures

### Web Rollback (Zeabur)

#### Rollback Last Deployment

```bash
# 1. Go to Zeabur Console
# 2. Navigate to familyplay → web → Deployments
# 3. Find the previous successful deployment
# 4. Click "Deploy" on that version
# 5. Monitor until health check passes
```

**Duration**: ~5 minutes

**Verification**:
```bash
curl https://familyplay.app/api/health
# Should return 200 OK
```

#### Rollback via Git

If automated rollback fails:

```bash
# 1. Identify the last good commit
git log --oneline
# Find: abc123d feat: feature

# 2. Revert the problematic commit
git revert abc123d

# 3. Push to trigger re-deployment
git push origin main

# 4. Monitor Zeabur deployment
# Zeabur will build and deploy the reverted version
```

**Duration**: ~10 minutes (includes build time)

### Mobile Rollback

#### Rollback iOS (App Store)

1. Go to **App Store Connect** → **Releases**
2. Find the previous released version
3. Click "Release" if still in review, or
4. Go to **TestFlight** and re-invite testers to older build

**Note**: App Store updates cannot be instantly reverted; users will retain current version until they update.

#### Rollback Android (Google Play)

1. Go to **Google Play Console** → **Internal Testing** → **Releases**
2. Select the previous stable release
3. Click "Promote to Production"
4. Google Play will push the older version to devices

**Note**: Rollout takes ~24-48 hours to reach all users.

#### Rollback via EAS

```bash
# List available builds
eas build:list

# Find build ID of previous stable version
# Example: 12345678-1234-1234-1234-123456789012

# Re-submit that build
eas submit -p ios --build-id 12345678-1234-1234-1234-123456789012
eas submit -p android --build-id 12345678-1234-1234-1234-123456789012
```

---

## Troubleshooting

### Web Deployment Issues

#### Health Check Failing

**Symptom**: Zeabur shows "Unhealthy" status

**Diagnosis**:
```bash
# Check if app is running
curl http://localhost:3000/api/health

# Check Docker build locally
docker build -f Dockerfile -t familyplay-web .
docker run -p 3000:3000 familyplay-web

# View Zeabur logs
# Go to Zeabur Console → Deployments → View Logs
```

**Solutions**:
1. Verify `apps/web/.next/standalone/server.js` exists (build succeeded)
2. Check environment variables in Zeabur dashboard (all required vars set)
3. Verify port 3000 is not blocked
4. Check Dockerfile for errors

#### Build Timeout

**Symptom**: "Build exceeded 30 minute timeout"

**Solutions**:
1. Clean node_modules and rebuild:
   ```bash
   pnpm clean
   pnpm install
   pnpm build
   ```
2. Optimize dependencies (remove unused packages)
3. Split large packages into smaller ones
4. Request increased timeout from Zeabur support

#### Environment Variables Not Loaded

**Symptom**: "SUPABASE_URL is undefined" error

**Solutions**:
1. Verify vars in Zeabur Dashboard:
   - Go to `familyplay` project → `web` service → Settings
   - Confirm all required vars are present
2. Redeploy after adding vars (new vars take effect on next build)
3. Check var names match `process.env.VAR_NAME` in code

### Mobile Deployment Issues

#### EAS Build Failures

**Symptom**: "Build failed on iOS/Android"

**Diagnosis**:
```bash
# View detailed build logs
eas build:view 12345678-1234-1234-1234-123456789012 --logs

# Common issues:
# - Xcode version mismatch
# - Gradle configuration error
# - Certificate/signing key expired
# - Invalid provisioning profile
```

**Solutions**:
1. Check `eas.json` syntax: `eas build --dry-run`
2. Verify signing certificates are not expired
3. Ensure provisioning profiles are valid
4. Update EAS CLI: `npm install -g eas-cli@latest`

#### App Store Submission Rejected

**Symptom**: "Build rejected - Policy violation"

**Diagnosis**:
1. Go to **App Store Connect** → **Builds** → [Build] → **Review information**
2. Check rejection reason details

**Common Issues**:
- Missing privacy policy link in app metadata
- Undeclared APIs (camera, microphone, location)
- Suspicious code or security issues
- Incomplete app description or screenshots

**Solutions**:
1. Update app metadata (description, screenshots, privacy policy)
2. Verify `app.json` privacy & security settings
3. Re-submit with corrected build

#### Google Play Policy Violation

**Symptom**: "This app violates developer policy"

**Solutions**:
1. Review violation details in Play Console
2. Fix the issue in code
3. Build and submit new version
4. Appeal if you believe rejection is incorrect

### Database Issues

#### Migration Execution Failed

**Symptom**: "Error executing SQL in Supabase"

**Diagnosis**:
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy-paste migration SQL
3. Check error message

**Common Issues**:
- Column already exists
- Foreign key constraint violation
- Syntax error in SQL

**Solutions**:
1. Add `IF NOT EXISTS` to creation statements
2. Check RLS policies before dropping columns
3. Test SQL syntax in Supabase SQL Editor first

#### RLS Policy Blocking Queries

**Symptom**: "Unauthorized" error when fetching data

**Diagnosis**:
1. Verify RLS policies in **Supabase Dashboard** → **Authentication** → **Policies**
2. Check user's `auth.uid()` and role
3. Test policy with user's JWT token

**Solutions**:
1. Ensure policy matches user's auth state
2. Add debug logging to understand policy evaluation
3. Temporarily disable RLS (development only) to isolate issue

### Logs and Debugging

#### View Zeabur Logs

```bash
# Via Zeabur Console
# 1. Go to familyplay → web → Deployments
# 2. Click latest deployment
# 3. "View Logs" shows real-time output
```

#### View Sentry Errors

```bash
# Via Sentry Dashboard
# 1. Go to https://sentry.io
# 2. Select familyplay project
# 3. View recent issues with stack traces
```

#### View Supabase Logs

```bash
# Via Supabase Dashboard
# 1. Go to Supabase project
# 2. Database → Query Performance (shows slow queries)
# 3. Database → Logs (shows all database activity)
```

#### View Mobile Build Logs

```bash
# Via EAS
eas build:view [build-id] --logs
eas build:list --platform ios
eas build:list --platform android
```

---

## Checklist: Before Going to Production

- [ ] All tests pass: `pnpm turbo test`
- [ ] Type checking passes: `pnpm turbo type-check`
- [ ] Linting passes: `pnpm biome check .`
- [ ] Database migrations reviewed and tested locally
- [ ] Environment variables configured in Zeabur and GitHub Secrets
- [ ] Security headers verified in `next.config.ts`
- [ ] Sentry project configured and verified
- [ ] Health check endpoint `/api/health` responds with 200 OK
- [ ] Mobile signing certificates not expired
- [ ] App Store and Google Play metadata updated
- [ ] Privacy policy and terms of service links added
- [ ] One team member reviewed code
- [ ] PR merged to main branch
- [ ] CI/CD pipeline completes successfully
- [ ] Zeabur deployment shows "Healthy"
- [ ] Web app accessible at https://familyplay.app
- [ ] Mobile apps available in stores (within 1-2 hours)

---

## Emergency Contacts

- **Zeabur Support**: https://zeabur.com/docs
- **EAS Support**: https://expo.dev/support
- **Supabase Support**: https://supabase.com/support
- **Team Slack**: `#deployments` channel

---

## Related Documentation

- [ENV_SETUP.md](./ENV_SETUP.md) - Detailed environment variable setup
- [CLAUDE.md](../CLAUDE.md) - Project guidelines and constraints
- [Zeabur Docs](https://zeabur.com/docs) - Zeabur-specific guides
- [Expo/EAS Docs](https://docs.expo.dev) - Mobile build documentation
