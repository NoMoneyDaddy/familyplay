# FamilyPlay Architecture

## System Overview

FamilyPlay is a multi-platform app with serverless backend emphasizing privacy (Row-Level Security) and deterministic recommendations.

```
Web (Next.js)       Mobile (Expo)
    └──────┬──────────┘
           │
    ┌──────▼──────────┐
    │   Backend API   │
    │  (20+ routes)   │
    └──────┬──────────┘
           │
    Supabase Postgres
    (RLS Policies)
```

---

## Recommendation Engine (7 Steps)

**Step 1:** Age safety (exclude unsafe activities)
**Step 2:** Context safety (bedtime, mood-aware)
**Step 3:** Capability match (child has required skills)
**Step 4:** ZPD scoring (boost developing skills)
**Step 5:** Situation filter (energy, space, resources, time)
**Step 6:** Priority sort (cost, cleanup, prep time)
**Step 7:** Recency dampen (reduce 30% if shown in 7 days)

Result: 1-5 activities ranked by score with reasoning.

---

## Database Schema

**Core Tables (12):**
- user_profiles - Parent accounts
- households - Family units
- household_members - Role-based access (owner, caregiver, viewer)
- child_profiles - Child records with stage calculation
- child_capability_profiles - Capability status + ZPD targets
- companion_activities - 1000+ activity library
- companion_logs - Activity history with outcomes
- household_invites - 24-hour shareable invite tokens
- entitlements - Plan tracking (free, supporter, plus)
- handoff_summaries - Caregiver handoff notes
- app_configs - Global configuration
- sponsor_cards - Sponsored content

**RLS Security:** All sensitive tables enforce Row-Level Security. Users can only access their household data.

---

## API Endpoints (20+)

### Authentication
- POST /api/auth/email - Register/login
- POST /api/auth/google - OAuth callback
- POST /api/auth/reset-password - Password reset
- POST /api/auth/logout - Logout

### Children
- GET /api/children/list - List children
- POST /api/children - Create child
- PATCH /api/children/[id] - Update child
- DELETE /api/children/[id] - Delete child

### Recommendations
- POST /api/recommendations - Get 5 activities
- GET /api/capabilities - List all capabilities

### Logging
- POST /api/log - Log activity
- GET /api/logs - View history
- PATCH /api/logs/[id] - Edit log

### Households
- POST /api/households/invites - Create invite
- POST /api/households/invites/accept - Accept invite
- GET /api/households/members - List members

### Account
- GET /api/account/entitlements - Check plan
- GET /api/profile - User profile

**All endpoints:**
- Validate input with Zod schemas
- Check RLS permissions
- Are rate limited
- Return consistent JSON responses

---

## Data Flow

### Get Recommendations
1. Parent selects: energy level, context, time, resources, mood
2. POST /api/recommendations with validation
3. Engine loads child data, activity library, recent logs
4. Runs 7-step algorithm
5. Returns sorted array of activities with scores

### Log Activity
1. Parent selects outcome, reaction, optional notes
2. POST /api/log with validation
3. Verified against child/household ownership
4. Saved to database with timestamp
5. Returns next batch of recommendations

---

## Security

**Row-Level Security (RLS)**
- Every sensitive table has policies
- Users can only access their household data
- Caregivers have edit permissions

**Input Validation**
- All endpoints use Zod schemas
- Enum whitelist validation
- UUID validation before queries

**Sensitive Data**
- API keys never logged
- Child names/birthdates never sent to AI
- Activity notes encrypted for Plus users

**Rate Limiting**
- 100 req/min per user (standard)
- 10 req/min per user (AI endpoints)
- 30 calls/month quota for Plus

---

## Deployment

**Production:** Push to main → Zeabur auto-builds + deploys (Taiwan node)

**Development:** Local Supabase + Next.js dev server

---

## Testing

- Engine algorithm tests (all 7 steps)
- Capability assessment tests
- RLS policy verification
- Permission enforcement
- Rate limiting validation

---

See docs/API.md for complete endpoint reference.
