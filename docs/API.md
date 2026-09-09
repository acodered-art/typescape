# Building a client against the TypeScape API

Two surfaces exist, with different jobs:

| | Browser session API | Public `/api/v1` |
|---|---|---|
| Auth | `session_token` cookie or bearer token | API key (`Authorization: Bearer ts_live_…`) |
| CSRF | required on writes | not applicable |
| Rate limit | per IP | per key, by plan |
| Stability | may change with the UI | versioned, envelope-stable |
| Use for | the web app | mobile, bots, integrations |

**A native or third-party client should use `/api/v1`.** It is the surface with a
contract.

## 1. Get a token (native client, acting as a reader)

Browsers use cookies and get CSRF tokens automatically. A native client cannot,
so it exchanges credentials for a bearer token:

```http
POST /api/auth/token
Content-Type: application/json

{ "email": "you@example.com", "password": "…" }
```

```json
{ "token": "…64 hex…", "expiresAt": "2026-09-15T…", "user": { "id", "username", "role" } }
```

Send it on every request: `Authorization: Bearer <token>`.

- `GET /api/auth/token` validates and returns the identity.
- `DELETE /api/auth/token` revokes **that** token, leaving other devices signed in.
- The token is the same row a browser cookie references, so authority is identical.
- There is no refresh flow: tokens last 7 days, then the client re-authenticates.

## 2. Get an API key (integrations and paid plans)

Keys are for machine clients, not for a reader's personal session:

```http
POST /api/me/api-keys        # cookie or bearer auth, CSRF required
{ "name": "my app", "scopes": ["read", "write"] }
```

The plaintext key is returned **once**. Only a SHA-256 hash is stored. Limits come
from the owner's plan (`/api/plans`): Free 60 req/min and 2 keys, Pro 600 and 10,
Business 3000 and 50.

## 3. Envelope

Every `/api/v1` response is one of two shapes. Do not rely on anything else.

```json
{ "data": <payload>, "meta": { … } }     // success
{ "error": "message" }                    // failure, with an HTTP status
```

`meta` is only present on list endpoints and always carries `total`, `limit`,
`offset` there. Success responses also carry `X-RateLimit-Limit` and
`X-RateLimit-Remaining` so a client can back off before a 429.

Pagination: `?limit=` (clamped 1..50, default 20) and `?offset=`. A `limit` of `0`
clamps to `1` rather than falling back to the default — treat it as a minimum.

## 4. Endpoints

Read (scope `read`):

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/me` | identity, plan, activity counts |
| GET | `/api/v1/systems` | every typing system + its types; cache this |
| GET | `/api/v1/traits` | the 12 survey axes, in order |
| GET | `/api/v1/profiles` | `q`, `type`, `system`, `category`, `sort`, `limit`, `offset` |
| GET | `/api/v1/profiles/[slug]` | full file with readings and agreement |
| GET | `/api/v1/profiles/[slug]/comments` | threaded comments |
| GET | `/api/v1/daily` | today's character; `?date=YYYY-MM-DD` to preview |
| GET | `/api/v1/feed` | recent site activity |

Write (scope `write`):

| Method | Path | Body |
|---|---|---|
| POST | `/api/v1/typings/[tid]/vote` | `{ voteValue: 1 \| -1 }` — same value again withdraws |
| POST | `/api/v1/profiles/[slug]/comments` | `{ text, parentId? }` |
| POST | `/api/v1/match` | `{ mbti?, enneagram?, limit? }` |
| POST | `/api/v1/compatibility` | `{ a: {system,type}, b: {system,type} }` |

Unkeyed and CORS-open (for embeds): `GET /api/embed/card?slug=`.

### Things that will bite you

- **Votes toggle.** Sending the same `voteValue` twice removes the vote. If you
  queue votes for offline replay, record the value you observed and skip the send
  when the server already agrees (see `src/lib/outbox.ts`).
- **Comments can be held.** A `422` means the moderation assist flagged it; the
  body names the reasons. Surface them — don't retry.
- **`agreement` can be 0 for two reasons.** Below the voter minimum, or genuinely
  0% agreement. The `hasConsensus` flag distinguishes them.
- **Compatibility returns `score: null`** when two systems have no recorded
  correlation. That is deliberate; do not render it as 0%.

## 5. Testing a client

```bash
# start a server, mint a key, run the smoke suite
npx tsx scripts/mk-testkey.mts <username> read,write
node scripts/api-smoke.mjs http://localhost:3002 <key>
```

`api-smoke.mjs` checks auth rejection, every read endpoint, envelope shape,
pagination clamping, the write path, rate-limit headers, and CORS. Run it against
your server before pointing a client at it.
