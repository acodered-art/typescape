<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TypeScape — Personality Database

## Overview

Community-driven personality database at **https://typescape.walker-fg.uk** (Cloudflare tunnel). Next.js 16 App Router with PostgreSQL, Prisma 5, NextAuth v4 + custom email/password auth. Runs on the homelab ZFS pool at `/Media/typescape/`.

## Quick Start

```bash
cd /home/episteme/typescape

# Dev server (Turbopack)
npm run dev

# Build production
npm run build

# Start production server (port 3002)
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
- **ORM**: Prisma 5 (`@prisma/client` 5.22)
- **Auth**: NextAuth v4 (Google/Discord/GitHub OAuth) + custom email/password cookie sessions
- **Validation**: Zod 4
- **Styling**: Tailwind CSS v4 (PostCSS)
- **Linting**: ESLint 9 with `eslint-config-next`
- **Infrastructure**: Docker Compose (PostgreSQL, Redis, MeiliSearch) + Cloudflare tunnel

### Environment
- `.env` is gitignored — contains real secrets
- `.env.example` is tracked — template for local dev
- `INTERNAL_API_URL` should be `http://localhost:3002` for server-side fetches
- `NEXT_PUBLIC_SITE_URL` should be the public URL
- All server-side fetches hardcode `"http://localhost:3002"` directly (avoids Cloudflare loop)

### Docker Compose (3 containers)
| Container | Port | Purpose |
|-----------|------|---------|
| `typescape-db` | 5434:5432 | PostgreSQL 16, data at `/Media/typescape/pgdata/` |
| `typescape-redis` | 6381:6379 | Redis 7, data at `/Media/typescape/redis/` |
| `typescape-meilisearch` | 7710:7700 | MeiliSearch v1.12, data at `/Media/typescape/meili/` |

### Key Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Database schema (20+ models) |
| `src/lib/typing-systems.ts` | All 20 typing systems with type definitions + `SYSTEM_COLORS` |
| `src/lib/correlations.ts` | Cross-system correlation data (MBTI↔Enneagram, etc.) |
| `src/lib/achievements.ts` | Achievement definitions + `checkAchievement()` |
| `src/lib/tests.ts` | MBTI + Enneagram test questions and scoring |
| `src/lib/rate-limit.ts` | In-memory rate limiter for all write endpoints |
| `src/lib/session.ts` | Auth helper — checks both NextAuth + custom cookie |
| `src/lib/utils.ts` | `calcConsensus()`, `calcVoteWeight()`, `slugify()`, `generateSlug()` |
| `src/lib/auth.ts` | NextAuth config (Google/Discord/GitHub providers) |
| `src/lib/db.ts` | Prisma singleton (globalThis pattern) |
| `src/middleware.ts` | Security headers (CSP, X-Frame-Options, etc.) |
| `scripts/seed.ts` | Database seeder (16 profiles, 43 categories, 20 systems) |
| `src/types/index.ts` | Shared TypeScript types |
| `src/types/next-auth.d.ts` | NextAuth type augmentation |

## Code Patterns & Conventions

### API Route Pattern (Next.js 16 App Router)

**CRITICAL**: In Next.js 16, `params` is a `Promise` — must be awaited:

```typescript
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  // ...
}
```

Every API route follows this structure:
1. Import `NextResponse` from `next/server`
2. Import `prisma` from `@/lib/db`
3. For auth-gated routes: `const session = await auth()` from `@/lib/session`
4. For write routes: rate limit via `rateLimit(key, max, windowMs)` from `@/lib/rate-limit`
5. Return `NextResponse.json(data, { status })` or `NextResponse.json({ error }, { status })`

### Auth Pattern

Two auth systems coexist:

1. **NextAuth OAuth** (Google/Discord/GitHub): Uses `getServerSession(authOptions)` in `session.ts`
2. **Custom email/password**: Sets `session_token` cookie (httpOnly) + `user` cookie (non-httpOnly, JSON with `{username}`)

The `auth()` function in `src/lib/session.ts` tries NextAuth first, falls back to custom cookie. Returns `{ user: { id, username, role } }` or `null`.

The `user` cookie (non-httpOnly) is read client-side in `Header` and `FloatingAddButton` to show the signed-in state without an API call.

### Rate Limiting Pattern

