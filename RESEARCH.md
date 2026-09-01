# TypeScape — Personality Database Alternative

## Research & Project Plan
**Date:** 2026-09-01
**Author:** DeepSeek + Crush

---

## Table of Contents

1. [Market Analysis](#1-market-analysis)
2. [Competitor Deep-Dive: Personality Database](#2-competitor-deep-dive-personality-database)
3. [Core Feature Set](#3-core-feature-set)
4. [Typing Systems & Data Model](#4-typing-systems--data-model)
5. [Technical Architecture](#5-technical-architecture)
6. [Database Schema](#6-database-schema)
7. [API Design](#7-api-design)
8. [Community & Moderation Systems](#8-community--moderation-systems)
9. [SEO Strategy](#9-seo-strategy)
10. [Monetization](#10-monetization)
11. [Roadmap & Milestones](#11-roadmap--milestones)
12. [Open Datasets & References](#12-open-datasets--references)

---

## 1. Market Analysis

### The Landscape

The personality typing community is fragmented across several site types:

| Category | Examples | Strengths | Weaknesses |
|----------|----------|-----------|------------|
| **Typing Databases** | Personality Database (PDB) | Crowdsourced, broad coverage, free | Poor moderation, no scientific rigor, dated UX |
| **Test Platforms** | 16Personalities, Truity, IDRlabs | Scientific, polished UX | No community content, paywalled, no character DB |
| **Forums** | Reddit (r/MBTI, r/Enneagram), Typology Central | Active discussion, passionate users | No structured data, hard to find consensus, no voting |
| **Blogs** | Personality Junkie, TraitPath | In-depth analysis | No database, no community features |

### Gap Analysis

PDB dominates the "character/celebrity typing database" niche but has **no serious modern competitor**. Key gaps:

1. **No modern UX** — PDB is cluttered, mobile-unfriendly, visually dated
2. **Weak moderation** — vandalism, inaccurate profiles, no expert curation
3. **No cross-system intelligence** — no correlation maps between MBTI/Enneagram/Big Five
4. **No API** — data is locked inside the platform; no third-party integrations
5. **No scientific layer** — no citations, no sourced evidence for typings
6. **Poor SEO** — user-generated content not optimized for discoverability
7. **No personalization** — no "compare your type" or tailored recommendations

### Opportunity

> A modern, open, community-driven personality database with API-first architecture, robust moderation, and cross-system correlation intelligence.

Target audience: 3+ million monthly active PDB users + Reddit typology communities (r/MBTI: 500k+, r/Enneagram: 150k+, r/PersonalityTypes: 100k+).

---

## 2. Competitor Deep-Dive: Personality Database

### How PDB Works

**Core loop:**
1. Users create profiles for characters/celebrities with personality type assignments
2. Community votes on accuracy → consensus percentage displayed
3. Comments debate the typing with evidence (quotes, behaviors)
4. Profiles organized by hierarchical categories (Anime → Naruto → Characters → Naruto)

**Typing systems supported:**
- MBTI (16 types) — primary system
- Enneagram (9 types + wings + instinctual variants)
- Big Five (OCEAN) — less commonly used
- Temperament (Keirsey)
- Socionics (16 types)

**Voting system:**
- Upvote/downvote per type assignment
- Aggregated consensus % displayed
- No weighted voting (new users equal to veterans)

### PDB Weaknesses to Exploit

| Weakness | Opportunity |
|----------|-------------|
| No weighted voting | Reputation-based voting power |
| No citation/source system | Evidence-linked typings with sources |
| Flat category system | Rich taxonomy with cross-linking |
| No API | Public REST API + webhooks |
| No cross-system correlation | Smart suggestions ("INFJs are often Type 4") |
| Manual profile creation | Bulk import tools, Wikidata integration |
| No real-time updates | WebSocket-driven live consensus |
| Spam/vandalism problems | Tiered moderation + automated detection |
| No mobile app | PWA-first, native wrappers |
| No user profiles | Rich profiles with typing history, comparison tools |

---

## 3. Core Feature Set

### Phase 1 — MVP ("Typing Database")

- [x] User accounts (email, OAuth — Google, Discord, GitHub)
- [x] Profile pages (characters, celebrities, archetypes)
- [x] Multi-system typing (MBTI + Enneagram + Big Five)
- [x] Voting system (upvote/downvote with consensus %)
- [x] Comments/threaded discussion
- [x] Category hierarchy browsing
- [x] Search (full-text, type filters)
- [x] Reputation system (karma, badges)
- [x] Moderation tools (flagging, reporting, auto-moderation)
- [x] Admin dashboard

### Phase 2 — Intelligence Layer

- [ ] Cross-system correlation engine ("INFJs are often Enneagram 4w5")
- [ ] Character comparison tool (side-by-side type breakdown)
- [ ] "Users who typed this also typed..." recommendations
- [ ] Evidence/source system (cite quotes, scenes, behaviors)
- [ ] Wikidata/Wikipedia integration for biography data
- [ ] Bulk import tool (via Wikidata API)
- [ ] Typing statistics dashboard (most voted, most controversial)

### Phase 3 — Community & Social

- [ ] Follow profiles/users
- [ ] Collections/playlists ("Villains I've typed")
- [ ] Debates (structured pro/con arguments on type assignments)
- [ ] User typing profiles (set your own type, see compatibility)
- [ ] Personality tests (linked external tests + optional built-in)
- [ ] Discussion forums (per type, per category)

### Phase 4 — Platform

- [ ] Public REST API + API keys for developers
- [ ] Webhooks (profile updated, new vote threshold reached)
- [ ] Embeddable widgets ("TypeCard" for external sites)
- [ ] Mobile PWA with offline support
- [ ] i18n (multi-language support)
- [ ] OAuth provider (let users log in via TypeScape)

---

## 4. Typing Systems & Data Model

### Supported Systems

| System | Dimensions | Values | Notes |
|--------|-----------|--------|-------|
| **MBTI** | 4 binaries | E/I, S/N, T/F, J/P → 16 types | Cognitive functions model optional |
| **Enneagram** | 1 core + wing | 1-9, w5/w6/w7/w8/w9/w1/w2/w3/w4 | Stress/security arrows tracked |
| **Big Five** | 5 continuous | 0-100 per dimension | OCEAN: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism |
| **Socionics** | 4 binaries + quadra | INTj, ESE, etc. + Alpha/Beta/Gamma/Delta | Model A functions |
| **Temperament** | 4 types | Artisan, Guardian, Idealist, Rational | Keirsey |
| **Instinctual Variants** | 3 stackings | Social, Sexual, Self-Preservation | Per Enneagram type |
| **Attitudinal Psyche** | 4 types | 1-4 per function (LEVF, etc.) | Volition, Logic, Emotion, Physics |
| **Big Three** | 3 types | Harmonic, Aggressive, Dependent | Karen Horney's model |

### Cross-System Correlation Engine

Store known correlations from research/aggregation:

```json
{
  "mbti": "INFJ",
  "enneagram_common": ["4w5", "5w4", "1w9"],
  "enneagram_percentages": {"4w5": 0.45, "5w4": 0.30, "1w9": 0.15},
  "big_five_tendency": {"O": 85, "C": 45, "E": 35, "A": 60, "N": 55},
  "sources": ["https://typologytriad.wordpress.com/mbti-enneagram-correlations"]
}
```

When a user assigns MBTI=INFJ, the system automatically suggests likely Enneagram types and shows correlation data.

---

## 5. Technical Architecture

### Stack Recommendation

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│  Next.js 15 (App Router) + TypeScript + Tailwind     │
│  React Server Components + TanStack Query            │
│  PWA: next-pwa + service worker                      │
│  Charts: Recharts (voting breakdowns)                │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP/WebSocket
┌─────────────────────▼───────────────────────────────┐
│                    API Layer                          │
│  Next.js API Routes (or FastAPI/Django Ninja)        │
│  GraphQL (optional, for complex queries)             │
│  Rate limiting: upstash/redis                        │
│  Auth: NextAuth.js (OAuth providers)                 │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 Services                              │
│  PostgreSQL 16 (primary DB)                          │
│  Redis 7 (cache, votes, rate limits, sessions)       │
│  MeiliSearch (full-text search, typo-tolerant)       │
│  MinIO (user avatars, profile images)                │
│  Bull/Redis Queues (async tasks, imports)            │
└─────────────────────────────────────────────────────┘
```

### Why Next.js (monolith approach — one language, deploy anywhere)

- **SSR/SSG** for SEO — every profile page is a static path
- **API routes** — backend and frontend in one deploy
- **Server Components** — reduced client JS, faster loads
- **Middleware** — auth guards, rate limiting at edge
- **Deploy anywhere** — Vercel, Docker, bare metal

Alternative: Django + DRF/Ninja (Python) if the homelab stack suggests Python advantage. Given your existing homelab is Python-heavy, **FastAPI** may be the better backend choice while keeping Next.js for frontend SSR.

### Deployment

**Option A: Homelab (Docker)**
- Docker Compose with PostgreSQL, Redis, MeiliSearch
- Next.js container, API container
- Cloudflare tunnel for public access (`typescape.walker-fg.uk`)
- Backup via existing restic pipeline

**Option B: Hybrid**
- Frontend on Vercel (free tier, global CDN)
- Backend on homelab or Railway
- Better for global latency, worse for integration complexity

**Recommendation:** Start homelab-only for v0, move to hybrid as traffic grows.

---

## 6. Database Schema

### Core Tables

```sql
-- Users
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    TEXT NOT NULL UNIQUE,
    email       TEXT UNIQUE,
    password_hash TEXT,
    avatar_url  TEXT,
    bio         TEXT,
    reputation  INTEGER DEFAULT 0,
    role        TEXT DEFAULT 'user' -- user, moderator, admin
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- OAuth connections
CREATE TABLE oauth_accounts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    provider    TEXT NOT NULL, -- google, discord, github
    provider_id TEXT NOT NULL,
    UNIQUE(provider, provider_id)
);

-- Social login sessions
CREATE TABLE sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at  TIMESTAMPTZ NOT NULL
);

-- Categories (tree structure)
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id   UUID REFERENCES categories(id),
    sort_order  INTEGER DEFAULT 0,
    icon        TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Profiles (characters, celebrities, archetypes)
CREATE TABLE profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    category_id UUID REFERENCES categories(id),
    description TEXT,
    image_url   TEXT,
    bio         TEXT, -- sourced biography/extract
    external_ids JSONB, -- {wikidata: "Q...", imdb: "...", wikipedia: "..."}
    metadata    JSONB, -- {born: "...", occupation: "...", ...}
    created_by  UUID REFERENCES users(id),
    is_verified BOOLEAN DEFAULT false, -- canon typing from source?
    view_count  INTEGER DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Typing system definitions
CREATE TABLE typing_systems (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE, -- MBTI, Enneagram, Big Five, etc.
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    config      JSONB NOT NULL -- type definitions, dimensions, metadata
);

-- Type assignments (a profile's typing in one system)
CREATE TABLE profile_typings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
    typing_system_id UUID REFERENCES typing_systems(id),
    type_value      TEXT NOT NULL, -- "INFP", "4w5", "O:85 C:70..."
    confidence      REAL DEFAULT 1.0, -- aggregate consensus 0-1
    details         JSONB, -- wing, instinctual stack, function order, etc.
    evidence_urls   TEXT[], -- sources supporting this typing
    is_community    BOOLEAN DEFAULT true, -- false if verified canon
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_id, typing_system_id, type_value, created_by)
);

-- Votes on type assignments
CREATE TABLE votes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_typing_id UUID REFERENCES profile_typings(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
    vote_value      SMALLINT NOT NULL CHECK (vote_value IN (-1, 1)),
    weight          REAL DEFAULT 1.0, -- reputation multiplier
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_typing_id, user_id)
);

-- Comments
CREATE TABLE comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES comments(id), -- threaded replies
    user_id         UUID REFERENCES users(id),
    body            TEXT NOT NULL,
    vote_count      INTEGER DEFAULT 0,
    is_deleted      BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- User reputation log
CREATE TABLE reputation_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    event_type  TEXT NOT NULL, -- profile_created, upvote_received, etc.
    points      INTEGER NOT NULL,
    reference_id UUID, -- polymorphic: profile_id, comment_id, etc.
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Moderation queue
CREATE TABLE moderation_queue (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type TEXT NOT NULL, -- profile, comment, typing
    content_id  UUID NOT NULL,
    flagged_by  UUID REFERENCES users(id),
    reason      TEXT,
    status      TEXT DEFAULT 'pending', -- pending, approved, rejected
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Activity feed
CREATE TABLE activities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id),
    activity_type TEXT NOT NULL, -- created_profile, voted, commented
    data        JSONB,
    created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Indexes

```sql
CREATE INDEX idx_profiles_slug ON profiles(slug);
CREATE INDEX idx_profiles_category ON profiles(category_id);
CREATE INDEX idx_profiles_search ON profiles USING GIN(to_tsvector('english', name || ' ' || COALESCE(bio, '')));
CREATE INDEX idx_profile_typings_type ON profile_typings(typing_system_id, type_value);
CREATE INDEX idx_profile_typings_profile ON profile_typings(profile_id);
CREATE INDEX idx_votes_typing ON votes(profile_typing_id);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_comments_profile ON comments(profile_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_activities_user ON activities(user_id);
CREATE INDEX idx_activities_time ON activities(created_at DESC);
```

---

## 7. API Design

### RESTful v1 API

```yaml
openapi: 3.1.0
info:
  title: TypeScape API
  version: 1.0.0

paths:
  # Profiles
  GET    /api/v1/profiles                    # List/search profiles
  POST   /api/v1/profiles                    # Create profile
  GET    /api/v1/profiles/{slug}             # Get profile with all typings
  PATCH  /api/v1/profiles/{id}               # Update profile
  DELETE /api/v1/profiles/{id}               # Soft-delete profile

  # Typings
  GET    /api/v1/profiles/{id}/typings       # Get all typings for profile
  POST   /api/v1/profiles/{id}/typings       # Submit a typing
  PATCH  /api/v1/profiles/{id}/typings/{tid} # Update typing
  DELETE /api/v1/profiles/{id}/typings/{tid} # Remove typing

  # Voting
  POST   /api/v1/typings/{id}/vote           # Vote (up/down/neutral)

  # Comments
  GET    /api/v1/profiles/{id}/comments      # List comments
  POST   /api/v1/profiles/{id}/comments      # Create comment

  # Systems
  GET    /api/v1/systems                     # List typing systems
  GET    /api/v1/systems/{slug}/types        # List types in a system

  # Search
  GET    /api/v1/search?q=&type=&category=   # Full-text search

  # Users
  GET    /api/v1/users/{id}/activity         # User activity feed
  GET    /api/v1/users/{id}/statistics       # User typing stats

  # Moderation
  POST   /api/v1/moderation/flag             # Flag content
  GET    /api/v1/moderation/queue            # Get queue (admin)

  # Meta
  GET    /api/v1/stats                       # Site statistics
  GET    /api/v1/trending                    # Trending profiles
```

### GraphQL (Future — Phase 4)

For complex queries like "find all INTJ fictional characters tagged as villain, ordered by most votes":

```graphql
query {
  profiles(
    filter: {
      typing: { system: "mbti", type: "INTJ" }
      tags: ["villain"]
    }
    orderBy: { field: VOTE_COUNT, direction: DESC }
    limit: 20
  ) {
    name
    slug
    imageUrl
    typings {
      system { slug }
      typeValue
      confidence
    }
  }
}
```

---

## 8. Community & Moderation Systems

### Reputation Model

| Action | Points | Notes |
|--------|--------|-------|
| Create profile | +5 | Capped daily |
| Submit typing | +3 | Per system |
| Get upvote on typing | +2 | Per vote |
| Comment | +1 | Capped daily |
| Get upvote on comment | +1 | Per vote |
| Flag bad content | +1 | If actioned |
| Report accuracy | +2 | "Disagree" with reasoning |

**Reputation tiers:**

| Tier | Points | Privileges |
|------|--------|------------|
| New | 0-49 | 5 votes/day, no edit |
| Regular | 50-499 | 20 votes/day, edit own |
| Trusted | 500-4999 | 50 votes/day, edit any, flag |
| Moderator | 5000+ | Vote weight 2x, approve edits |
| Admin | Invite | Full access |

### Voting Weight Algorithm

```
vote_weight = 1.0 + (user_reputation / 1000) * 0.5
vote_weight = min(vote_weight, 3.0)  # cap at 3x
```

### Consensus Calculation

```
For each type_value in a system for a profile:
  weighted_sum = SUM(vote.vote_value * vote.weight)
  total_weight = SUM(ABS(vote.vote_value) * vote.weight)
  confidence = (weighted_sum + total_weight) / (2 * total_weight)  # 0-1 scale

  normalized = confidence * 100  # display as percentage
```

A type_value needs at least 5 unique voters to show a consensus percentage.

### Moderation Pipeline

1. **Automated** (pre-submit):
   - Profanity/spam filter
   - Duplicate detection (similar name + category)
   - Rate limit check
2. **Community** (post-submit):
   - Flag system for profiles, comments, typings
   - Auto-flag if 3+ flags in 1 hour
3. **Moderator** (review):
   - Queue for auto-flagged + user-reported content
   - Bulk actions for common patterns
4. **Admin** (appeal):
   - Final review on disputed decisions

### Content Controversy Detection

```
controversy_score = MIN(upvotes, downvotes) / MAX(upvotes, downvotes, 1)
```

If controversy_score > 0.3 (30%+ disagreement), the profile gets a "Disputed" banner showing both leading types side-by-side.

---

## 9. SEO Strategy

### Technical SEO

| Technique | Implementation |
|-----------|---------------|
| SSR/ISR | Next.js incremental static regeneration per profile |
| Structured data | Schema.org `Person` or `CreativeWork` for profiles |
| Canonical URLs | Per profile/slug, no query params |
| Sitemap | Dynamic sitemap.xml for all profiles (>10k paths) |
| Robots.txt | Disallow /api/*, /auth/* |
| Open Graph | Rich cards for social sharing (image + type breakdown) |
| Breadcrumbs | Category > Subcategory > Profile |
| Pagination | `rel=next`/`prev` for category pages |

### Content Strategy for SEO

- **Category landing pages** — "INTJ Anime Characters" — rich, keyword-targeted
- **Type pages** — /types/mbti/infp — all INFP profiles + type description
- **System pages** — /systems/enneagram — overview of Enneagram on the site
- **Profile pages** — naturally keyword-rich (name + type + category)
- **Titles:** "Name (MBTI) | Personality Type, Enneagram" — e.g., "Shinji Ikari (INFP) | Personality Type, Enneagram 4w5"

### Keyword Targets

| Keyword | Volume (est.) | Competition |
|---------|--------------|-------------|
| "INFP characters" | 50K/mo | Low |
| "INTJ personality characters" | 30K/mo | Medium |
| "Character MBTI types" | 20K/mo | Low |
| "Enneagram types characters" | 15K/mo | Low |
| "[Character name] MBTI" | 5-50K/mo each | Variable |
| "Personality database" | 70K/mo | High (brand) |

---

## 10. Monetization

### Tiered Model

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | Browse, vote (limited), comment, basic search |
| **Pro** | $4.99/mo | Unlimited votes, ad-free, advanced search filters, export data, priority moderation responses |
| **Creator** | $9.99/mo | Bulk import tools, API access (1000 req/day), custom categories, verified profile badges |
| **Enterprise** | Custom | White-label API, custom typing systems, dedicated support |

### Additional Revenue

- **Affiliate links** — personality test referrals (16Personalities, Truity)
- **Sponsored profiles** — "Verified by" badge for official character typings (publisher partnerships)
- **Data licensing** — Anonymized aggregated data for researchers (Phase 4+)
- **Donations** — OpenCollective / GitHub Sponsors

---

## 11. Roadmap & Milestones

### Phase 0 — Foundation (Weeks 1-3)

1. **Project scaffolding**
   - Next.js + TypeScript + Tailwind setup
   - PostgreSQL schema + migrations (via Prisma/Drizzle)
   - Redis connection + caching layer
   - MeiliSearch integration
2. **Auth system**
   - Email + password registration
   - OAuth: Google, Discord, GitHub
   - Session management
3. **Core API**
   - CRUD for profiles, typings, votes, comments
   - Full-text search endpoint
4. **Seed data**
   - Import 500 popular character profiles from open datasets
   - Pre-populate categories (Anime, Movies, TV, Games, Celebrities)
   - Seed typing systems (MBTI, Enneagram, Big Five)

### Phase 1 — MVP Launch (Weeks 4-6)

1. **Frontend pages**
   - Homepage (trending, search, featured)
   - Profile page (type breakdown, voting UI, comments)
   - Category browse pages
   - Search results page
   - User profile page
   - Voting interaction (upvote/downvote with live consensus)
2. **Community features**
   - Comment system (threaded, markdown, voting)
   - User reputation display
   - Flagging/reporting
3. **Admin panel**
   - Content moderation queue
   - User management
   - Basic analytics

### Phase 2 — Intelligence (Weeks 7-10)

1. **Cross-system correlations**
   - Build correlation database from research
   - Smart type suggestions when assigning
   - "People who typed X also typed Y"
2. **Evidence system**
   - Link scenes/quotes/sources to typings
   - Source credibility ratings
3. **Comparison tool**
   - Side-by-side profile comparison
   - Type compatibility visualization
4. **Wikidata import pipeline**
   - Bulk import thousands of characters via Wikidata API
   - Automatic bio + image fetch

### Phase 3 — Growth (Weeks 11-14)

1. **Social features**
   - Follow system
   - Collections/playlists
   - Debates (structured pro/con)
2. **Personality tests**
   - Built-in quick MBTI + Enneagram tests
   - Compare your results to character typings
3. **Forums**
   - Per-type discussion boards
   - Per-category discussion boards

### Phase 4 — Platform (Weeks 15+)

1. **Public API v1**
   - API keys, rate limits, docs
   - Developer dashboard
2. **PWA + mobile**
   - Offline support
   - Push notifications
   - Native wrapper via Tauri/Capacitor
3. **i18n**
   - Japanese (biggest secondary market for anime typings)
   - Spanish, Portuguese, German, French
4. **Monetization**
   - Pro tier launch
   - Stripe integration
   - Affiliate pipeline

---

## 12. Open Datasets & References

| Dataset | URL | Description | License |
|---------|-----|-------------|---------|
| Open Psychometrics (MBTI) | https://openpsychometrics.org/_rawdata/ | Raw MBTI test responses | Research |
| Kaggle MBTI Dataset | https://www.kaggle.com/datasets/datasnaek/mbti-type | 8k+ posts labeled with MBTI | Public |
| Open Psychometrics (Big Five) | https://openpsychometrics.org/_rawdata/BIG5.zip | 50-statement Big Five responses | Research |
| OEPS (Enneagram) | https://openpsychometrics.org/tests/OEPS/ | Open Enneagram test | Open |
| Enneagram HF Dataset | https://huggingface.co/datasets/Jdevver/enneagram-classification-dataset | Enneagram-labeled text | Public |
| Character Archetypes | https://huggingface.co/datasets/agentlans/character-archetypes | 100 narrative archetypes | Public |
| OpenCharacter | https://huggingface.co/datasets/xywang1/OpenCharacter | 20k+ character archetype rows | Public |
| Wikidata | https://www.wikidata.org/ | Structured data for millions of entities | CC0 |
| Wikipedia API | https://en.wikipedia.org/api/ | Biographies, character pages | CC-BY-SA |
| TMDB | https://www.themoviedb.org/ | Movie/TV metadata and character data | API |
| RAWG | https://api.rawg.io/api | Video game metadata | API |
| AniList | https://anilist.co/ | Anime/manga character data | API |
| IGDB | https://www.igdb.com/ | Video game database | API |

### Correlation References

| Resource | URL |
|----------|-----|
| MBTI/Enneagram Correlations | https://typologytriad.wordpress.com/mbti-enneagram-big-5-correlations/ |
| Personality Junkie MBTI-Enneagram | https://personalityjunkie.com/myers-briggs-enneagram-mbti-types-correlations-relationship/ |
| YourTrueSelf MBTI-Big Five | https://www.yourtrueself.app/guide/mbti-big-five-translation |
| TraitPath Enneagram-Big Five | https://www.traitpath.com/personality-science |

### Open-Source Libraries

| Library | URL | Purpose |
|---------|-----|---------|
| rheti-python | https://github.com/nthmost/rheti-python | Enneagram test scoring (MIT) |
| TypingJS (hypothetical seed) | — | We may need to build our own MBTI/Enneagram test scoring |

---

## Q&A with DeepSeek

**Q: Why build this when PDB already exists?**
A: PDB has no modern competitor despite 3M+ MAU. It's a classic "dominant but stagnant" market. A technically superior, API-first, community-respected alternative can capture the disaffected user base — exactly what happened when Reddit overtook Digg, or when Discord overtook Ventrilo.

**Q: Isn't personality typing pseudoscience? How do we handle that?**
A: Be transparent about what this is: a database of *community opinions* about personality types, not a scientific diagnostic tool. Label consensus as "community agreement %", cite sources, and clearly separate fan theories from verified canon. The value is in the social debate and categorization game, not clinical validity.

**Q: What's the hardest technical challenge?**
A: Three things: (1) vote manipulation prevention — weighted reputation systems + anomaly detection at scale, (2) SEO for user-generated content — ensuring every profile page ranks, (3) moderation at scale — building automated tools that catch bad content without stifling legitimate debate.

**Q: How do we get initial users?**
A: (1) Seed a critical mass of profiles (5k+ via Wikidata imports), (2) Post to r/MBTI, r/Enneagram, r/PersonalityTypes with a compelling "we fixed what's broken with PDB" narrative, (3) Make every page SEO-optimized so organic search brings in "INFP characters" traffic from day one, (4) Open API early so third-party tools and apps drive awareness.

---

## Next Steps

1. **Choose project name** and register domain
2. **Scaffold the project** (I can do this immediately)
3. **Set up database** with the schema above
4. **Build auth** (NextAuth.js configuration)
5. **Seed categories and typing systems**
6. **Build profile creation + voting MVP**

Want to proceed with any of these? I can start scaffolding the project now.