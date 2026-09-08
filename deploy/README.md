# TypeScape deployment

The production server is a long-running Next.js process behind a Cloudflare tunnel.

```
Cloudflare (typescape.walker-fg.uk)
   -> cloudflared on the host        (/etc/cloudflared/config.yml)
   -> http://localhost:3002          (this Next.js server)
   -> Postgres on :5434, Redis on :6381, MeiliSearch on :7710
```

## systemd user unit

`typescape.service` (tracked here; install to `~/.config/systemd/user/`):

```bash
cp deploy/typescape.service ~/.config/systemd/user/typescape.service
systemctl --user daemon-reload
systemctl --user enable --now typescape
```

Lingering is enabled for this user (`loginctl show-user <user>` -> `Linger=yes`), so the
service starts at boot without anyone logging in.

Two details that are easy to get wrong:

- **`PATH` must be set explicitly.** systemd's default PATH does not include `~/.node/bin`,
  which is where `node`/`npx` live on this host. The unit sets
  `PATH=/home/episteme/.node/bin:/usr/local/bin:/usr/bin:/bin` and calls `npx` by absolute
  path.
- **`TimeoutStopSec=20`.** `next-server` can keep the listening socket bound through a hard
  kill, and a short stop timeout leaves port 3002 occupied so the restart fails with
  `EADDRINUSE`.

## Routine operation

```bash
# deploy a code change
cd /home/episteme/typescape
npm run build
systemctl --user restart typescape

# logs
journalctl --user -u typescape -f

# health
curl -fsS http://localhost:3002/api/stats
```

## Manual fallback (no systemd)

If the unit is not installed, the same command run by hand works. `fuser -k` is the reliable
way to stop an existing listener — a plain `kill` can leave the port bound:

```bash
fuser -k 3002/tcp
nohup env NODE_ENV=production npx next start -p 3002 > /tmp/typescape-live.log 2>&1 &
```

## Environment

Configuration comes from `.env` (gitignored) plus the unit's `Environment=` lines. The unit
deliberately repeats `NODE_ENV` and `INTERNAL_API_URL` so the service does not depend on
whatever happens to be in the shell that enabled it.

`INTERNAL_API_URL` is the base for server-side fetches back into this app. Server components
must use it rather than the public URL, which would round-trip through Cloudflare.

## Database

Migrate before starting a new build if the schema changed:

```bash
npm run db:migrate      # prisma migrate deploy
npm run db:status       # check for drift
```

The app will run with pending migrations but queries against new columns will fail, so migrate
first.