In-memory `Map<string, { count, resetAt }>` — resets on server restart. Used on ALL write endpoints:

```typescript
const ip = req.headers.get("x-forwarded-for") || "unknown";
const rl = rateLimit(`endpoint-key:${ip}`, 10, 60_000); // 10 req/min
if (!rl.allowed) {
  return NextResponse.json({ error }, { status: 429 });
}
```

Rate limits per endpoint:
- Login: 5/min
- Register: 3/min
- Profile create: 3/min
- Typing submit: 20/min
- Vote: 30/min
- Comment: 10/min
- Evidence: 10/min
- Image upload: 5/min
- Test: 5/min
- Collections: 5/min
- Profile GET (non-local): 60/min

SSR self-fetches from localhost skip rate limiting (checked via `ip === "127.0.0.1"` or `ip.startsWith("172.")`).

### Server-Side Fetch Pattern

All server components fetch from `http://localhost:3002` (hardcoded, never from env):

```typescript
const base = "http://localhost:3002";
const res = await fetch(`${base}/api/profiles/${slug}`, { cache: "no-store" });
```

Every fetch is wrapped in try/catch with fallback to empty/default data. Never use the public URL for server-side fetches (avoids Cloudflare loop).

### Prisma Pattern

Singleton pattern in `src/lib/db.ts`:

