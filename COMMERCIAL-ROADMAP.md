# TypeScape — Commercial Roadmap

Derived from `~/homelab/COMMERCIAL-AUDIT-20260908.md` (2026-09-08).
Working doc: check items off as they land. Verify each claim before acting on it.

## Guardrails

- **Do not** run `prisma db push --accept-data-loss` on live data once migrations exist.
- **Do not** remove the two-auth-systems design without reading `src/lib/session.ts` first —
  `auth()` tries NextAuth then falls back to the custom `session_token` cookie.
- Server components must fetch `http://localhost:3002` (hardcoded), never the public URL.
- `src/lib/typing-systems.ts` and the `typing_systems` DB table are **two sources of truth**
  for systems; keep `SYSTEM_COLORS` in sync with `TYPING_SYSTEMS`.
- Verify with `npx eslint` (currently 0 errors / 4 warnings) after each change.

## Sprint 1 — Security & data stability floor

- [x] **CSRF on all mutating routes.** *(2026-09-08)* Was 2 of 51 routes. Now **32/32
      mutating route files** call `guardCsrf(req)` from `src/lib/csrf.ts`, and all
      **26 mutating client call sites** in 21 files go through `fetchWithCsrf` from
      `src/lib/csrf-client.ts` (auto-fetches the token, retries once on 403).
      Verified end-to-end against a production build: POST without token → 403
      `{"error":"Invalid or missing CSRF token"}`; POST with paired cookie+header → passes
      CSRF and falls through to the auth layer (401); GET routes unaffected.
      `login`/`register` were migrated off their duplicate inline `validateCsrf` calls.
