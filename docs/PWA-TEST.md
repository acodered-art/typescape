# Testing the installable app

> **Faster path:** an Android APK is available at
> `https://episteme-1.tail19de5f.ts.net:8444/download` (or `/downloads/typescape.apk`).
> It is the same site in a WebView, signed with a test key. Use it if the browser
> will not offer to install. See `android-app/README.md`.

The app is a PWA: it can be installed to a home screen and opens without a
browser chrome. This is the test that decides whether a native shell (Capacitor)
is worth building, so run it on a **real device**, not a desktop emulator.

## URL

```
https://episteme-1.tail19de5f.ts.net:8444
```

Tailnet only. The device must be on the tailnet and the hostname must resolve
(MagicDNS). Use the hostname, not the IP: the TLS certificate is issued for the
hostname.

## Android (Chrome) — expect a real install prompt

1. Open the URL in Chrome.
2. Wait a few seconds; a **"Add TypeScape to Home screen"** banner should appear.
   If it does not, open the ⋮ menu — there should be **Install app** (not just
   "Add to Home screen", which is the shortcut fallback and means the install
   criteria are not all met).
3. Install, then **close Chrome entirely** and launch from the home-screen icon.
4. What to look for:
   - launches **without** the URL bar
   - status bar tinted `#01050b` (near-black)
   - icon is the blue band on ink, not a generic globe
   - long-pressing the icon shows the three shortcuts (Today's character, Find my
     match, Browse)

## iOS (Safari) — no prompt, manual only

1. Open the URL in **Safari** (Chrome on iOS cannot install PWAs).
2. Share → **Add to Home Screen**.
3. Launch from the icon. Expect no URL bar and the correct icon
   (`apple-touch-icon`).
4. **The open question**: does push notification work? See below.

## Offline test (both platforms)

1. With the app open, turn on **airplane mode**.
2. Navigate to a page you have not visited. You should get the offline sheet, not
   a browser error page.
3. Vote on something. The strip at the bottom should say *"Offline — changes are
   saved on this device"*.
4. Turn the network back on. Within ~30s the strip should clear and the vote
   should land. This is the `src/lib/outbox.ts` replay.

## What each result means

| Result | Implication |
|---|---|
| Android installs cleanly, iOS adds to home screen | Ship as a PWA. Capacitor buys app-store presence, not much else. |
| iOS push works | No native shell needed for the daily-ritual notifications. |
| iOS push does **not** work | Capacitor (or a native shell) is required for iOS notifications. This is the deciding test. |
| Android shows only "Add to Home screen" | A manifest or service-worker criterion is failing; check the install-readiness script below. |

## Cheating on the install checklist

Instead of a device, the criteria can be verified from the host:

```bash
python3 - <<'EOF'
import http.client, ssl, json
host='episteme-1.tail19de5f.ts.net'; ctx=ssl.create_default_context()
def get(p):
    c=http.client.HTTPSConnection(host,8444,timeout=25,context=ctx)
    c.request('GET',p,headers={'Host':host}); r=c.getresponse(); return r, r.read()
r,b=get('/manifest.webmanifest'); m=json.loads(b)
print('manifest ok:', r.status==200 and m.get('display')=='standalone')
print('icons:', sorted(i['sizes'] for i in m.get('icons',[])))
r,b=get('/sw.js'); print('service worker:', r.status==200)
r,b=get('/offline'); print('offline page:', r.status==200)
EOF
```

Chrome DevTools → Application → Manifest shows the same information and will name
any missing criterion outright.