```typescript
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### Client Component Pattern

All interactive components use `"use client"` directive. Common patterns:

- **Modal/overlay**: Fixed backdrop with `onClick={() => setOpen(false)}`, content div with `onClick={(e) => e.stopPropagation()}`
- **Optimistic updates**: Update state immediately, revert on API error
- **Fetch on mount**: `useEffect` + `useCallback` for stable references
- **Form submission**: `loading` state, `error` state, disabled button during submission

### Styling Pattern

Tailwind v4 with custom dark theme. Colors are inline hex values (no CSS variables in Tailwind config):

- Background: `bg-[#0a0e17]` (primary), `bg-[#0e1420]` (secondary), `bg-[#141c2b]` (tertiary)
- Borders: `border-[#1a2234]` (default), `border-[#2a3a4a]` (hover)
- Text: `text-[#e8ecf4]` (primary), `text-[#c8d0dc]` (secondary), `text-[#7888a0]` (tertiary), `text-[#4a5a70]` (muted)
- Accent: `text-[#64ffda]` / `bg-[#64ffda]/10` (cyan accent)
- Error: `text-[#ff6b6b]` / `bg-[#ff6b6b]/10`
- Font: `font-mono` (Geist Mono via `next/font/google`)

### Slug Generation

```typescript
export function generateSlug(name: string, id?: string): string {
  const base = slugify(name);
  if (!id) return base;
  return `${base}-${id.slice(0, 8)}`;
}
```

Slug uniqueness is ensured by appending first 8 chars of UUID on collision (retry loop in POST handlers).

### Consensus Calculation

```typescript
export function calcConsensus(
  votes: { voteValue: number; weight: number }[],
  minVoters = 5
): { percentage: number; weightedSum: number; totalWeight: number; voteCount: number }
```

- Returns `{ percentage: 0, ... }` if `voteCount < minVoters` (default 5)
- Scale: 0-100 percentage
- Weighted by reputation (`calcVoteWeight()`: `1.0 + (reputation / 1000) * 0.5`, capped at 3.0)

### Vote Toggle Pattern

Votes are toggle-on/toggle-off:
- Same vote value again → remove vote (toggle off)
- Different vote value → change vote
- No existing vote → create

Comment votes use a `delta` calculation for `voteCount` column updates (not weighted).

### Image Moderation

- HTTPS-only URLs (SSRF protection: blocks internal IPs, `*.local`, `*.internal`)
- Submitted images set to `imageModeration: "pending"`
- Admin approves/rejects via `/api/admin/images` PATCH
- Rejection clears `imageUrl` to null

### Sanitization

Comments are sanitized server-side in the POST handler:

```typescript
function sanitize(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/[&<>"']/g, (c) => {
    const m: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" };
    return m[c] || c;
  });
}
```

### Evidence Voting

Evidence votes are simple `voteCount: { increment: voteValue }` — NOT weighted like typing votes. Users cannot vote on their own evidence.

## Database Schema (20+ Models)

### Auth Models
- `User` — username, email, passwordHash, reputation, role (user/moderator/admin), ownType
- `Account` — NextAuth OAuth accounts
- `Session` — NextAuth + custom session tokens
- `VerificationToken` — NextAuth email verification

### Core Typing Models
- `Profile` — name, slug, categoryId, description, imageUrl (moderated), bio, externalIds (JSON), metadata (JSON), viewCount
- `TypingSystem` — name, slug, description, config (JSON — type definitions), sortOrder
- `ProfileTyping` — profileId, typingSystemId, typeValue, confidence (0-1), details (JSON), evidenceUrls[], isCommunity
- `Vote` — profileTypingId, userId, voteValue (-1/1), weight (reputation multiplier)

### Social Models
- `Comment` — profileId, parentId (threaded replies), body, voteCount, isDeleted
- `CommentVote` — commentId, userId, voteValue (-1/1)
- `Follow` — followerId, followingId
- `Activity` — userId, activityType, data (JSON)
- `ReputationEvent` — userId, eventType, points

### Organization Models
- `Category` — name, slug, parentId (tree), sortOrder, icon
- `Collection` — name, slug, userId, isPublic
- `CollectionItem` — collectionId, profileId, addedBy, note, sortOrder

### Gamification Models
- `Achievement` — slug, name, description, icon, criteria (JSON)
- `UserAchievement` — userId, achievementId
- `Streak` — userId, streakType, count, lastDate
- `DailyChallenge` — date, title, description, challengeType, target, reward
- `UserChallengeCompletion` — userId, challengeId, progress

### Other Models
- `Evidence` — profileTypingId, evidenceText, sourceUrl, sourceLabel, voteCount
- `TestResult` — userId, testType (mbti/enneagram), result, answers (JSON)
- `ModerationItem` — contentType, contentId, reason, status (pending/approved/rejected)

### Cluster Disorder Voting Models (New)
- `Disorder` — name, slug, cluster (A/B/C/none), description, sortOrder
- `DisorderComorbidity` — disorderAId, disorderBId, strength (0-1), description — edges in the co-morbidity graph
- `DisorderVote` — profileId, disorderId, userId — one vote per user per profile (unique constraint), toggle on/off, changeable

### Schema Conventions
- UUID primary keys (`@default(uuid()) @db.Uuid`)
- Snake_case column names mapped via `@map("column_name")`
- Table names mapped via `@@map("table_name")`
- Composite unique constraints for vote deduplication
- Cascade deletes on child records

## Typing Systems (20 Systems)

Defined in `src/lib/typing-systems.ts` with `TYPING_SYSTEMS` array and `SYSTEM_COLORS` map. Each system has:
- `slug`, `name`, `description`
- `types[]` — array of `{ value, label, description }`
- Optional `dimensions[]`, `wings[]`, `animals[]`, `coins[]`, `facets[]`, `levels[]`
- `config: {}` — extensible JSON

Systems are also stored in the `typing_systems` DB table. The `/api/systems` route returns DB records if they exist, otherwise falls back to `TYPING_SYSTEMS`.

**SYSTEM_COLORS** (used by `TypingBadge` component):
- mbti: `bg-[#2a3f6e] text-[#8ab4f8] border-[#3a5f8e]`
- enneagram: `bg-[#3a2a4e] text-[#d4a0f8] border-[#5a3a7e]`
- big-five: `bg-[#2a4a3e] text-[#7ddfc0] border-[#3a6a5e]`
- (and more — see `typing-systems.ts`)

## API Routes (40+ endpoints)

All under `src/app/api/`. See the full table in the existing AGENTS.md. Key patterns:

- **GET endpoints**: Query params via `new URL(req.url).searchParams`
- **POST endpoints**: `body = await req.json()`, validate required fields, return 400/401/404/409/201
- **Auth-gated**: `const session = await auth()` at top, return 401 if null
- **Admin-gated**: Check `session.user.role !== "admin"`, return 403
- **404 handling**: `findUnique` then check null
- **Conflict handling**: Check existing records before create (409 for duplicates)

### New: Cluster Disorder Voting Routes
| Route | Purpose |
|-------|---------|
| `GET /api/disorders` | List all disorders grouped by DSM cluster |
| `GET /api/disorders/comorbidities` | List comorbidity edges between disorders |
| `GET /api/profiles/[slug]/disorder-votes` | Get vote aggregation + user's vote for a profile |
| `POST /api/profiles/[slug]/disorder-votes` | Submit/change/remove a disorder vote (auth) |

## Frontend Pages (15+ routes)

| Route | Type | Purpose |
|-------|------|---------|
| `/` | Server | Homepage: stats, streaks, categories, recent profiles, trending |
| `/auth/signin` | Client | Sign in / sign up (email + Google/Discord OAuth) |
| `/profiles/[slug]` | Server | Profile detail: voting, comments, evidence, related, image upload |
| `/search` | Server | Browse with filters, sort, facets |
| `/create` | Server | Create profile with optional inline typing |
| `/collections` | Server | Browse public collections |
| `/collections/[slug]` | Server | Collection detail |
| `/collections/[slug]` | Server | Collection detail |
| `/systems` | Server | List all 20 typing systems |
| `/compare` | Server+Client | Compare two types side by side |
| `/feed` | Server+Client | Activity feed + streaks + daily challenge |
| `/test` | Server | Personality test index (MBTI + Enneagram) |
| `/test/[type]` | Client | Test questions with step-by-step UI |
| `/user/[username]` | Server | User profile: stats, achievements, typings, collections |
| `/admin` | Server+Client | Admin panel: stats, users, image moderation |
| `/categories/[...slug]` | Server | Category browse with subcategories |

### Component Architecture

**Server components** fetch data and pass to client components. **Client components** (`"use client"`) handle interactivity:

- `Header` — Nav, search bar, user state from cookie
- `ProfileCard` — Reusable card with image, name, typings, category
- `VotePanel` — Typing display with upvote/downvote, consensus %, correlation links
- `CommentSection` — Threaded comments with vote/reply
- `AddTypingForm` — Modal with system/type dropdowns
- `EvidencePanel` — Evidence list with add/vote
- `AddToCollectionInline` — Modal collection picker
- `UploadImageButton` — Modal image URL submission
- `FollowButton` — Toggle follow
- `SetOwnType` — Modal for setting own personality type
- `FloatingAddButton` — FAB for quick profile creation (signed-in only)
- `StreaksAndChallenges` — Streak display + daily challenge progress
- `ActivityFeed` — Followed users' activity
- `SearchFilters` — Faceted sidebar filters
- `CompareForm` — Type comparison form
- `CreateCollectionButton` — Modal collection creation
- `CreateProfileForm` — Full profile creation form with category search + optional inline typing
- `TypingBadge` — Colored badge linking to search
- `DisorderVotePanel` — Cluster disorder voting with % breakdown, co-morbidity graph, per-cluster grouping

## Security

- Rate limiting on all write endpoints (3-30 req/min per IP)
- XSS sanitization on all text input (HTML tag stripping + entity encoding)
- CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy headers
- Username regex validation `[a-zA-Z0-9_-]`
- Passwords hashed with bcrypt (12 rounds)
- Passwords never returned in API responses
- Session cookies are httpOnly in production
- Image URLs blocked for internal IPs (SSRF protection)
- Self-vote prevention on comments and evidence
- Admin-only routes check `session.user.role !== "admin"`

## Key Gotchas

### Next.js 16 Specific
- **`params` is a Promise**: Must `await params` in every route handler and page. The type is `{ params: Promise<{ ... }> }`.
- **`searchParams` is a Promise**: In pages, `searchParams` is `Promise<Record<string, string | string[] | undefined>>`.
- **`allowedDevOrigins`**: Set in `next.config.ts` to allow Cloudflare tunnel in dev mode (`typescape.walker-fg.uk`).
- **Server-side fetch URLs**: Must use `http://localhost:3002` internally, NOT the public URL (avoids Cloudflare loop). Hardcoded everywhere.
- **Dev vs production**: Dev server (`npm run dev`) blocks cross-origin from Cloudflare. Always use production (`npx next start`) for tunnel access.

### Auth
- **Two auth systems coexist**: `auth()` in `session.ts` checks NextAuth OAuth first, then custom cookie. If auth fails, check which path is being used.
- **`user` cookie is non-httpOnly**: Contains `JSON.stringify({ username })` — read client-side for UI state. The `session_token` cookie is httpOnly.
- **Google OAuth**: Requires exact redirect URI `https://typescape.walker-fg.uk/api/auth/callback/google` in Google Cloud Console.
- **`.env` secrets**: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `DATABASE_URL` are all in `.env` which is gitignored.

### Typing Systems
- **Two sources of truth**: `TYPING_SYSTEMS` in `typing-systems.ts` (static) and `typing_systems` DB table (dynamic). The `/api/systems` route returns DB records if they exist, falls back to static.
- **Types stored as JSON**: `TypingSystem.config` is a JSON column containing `{ types: [...], dimensions: [...], ... }`. The `AddTypingForm` reads from `/api/systems` and maps `s.config.types` to populate dropdowns.
- **`SYSTEM_COLORS`** is exported from `typing-systems.ts` and used by `TypingBadge` — must be kept in sync with `TYPING_SYSTEMS`.

### Voting & Consensus
- **`calcConsensus` requires `minVoters`**: Default 5. Returns 0% if fewer votes. The `VotePanel` calls it with `minVoters = 0` to always show a percentage.
- **Vote weight caps at 3.0**: `calcVoteWeight()` formula: `1.0 + (reputation / 1000) * 0.5`, capped at 3.0.
- **Evidence votes are NOT weighted**: Simple increment/decrement on `voteCount` column.
- **Comment votes use delta calculation**: Toggle/change logic with `delta` for `voteCount` column update.

### Database
- **Prisma `@map` everywhere**: All columns use snake_case in DB via `@map()`. All tables use `@@map()`.
- **UUID primary keys**: `@default(uuid()) @db.Uuid` on all models.
- **JSON columns**: `config`, `details`, `externalIds`, `metadata`, `criteria`, `answers`, `data` are all Prisma `Json` type.
- **Composite unique constraints**: `@@unique([profileId, typingSystemId, typeValue, createdBy])` on typings, `@@unique([profileTypingId, userId])` on votes, etc.

### Rate Limiting
- **In-memory only**: Resets on server restart. Fine for MVP but not persistent.
- **Cleanup interval**: `setInterval` every 60s to purge expired entries.
- **SSR bypass**: Localhost IPs (`127.0.0.1`, `::1`, `172.*`) skip rate limiting on GET endpoints.

### Components
- **`SYSTEM_COLORS` must exist for every system**: The `TypingBadge` falls back to `"bg-[#1a2234] text-[#7888a0] border-[#2a3a4a]"` if a system slug isn't in the map.
- **`FloatingAddButton` only shows for signed-in users**: Reads the `user` cookie client-side.
- **`Header` reads user from cookie**: Uses `document.cookie.match()` for the `user` cookie — no API call needed.
- **Modal pattern**: Fixed overlay with `onClick={() => setOpen(false)}` on backdrop, `e.stopPropagation()` on content div. Consistent across all modals.
- **Optimistic updates**: `VotePanel` and `CommentSection` update state immediately, revert on API error.

### Other
- **`generateSlug()` appends first 8 UUID chars**: On collision, retries with `generateSlug(name, \`${Date.now()}-${attempts}\`)`.
- **Image upload blocks internal IPs**: Comprehensive SSRF protection covering `10.*`, `192.168.*`, `172.16-31.*`, `*.local`, `*.internal`, cloud metadata endpoints.
- **`sanitize()` strips HTML**: Used only on comments. Other text fields trust the client.
- **View count is non-blocking**: `prisma.profile.update(...).catch(() => {})` — fire and forget.
- **`auth()` catches all errors**: Returns `null` on any exception (not just missing session).
- **`calcConsensus` returns 0 for low votes**: If `voteCount < minVoters`, returns `{ percentage: 0, weightedSum: 0, totalWeight: 0, voteCount }`.
- **`calcVoteWeight` caps at 3.0**: `Math.min(weight, 3.0)` — reputation beyond ~4000 doesn't increase weight.

## Testing

No formal test suite. Testing is done via:

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

- Cloudflare tunnel runs as Docker container (`cloudflared`)
- Config at `/etc/cloudflared/config.yml`
- DNS at `typescape.walker-fg.uk` → tunnel
- Database at `/Media/typescape/pgdata/` (ZFS pool)
- Production server: `NODE_ENV=production npx next start -p 3002`
- Must pass `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `NEXTAUTH_URL` env vars
- Port 3002 — Cloudflare tunnel points to `localhost:3002`