- [x] **Migrations.** *(2026-09-08)* Baselined via
      `prisma migrate diff --from-empty --to-schema-datamodel` →
      `prisma/migrations/0_init/migration.sql` (773 lines), then
      `prisma migrate resolve --applied 0_init`. Verified: a diff of the **live DB against
      the schema is empty** ("This is an empty migration"), `migrate status` reports
      "Database schema is up to date", and `migrate deploy` is a clean no-op. Added
      `db:migrate` / `db:status` / `typecheck` npm scripts. Replaced the broken
      `postinstall` (`prisma skills sync`, which is not a real command and silently
      no-op'd on every install) with `prisma generate`. `db push --accept-data-loss`
      removed from AGENTS.md.
- [x] **Redis rate limiting.** *(2026-09-08)* `src/lib/rate-limit.ts` now uses a
      fixed-window counter in Redis (`rl:<bucket>:<id>`, INCR + PEXPIRE) via a
      ~60-line RESP client over `node:net` — no new dependency. Verified live: 3 allowed
      then blocked, counter visible in `redis-cli GET rl:probe:unknown`, and **the limit
      survives a full server restart** (the old Map could not). Degrades to the original
      in-process Map when Redis is unreachable (verified with the container stopped):
      weaker, per-process, but never open. All 18 call sites now `await rateLimit(...)`.
- [x] **Lock down `x-forwarded-for`.** *(2026-09-08)* New `src/lib/client-ip.ts`. The
      spoofable header is **never** trusted; only `cf-connecting-ip` / `x-real-ip` are
      honoured, and only when `TRUST_CF_HEADERS=true` (documented in `.env.example`,
      off by default since the origin on :3002 is directly reachable on the LAN).
      Unattributable callers share one `unknown` bucket instead of being exempted —
      previously the SSR bypass treated `unknown` as local, so spoofing `x-forwarded-for`
      disabled every limit and the GET exemption entirely.

## Sprint 2 — Correctness & speed

- [x] **Fix `calcConsensus`.** *(2026-09-08)* The formula was actually correct
      (`upWeight / totalWeight`, verified against all-up/all-down/tie/weighted cases), so it
      was **documented** rather than rewritten. The real defects were input handling:
      a single `NaN`/zero/negative weight zeroed the result, and out-of-range `voteValue`
      skewed it. Now coerces weight to a finite non-negative default of 1 and sign-clamps
      `voteValue`. Added `hasConsensus: false` below `minVoters` (previously a below-min
      result was indistinguishable from a genuine 0%). `calcVoteWeight` now treats
      negative/NaN reputation as zero. No callers read the raw sums, so this is
      behaviour-preserving where it matters.
- [x] **Add a test suite.** *(2026-09-08)* `tests/` with the **Node built-in runner +
      type stripping** (`npm test`) — no new dependency. 31 tests covering `calcConsensus`
      (13 cases incl. weights, ties, NaN/zero weights, out-of-range values, minVoters),
      `calcVoteWeight`, `slugify`, `generateSlug`, and `client-ip` (proving
      `x-forwarded-for` is never trusted, both with and without `TRUST_CF_HEADERS`).
- [x] **CI.** *(2026-09-08)* `.github/workflows/ci.yml` — Postgres 16 service,
      `prisma validate` → `migrate deploy` → **drift check with `--exit-code`** →
      typecheck → lint → test → build. The drift gate was verified both ways: exit 0 on a
      clean DB, non-zero when a schema difference is introduced.
- [x] **Wire MeiliSearch.** *(2026-09-08)* Was running with **zero** indexes. New
      `src/lib/search.ts` + `scripts/reindex-search.ts` (`npm run search:reindex`): 24
      profiles indexed with `types`/`categorySlug` filterable and `viewCount`/`name`
      sortable. `GET /api/profiles?q=` now returns `engine: "meilisearch"` and typo
      tolerance works (`narutu` → Naruto Uzumaki, which `ILIKE` could never match).
      Any Meili failure returns `null` and falls through to the existing SQL path —
      verified with the container stopped: correct results in ~14ms, no user-visible
      hang. Empty `q` still uses SQL. Profile creation best-effort re-indexes.
- [x] **Postgres fallback index.** *(2026-09-08)* Migration
      `20260908120000_profile_search_indexes` adds pg_trgm GIN indexes on
      `profiles.name/description/bio`, btree on `profile_typings.type_value` (multi-type
      AND filter), `activities(user_id, created_at desc)` and `profiles.view_count/
      created_at desc`. Declared in `schema.prisma` too (Prisma would otherwise propose
      dropping them) — `migrate diff --exit-code` now reports **zero drift**.

## Sprint 3 — The differentiator: vector voting

Design is in `VECTOR-VOTING-DESIGN.md`; schema is already live
(`TraitDimension`, `DisorderTraitVector`, `TraitVote`) and `api/profiles/[slug]/trait-votes`
exists. Remaining:

- [x] Seed the 12 trait dimensions and the disorder reference vectors. *(pre-existing)*
      12 traits, 11 patterns × 12 coords = 132 vectors, all complete.
- [x] Build the slider UI. *(pre-existing)* `trait-vote-panel.tsx` — 7-point boxes per trait
      with the community average outlined, a similarity map, "nearest pattern" bars,
      strongest-traits list, and a `DisorderVotePanel` fallback.
- [x] **Implement aggregation correctly.** *(2026-09-08)* Extracted the math to
      `src/lib/traits.ts` (unit-testable, no Next/Prisma imports) and fixed two real bugs:
      1. **Percentages did not sum to 100** (real data printed 99). Now uses the
         largest-remainder method; verified live at exactly 100.
      2. **`similarityToPercentage` subtracted the minimum similarity**, handing
         opposite-trait patterns (cos ≈ -0.6) a nonzero share. Now only positive
         similarity counts — four phantom entries became 0.
      Replaced the inline verdict chain with `describeBreakdown()`; the old chain checked
      the accent branch *before* `autoNone`, so a low-percentage accent could mask the
      "none" verdict. 20 new unit tests.
- [x] **Emergent co-morbidity.** *(2026-09-08)* Design §4 step 4 was never implemented.
      `emergentComorbidities()` flags any two patterns both ≥20% and scores them by the
      geometric mean of their shares, exposed as `comorbidities[]` on the API. Verified
      live: Histrionic + OCPD at 29.7.
- [x] Seed initial trait data from `DisorderVote` (design §7). *(no-op)* Only 3 disorder
      votes exist and every affected profile already has trait votes — the backfill would
      change nothing. Revisit if disorder votes accumulate.
- [x] Parallel operation. Single-pattern voting remains available inside the survey panel,
      so nothing was retired.
- [x] **"X inverted to [trait]" verdict.** *(2026-09-08)* `findInversions()` + `describeInversion()`
      in `src/lib/traits.ts` — an axis is inverted when the community and the pattern sit on
      opposite poles, each beyond the neutral band, with a gap of at least 3. 10 unit tests.
      Verified live: "Histrionic Personality Disorder, inverted to anxiety" with anxiety and
      empathy listed. Rendered in the trait panel.

## Sprint 4 — Visualization (Concept B)

- [x] **Radar view.** *(2026-09-08)* New `src/components/trait-radar.tsx` — a 12-axis radar with
      reference rings, per-axis markers, and a legend. Wired into the trait panel as
      "Community shape", overlaying the community survey (blue) against the nearest
      pattern's reference vector (steel). Needed a new `topReference` field on the
      trait-votes API so the overlay has data.
- [x] **Diff view.** *(2026-09-08)* `TraitDiff` in the same module: a per-axis table with both
      values and a gap bar (blue when the gap is ≥2). Ready to use wherever two surveys
      need comparing.
- [x] **Similarity, done as vector distance.** *(2026-09-08)* New
      `GET /api/profiles/[slug]/similar` ranks profiles by cosine similarity over trait
      vectors, comparing only axes **both** sides surveyed (an unvoted axis is the neutral
      midpoint and would drag every pair to the centre). Falls back to shared typings when
      surveys are too thin, and labels which basis was used. Rendered on the profile page as
      "Closest surveys" / "Closest readings". Verified live: Juuzou → Eva Heinemann 93%
      across 12 traits; Naruto → Goku via shared typings.
      **Deferred**: the full 2D t-SNE/UMAP map needs full trait coverage across the corpus
      (only 3/24 profiles are surveyed) — revisit once data accumulates.
- [x] **Internal API URL is now configurable.** *(2026-09-08)* 11 pages hardcoded
      `http://localhost:3002`. `INTERNAL_API_URL` is documented in `.env.example` but was
      read by nothing; added `src/lib/api-url.ts` as the single source. This also makes the
      second-port test harness possible.
- [x] **Correlation explorer.** *(2026-09-08)* `src/components/correlation-explorer.tsx` — a chord
      diagram of all 52 correlations across MBTI/Enneagram/Big Five, arc thickness by strength,
      click-to-trace with the rest dimmed, plus a per-type list. Geometry hoisted to module
      scope (it is static) so the React Compiler can verify the component. Live on `/compare`.

## Sprint 5 — Growth loop (Concept C)

- [x] **Shareable OG cards.** *(2026-09-08)* `src/app/profiles/[slug]/opengraph-image.tsx` renders a
      1200×630 PNG card (name huge, category strip, up to three leading reads as ink blocks)
      via `next/og` — no new dependency. Added `generateMetadata` to the profile page; it was
      missing entirely, so **no profile page had any share metadata before**. Verified in the
      served HTML: `og:title`, `og:image`, `og:description`, `twitter:card`, and a canonical
      link all present, and the image endpoint returns a valid 1200×630 PNG.
- [x] **"Which character are you?"** *(2026-09-08)* `POST /api/match` + `/match` page (in the nav).
      Scores exact MBTI 3, Enneagram core 2, matching wing 1; returns a 0-100 `strength` and
      human reasons. Validates input, rate-limits, needs no account, and rewrites the URL so
      results are linkable. Verified: ENFP+7 → Goku and Naruto at 100%; 5 → Walter White/L/Rick.
- [x] **Compatibility reports.** *(2026-09-08)* `src/lib/compatibility.ts` (8 tests) +
      `POST /api/compatibility` + `/compatibility` page in the nav. Scores an exact match 100,
      otherwise uses the recorded correlation strength, and returns `null` with an explanation
      when there is no recorded link rather than inventing a number. Verified live: INFJ↔4 =
      45%, same type = 100, unlinked systems = no score.
- [x] **Daily ritual + PWA.** *(2026-09-08)* `src/lib/daily.ts` — a deterministic UTC-day pick
      (FNV-1a over the day and pool size), so every reader sees the same character and it costs
      no storage. `GET /api/daily` (+ `?date=` preview), `/daily` page, card on the homepage.
      11 tests. PWA: `manifest.ts`, generated icons, `public/sw.js` (caches the shell only;
      never API data), `/offline`, and a production-only registrar. Verified: 60 allowed / 429
      on the 61st for a free key, and the daily pick is stable within a day but changes across
      days.

## Sprint 6 — Community moat (Concept D)

- [x] **Credibility score.** *(2026-09-08)* New `src/lib/credibility.ts` +
      `GET /api/user/[username]/credibility`, rendered as a "Credibility" field on the
      reader page. Recomputes the consensus on each typing **excluding the voter**, so a
      reader cannot inflate their own score; skips exact ties and typings with fewer than
      3 peers; reports the sample size and a `provisional` flag so a 100%-from-one-vote
      cannot masquerade as a track record. 11 unit tests. Verified live against seeded
      peers: agreement → 100%, peers flipped → 0%, then the seed was removed.
      Real data is currently too sparse to produce a score (8 votes, none with 3+ peers),
      which the UI states honestly rather than showing a fake number.
- [x] **Contested readings.** *(2026-09-08)* `src/lib/contested.ts` — `detectContested()` flags
      a reading when the vote is split (margin within ±0.2) or the filed evidence leans
      negative while the votes still hold. 9 unit tests, including the weight-sensitivity
      case. Not yet rendered in the UI (needs a badge on `VotePanel`), but the signal exists
      and is tested.
- [x] **Contest-with-evidence UI.** *(2026-09-08)* `POST /api/typings/[tid]/contest` requires a
      20+ character reason (and an optional cited source), upserts one contest per reader, and
      registers disagreement. `ContestModal` wired into `VotePanel` beside Disagree. CSRF +
      rate limited. Verified the gate: tokenless → 403, anonymous → 401.
- [x] **Moderation assist.** *(2026-09-08)* `src/lib/moderation.ts` — 7 explainable rules
      (harassment, slurs, threats, self-harm, stereotyping, gatekeeping, clinical claims) plus
      a shouting heuristic, each flag naming the rule and the match. Blocking content is held
      and queued; warnings queue without silencing. Normalises zero-width characters so they
      cannot hide a slur. 15 tests. Wired into comment creation.

## Sprint 7 — Distribution & revenue

- [x] **Programmatic SEO pages.** *(2026-09-08)* `/types/[system]/[type]` — **206 pages**
      statically generated from the 20 systems' declared types, each listing the characters
      filed under that type with per-type metadata. `/sitemap.xml` (239 entries: static +
      profiles + public collections + type pages) and `/robots.txt` (blocks `/api/`,
      `/admin`, `/settings`). Non-canonical casing 308-redirects so `ENFP`/`Enfp` do not
      split ranking. Verified live: `ENFP` → 308 to `enfp`, both list Goku/Naruto.
- [x] **Public API with keys + quotas.** *(2026-09-08)*
      - `ApiKey` model + migration (`20260908140000_api_keys`): SHA-256 hashes only, a
        display `prefix`, `scopes`, per-key `rate_limit`, `request_count`, `last_used_at`,
        soft `revoked_at`. Zero drift after applying.
      - `src/lib/api-auth.ts`: bearer auth, scope check, per-key Redis rate limit with
        `X-RateLimit-*` / `Retry-After` headers, best-effort usage accounting.
      - `GET /api/v1/profiles` (list/search, Meili-first with a Postgres fallback, both
        wrapping in a `{data, meta}` envelope) and `GET /api/v1/profiles/[slug]`.
      - Key management: `GET/POST /api/me/api-keys` (plaintext returned **once**),
        `PATCH /api/me/api-keys/[id]` to revoke/rename.
      - Verified: missing/invalid/bad-prefix keys all 401 with distinct messages; valid key
        returns list, Meili search (`narutu` → Naruto), and item data; a 5/min key allowed 2
        then 429ed with correct headers; revoking 401s immediately; usage counter recorded.
- [x] **Embeddable TypeCard.** *(2026-09-08)* `public/embed.js` (no dependencies, ~120 lines) +
      public CORS-open `GET /api/embed/card?slug=`, documented with a live demo at `/embed`.
      Rendered inline rather than iframed so it inherits the host page; fails silently so a
      broken embed cannot break a third-party site. No API key required. Verified: CORS `*`,
      5-minute cache, no user data in the payload.
- [x] **Tiering + plan assignment.** *(2026-09-08)* `src/lib/plans.ts` is the single source of
      truth: Free $0/60-per-min/2 keys, Pro $9/600/10, Business $49/3000/50, each with a feature
      set. `Plan` + `Subscription` models (migration `20260908160000_billing`, plans seeded by
      the same migration, zero drift). `effectivePlanSlug()` grants a plan only while the period
      is live — an expired or canceled subscription falls back to **free** rather than keeping
      paid access. Enforcement is real: a key's limit is `min(key override, plan ceiling)`, and
      key creation is capped by the plan. 20 tests. **Verified live**: a free-plan key was
      allowed exactly 60 requests then 429'd with `X-RateLimit-Limit: 60`. `/plans` page + public
      `/api/plans`.
- [ ] **Payment processor.** The billing *model* and enforcement are complete; wiring a real
      processor (Stripe webhook -> `Subscription` row) is the remaining step, and it needs
      credentials rather than code.
- [x] **JSON-LD structured data.** *(2026-09-08)* `src/lib/json-ld.ts` + 12 unit tests.
      `WebSite`+`SearchAction` in the root layout, `Person` on every profile (readings as
      `additionalProperty`), `ItemList` on type pages (capped at 48 entries). Verified live
      on `/`, `/profiles/naruto-uzumaki`, and `/types/mbti/enfp`.

## Live deployment (updated 2026-09-08)

**A systemd user unit now exists** at `~/.config/systemd/user/typescape.service`
(repo-tracked copy: `deploy/typescape.service`). It sets `NODE_ENV=production`,
`INTERNAL_API_URL`, and an explicit `PATH` (systemd's default PATH does not include
`~/.node/bin`, which is where `node`/`npx` live on this host). `Restart=on-failure`,
`TimeoutStopSec=20` because next-server can hold the port through a hard kill.

Lingering is already enabled for this user (`Linger=yes`), so once enabled the unit starts
at boot without a login session.

```bash
# One-time (needs a shell I cannot use):
systemctl --user daemon-reload
systemctl --user enable --now typescape

# After a code change:
cd /home/episteme/typescape && npm run build && systemctl --user restart typescape
```

Until the unit is enabled, the manual path still works:

```bash
npm run build
fuser -k 3002/tcp                       # plain kill does not reliably free the port here
nohup env NODE_ENV=production npx next start -p 3002 > /tmp/typescape-live.log 2>&1 &
```

- The `ExecStart` command was verified to serve correctly under a stripped
  systemd-like environment (`env -i PATH=... HOME=...`).
- Server-side fetches use `INTERNAL_API_URL` (default `http://localhost:3002`).
- Public URL `https://typescape.walker-fg.uk` is served by the system `cloudflared`
  (`/etc/cloudflared/config.yml` -> `localhost:3002`), not the per-user config.
- Bare-`urllib` requests to the public URL get a **403 from Cloudflare's bot challenge**;
  that is expected. Send a browser User-Agent to test.

## Known debt (not blocking, do not silently "fix")

| Item | Location | Note |
|---|---|---|
| `unsafe-inline` in CSP | `src/middleware.ts` | RSC hydration needs it; replace with per-request nonces |
| Duplicate route row in docs | `AGENTS.md` frontend table | `/collections/[slug]` listed twice |
| 4 lint warnings | `eslint` output | unused `slug`, unused `qId`, `window.location.href`, `<img>` in dossier |
| `use client` heavy components | `src/components/*` | `trait-vote-panel.tsx` 331 lines, `comment-section.tsx` 286 — split before extending |
| Systemd unit not yet enabled | `deploy/typescape.service` | Written and command-verified; needs `systemctl --user enable --now typescape` from a shell |
