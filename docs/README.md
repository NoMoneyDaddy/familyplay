# FamilyPlay - Project Overview

FamilyPlay is a parental companion app that delivers activity recommendations in 30 seconds based on parent state and child development stage.

**Mission:** Help tired parents find immediate, actionable activities for young children (0-60 months) across web, iOS, and Android platforms.

---

## Core Features

- **Instant Recommendations** - 7-step algorithm delivers 5 curated activities
- **Child Development Tracking** - 9 stages, 50+ capabilities
- **Activity Logging** - Record outcomes and reactions
- **Multi-Family Support** - Invite caregivers with role-based access
- **Freemium Model** - Free, Supporter, Plus (AI) tiers

---

## Architecture

### Recommendation Engine (7 Steps)
1. Age safety filtering
2. Context safety rules (bedtime, mood)
3. Capability matching
4. ZPD scoring (developing skills)
5. Situation filtering (energy, resources, time)
6. Priority sorting (cost, cleanup, prep)
7. Recency dampening (7-day history)

### API Infrastructure
- **20+ Endpoints** - Auth, children, recommendations, logging, households
- **All Validated** - Zod schemas + RLS permission checks
- **Rate Limited** - 100 req/min standard, 10 req/min for AI

### Database
- **12 Tables** - Fully normalized with RLS policies
- **Supabase Postgres** - Row-Level Security on all sensitive data
- **Deterministic** - No randomness, fully auditable

---

## Development Status

**Completed (Sprints 1-4):**
- Recommendation engine + tests
- All API endpoints
- Database schema with RLS
- Comprehensive documentation

**In Progress:**
- Web UI (forms, flows)
- Mobile app (Expo)
- Payment integration
- AI generation UI

---

## Documentation Files

See [../docs/](../docs/) for:
- [SETUP.md](SETUP.md) - Local development (5 min setup)
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design + database schema
- [API.md](API.md) - Complete endpoint reference with curl examples
- [FEATURES.md](FEATURES.md) - Feature walkthrough + testing checklist

---

## Roadmap

| Sprint | Focus | Status |
|--------|-------|--------|
| 1-4 | Core engine + API | ✅ Complete |
| 5-6 | Web/Mobile UI | 🚧 In progress |
| 7-8 | Native features | 📋 Planned |
| 9-10 | AI + advanced | 📋 Planned |
| 11+ | Scale + launch | 📋 Planned |

---

## License

Proprietary - FamilyPlay, Inc.
