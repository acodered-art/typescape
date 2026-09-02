<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TypeScape — Personality Database

## Overview
Community-driven personality database at **https://typescape.walker-fg.uk** (Cloudflare tunnel). Next.js 16 app with PostgreSQL, running on the homelab ZFS pool at `/Media/typescape/`.

## Quick Start

```bash
cd /home/episteme/typescape

# Start dev server
npm run dev

# Build production
npm run build

# Start production server
NODE_ENV=production npx next start -p 3002

# Full rebuild + start
AUTH_GOOGLE_ID="..." AUTH_GOOGLE_SECRET="..." NEXTAUTH_URL="https://typescape.walker-fg.uk" bash -c 'npm run build && NODE_ENV=production npx next start -p 3002'

# Re-seed database
npx tsx scripts/seed.ts

# Push schema changes
npx prisma db push --accept-data-loss

# Regenerate Prisma client
npx prisma generate
```

## Architecture

### Stack
- **Frontend/Backend**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL 16 via Docker (port 5434)
- **ORM**: Prisma 5
- **Auth**: NextAuth v4 (OAuth) + custom email/password cookie sessions
- **Deploy**: Docker Compose (db only) + Cloudflare tunnel (cloudflared in Docker)

### Environment
- `.env` file is gitignored — contains real secrets
- `.env.example` is tracked — template for local dev
- `INTERNAL_API_URL` should be `http://localhost:3002` for server-side fetches
- `NEXT_PUBLIC_SITE_URL` should be the public URL

### Key Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema (15+ models) |
| `src/lib/typing-systems.ts` | All 20 typing systems with type definitions |
| `src/lib/correlations.ts` | Cross-system correlation data |
| `src/lib/achievements.ts` | Achievement definitions |
| `src/lib/tests.ts` | MBTI + Enneagram test questions and scoring |
| `src/lib/rate-limit.ts` | In-memory rate limiter for all write endpoints |
| `src/lib/session.ts` | Auth helper (checks both NextAuth + custom cookie) |
| `src/lib/utils.ts` | Consensus calc, vote weight, slug generation |
| `src/middleware.ts` | Security headers (CSP, X-Frame-Options, etc.) |
| `scripts/seed.ts` | Database seeder (16 profiles, 43 categories, 20 systems) |
| `docker-compose.yml` | PostgreSQL, Redis, MeiliSearch containers |
| `COMPETITIVE-ANALYSIS.md` | PDB feature comparison |
| `FEATURE-BRAINSTORM.md` | Future feature ideas |

### Database Models
User, Account, Session, VerificationToken (auth)
Profile, ProfileTyping, Vote (core typing)
Comment, CommentVote (discussion)
Category, Collection, CollectionItem (organization)
Evidence (citations for typings)
Achievement, UserAchievement (gamification)
TestResult (personality tests)
DailyChallenge, UserChallengeCompletion (daily quests)
Streak, Follow, Activity, ReputationEvent, ModerationItem (social)

## API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/register` | Create account |
| `POST /api/login` | Sign in, sets session cookie |
| `POST /api/signout` | Clear session |
| `GET /api/me` | Current user (from cookie) |
| `PUT /api/me/type` | Set own personality type |
| `GET /api/profiles` | List/search profiles (sort, type, category, types filters) |
| `POST /api/profiles` | Create profile (auth) |
| `GET /api/profiles/[slug]` | Profile detail with typings + votes |
| `POST /api/profiles/[slug]/typings` | Submit a typing (auth) |
| `POST /api/profiles/[slug]/image` | Submit image URL (auth, moderated) |
| `GET /api/profiles/[slug]/comments` | List comments |
| `POST /api/profiles/[slug]/comments` | Post comment (auth, sanitized) |
| `GET /api/profiles/[slug]/related` | Same-category profiles |
| `POST /api/typings/[tid]/vote` | Vote on typing (auth) |
| `POST /api/comments/[id]/vote` | Vote on comment (auth) |
| `GET /api/categories` | List categories (top-level or by slug) |
| `POST /api/categories/create` | Create category (auth) |
| `GET /api/collections` | List public collections |
| `POST /api/collections` | Create collection (auth) |
| `GET/DELETE/PATCH /api/collections/[slug]` | Collection CRUD |
| `POST/DELETE /api/collections/[slug]/items` | Add/remove profile from collection |
| `GET /api/systems` | List typing systems |
| `GET /api/correlations` | Cross-system type correlations |
| `GET /api/compare` | Compare two types |
| `GET /api/evidence` | List evidence for a typing |
| `POST /api/evidence` | Add evidence (auth) |
| `POST /api/evidence/[id]/vote` | Vote on evidence |
| `GET /api/facets` | Category and type facet counts |
| `GET /api/stats` | Site statistics |
| `GET /api/feed` | Activity feed from followed users (auth) |
| `POST /api/follow/[username]` | Toggle follow (auth) |
| `GET/POST /api/streaks` | User streaks (auth) |
| `GET/POST /api/daily-challenge` | Daily challenge (auth) |
| `GET/POST /api/achievements` | User achievements (auth) |
| `POST /api/test` | Save test result (auth) |
| `GET /api/admin/stats` | Admin stats |
| `GET /api/admin/users` | Admin user list |
| `GET /api/admin/images` | Pending image approvals |
| `PATCH /api/admin/images` | Approve/reject image |

