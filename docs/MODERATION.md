# Moderation and administration

How staff powers are split, why, and what each action does. The design borrows
from how established sites solve the same problems: Wikipedia's separation of
rollback, sysop and bureaucrat powers; Discord's granular per-action moderator
permissions plus a full audit log; Reddit's inline "[removed by moderator]"
placeholder and reversibility.

## Two tiers, split by blast radius

| | Moderator | Admin |
|---|---|---|
| Review the queue, approve/reject | yes | yes |
| Remove / restore a comment | yes | yes |
| Lock a thread | yes | yes |
| Lock a profile file | yes | yes |
| Edit / delete a profile | no | yes |
| Timeout or ban a user | no | yes |
| Change a role | no | yes |
| Read the audit log | no | yes |
| Run site maintenance | no | yes |

Routes ask for a **named permission** (`comment.remove`, `user.ban`), never for a
role by name. `src/lib/permissions.ts` maps roles to permission sets, so granting
a new role a subset of powers never requires touching a route.

You cannot exercise these powers from a UI that lies about them: the server checks
every time. The previous implementation gated *everything* on `role === "admin"`,
which meant the `moderator` role could not do the one job it exists for.

## Guardrails that exist because the alternative is a broken site

| Rule | Why |
|---|---|
| You cannot ban, time out, or change your own role | Prevents accidents and self-lockout |
| The last admin cannot be demoted | Otherwise nobody can administer the site |
| You cannot moderate your own content | Removes the obvious abuse path |
| A moderator cannot moderate an admin | A moderator must not be able to silence staff |
| A timeout must end in the future | A zero-length timeout reads as active and does nothing |
| Every restriction needs a reason | Shown to the user, kept in the log |
| Roles are never inferred from the request body | The server reads the role from the database |

## Removal is soft and reversible

A removed comment keeps its row and its place in the thread. The body is withheld
and replaced with `[removed by a moderator]`; the author can see what happened, and
a moderator can restore it. Deleting the row instead would detach replies and make
"why is this gone?" unanswerable — the reason Discord and Reddit both hide rather
than destroy.

A held (auto-flagged) comment is stored *already removed*, so a reviewer can
actually read it. Approving publishes it; rejecting leaves it hidden.

## Everything is audited

`audit_log` is append-only. A row records the actor (id **and** denormalised name,
so it stays readable if the account goes), the action, the target with a
human-readable label, the reason, before/after state, and the IP.

Actions: `queue.approve`, `queue.reject`, `comment.remove`, `comment.restore`,
`comment.lock`, `comment.unlock`, `user.role`, `user.ban`, `user.timeout`,
`user.restore`, `site.reindex-search`, `site.purge-sessions`,
`site.recount-consensus`.

Read it at `/admin` → Audit log, or `GET /api/admin/audit?action=&actor=&targetId=`.

## Account status

| Status | Effect |
|---|---|
| `active` | normal |
| `timeout` | cannot post until `statusUntil` |
| `banned` | cannot post; existing comments withdrawn pending review |

Status is evaluated on read (`effectiveStatus`), so a lapsed timeout stops
blocking without a background job. Enforcement is on every write path —
`guardCanPost` sits in the web routes *and* `/api/v1`, so a ban cannot be
side-stepped by switching client.

## Surface

| Route | Who | Purpose |
|---|---|---|
| `/mod` | moderator, admin | the review queue and comment actions |
| `/admin` | admin | record, readers, audit log, site maintenance |
| `GET /api/mod/queue` | `queue.view` | list queue items with inline content |
| `PATCH /api/mod/queue` | `queue.review` | approve / reject |
| `POST /api/mod/comments/[id]` | `comment.*` | remove / restore / lock / unlock |
| `GET /api/admin/users` | `user.view_details` | search with status and counts |
| `PATCH /api/admin/users` | `user.role` / `user.ban` | role and status changes |
| `GET /api/admin/audit` | `audit.view` | the log |
| `GET/POST /api/admin/maintenance` | `site.maintenance` | health and housekeeping |

All of it works with a cookie or a bearer session token, so a native admin client
needs no API key.

## Maintenance actions

Idempotent and safe to run twice; each reports what it changed.

- `reindex-search` — rebuild the MeiliSearch profile index
- `purge-sessions` — delete expired session rows
- `recount-consensus` — recompute cached `confidence` from live votes (repairs
  drift if a vote write ever failed halfway)

## Testing it

```bash
npx tsx scripts/seed-staff.mts          # creates probe_admin / probe_mod / probe_user
node scripts/api-smoke.mjs http://localhost:3002 <key>
```

`tests/permissions.test.ts` covers the permission sets and every guardrail
(32 tests). The HTTP flows — gates per role, ban enforcement, remove/restore,
queue approve/reject, maintenance — were verified against a running server.
