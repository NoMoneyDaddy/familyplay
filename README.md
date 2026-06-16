# FamilyPlay - Parental Companion App

> 30 seconds to activity recommendations. For tired parents raising young children.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Status: MVP](https://img.shields.io/badge/Status-MVP-blue.svg)](CURRENT_SPRINT.md)

---

## Features

### Core Functionality
- **Instant Recommendations** - Select parent state → get 5 activity ideas in 30 seconds
- **9 Developmental Stages** - Newborn to Preschooler+ (0-60 months)
- **Activity Logging** - Track outcomes, child reactions, duration
- **Multi-Family Support** - Invite caregivers with role-based access
- **Freemium Model** - Free + Supporter + Plus (AI-enhanced)

### Technology
- **Web:** Next.js 15 + React 19 (PWA)
- **Mobile:** Expo 52 (iOS + Android)
- **Backend:** Node.js serverless (Zeabur)
- **Database:** Supabase Postgres with Row-Level Security
- **AI:** Multi-provider (Claude, OpenAI, Gemini)

---

## Documentation

- **[docs/README.md](docs/README.md)** - Project overview
- **[docs/SETUP.md](docs/SETUP.md)** - Local development setup
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System design
- **[docs/API.md](docs/API.md)** - API reference
- **[docs/FEATURES.md](docs/FEATURES.md)** - Feature walkthrough
- **[docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md)** - WCAG compliance
- **[CLAUDE.md](CLAUDE.md)** - Development rules
- **[CHANGELOG.md](CHANGELOG.md)** - Version history

---

## Quick Start

```bash
pnpm install
supabase start
cp .env.example .env.local
pnpm db:types
pnpm dev
```

See [docs/SETUP.md](docs/SETUP.md) for detailed setup.

---

## Status

**MVP: Core API 100% complete | UI pending for launch**

- Recommendation engine: ✅ Complete
- API infrastructure: ✅ Complete (20+ endpoints)
- Database schema: ✅ Complete (RLS enforcement)
- Web UI: 🚧 In progress
- Mobile UI: 🚧 In progress

---

## License

Proprietary - FamilyPlay, Inc.