## Frontend Pages

| Route | Purpose |
|-------|---------|
| `/` | Homepage: stats, streaks, categories, recent profiles, trending |
| `/auth/signin` | Sign in / sign up (email + Google OAuth) |
| `/profiles/[slug]` | Profile detail: voting, comments, evidence, related, image upload |
| `/search` | Browse with filters, sort, facets |
| `/create` | Create profile with optional inline typing |
| `/collections` | Browse public collections |
| `/collections/[slug]` | Collection detail |
| `/systems` | List all 20 typing systems |
| `/compare` | Compare two types side by side |
| `/feed` | Activity feed + streaks + daily challenge |
| `/test` | Personality tests (MBTI + Enneagram) |
| `/test/[type]` | Test questions |
| `/user/[username]` | User profile: stats, achievements, typings, collections |
| `/admin` | Admin panel: stats, users, image moderation |
| `/categories/[...slug]` | Category browse |

## Security
- Rate limiting on all write endpoints (3-30 req/min per IP)
- XSS sanitization on all text input
- CSP, X-Frame-Options, X-Content-Type-Options headers
- Username regex validation `[a-zA-Z0-9_-]`
- Passwords hashed with bcrypt (12 rounds)
- Passwords never returned in API responses
- Session cookies are httpOnly in production

## Key Gotchas
- **Server-side fetch URLs**: Must use `http://localhost:3002` internally, NOT the public URL (avoids Cloudflare loop). After rebuild, all `src/app/**` files use `"http://localhost:3002"` directly.
- **Auth system**: `auth()` in `src/lib/session.ts` checks both NextAuth OAuth AND custom cookie sessions. If auth fails, check which path is being used.
- **Typing systems in DB**: Types are stored in `config.types` JSON. The `AddTypingForm` reads from `/api/systems` and maps `s.config.types` to populate dropdowns.
- **Production vs dev**: Dev server (`npm run dev`) blocks cross-origin from Cloudflare. Always use production (`npx next start`) for tunnel access.
- **Port**: The server runs on port 3002. Cloudflare tunnel points to `localhost:3002`.
- **Google OAuth**: Requires exact redirect URI `https://typescape.walker-fg.uk/api/auth/callback/google` in Google Cloud Console.
- **`.env` secrets**: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `DATABASE_URL` are all in `.env` which is gitignored.

## Testing
```bash
# Full flow test
node -e "
async function test() {
  const base = 'http://localhost:3002';
  // Register, login, create profile, check pages...
}
test().catch(console.error);
"

# API test
node -e "
const r = await fetch('http://localhost:3002/api/stats');
const d = await r.json();
console.log(d);
"
```

## Deployment
- Cloudflare tunnel runs as Docker container: `cloudflared`
- Config at `/etc/cloudflared/config.yml`
- DNS at `typescape.walker-fg.uk` → tunnel
- Database at `/Media/typescape/pgdata/` (ZFS pool)
- Production server started with: `NODE_ENV=production npx next start -p 3002`
- Must pass `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL` env vars