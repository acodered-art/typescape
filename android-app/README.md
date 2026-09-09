# TypeScape — Android shell

A WebView pointed at the live site. **Not a second implementation**: the app is
the website, so nothing here needs changing when the site changes. The only
thing baked in is the URL in `lib/main.dart`.

## Why it exists

Chrome would not offer to install the PWA, so this provides a launcher entry
that does not depend on the browser's install criteria. It also adds the two
things a browser cannot: an Android back gesture that walks history, and an
offline screen that names the real cause (the phone being off the tailnet).

## Build

```bash
cd android-app
flutter pub get
flutter build apk --release      # -> build/app/outputs/flutter-apk/app-release.apk
```

Copy the result to `public/downloads/typescape.apk` so the site serves it.

## Install on a device

Download from `https://episteme-1.tail19de5f.ts.net:8444/download`, or:

```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

Android will ask to allow installing from this source the first time. The device
must be on the tailnet, because that is where the site lives.

## Signing

`android/key.properties` points at `typescape-release.jks`, a self-generated test
key. Both are gitignored — **do not commit the keystore**, and do not lose it:
Android refuses to install an update signed by a different key, so losing it means
users must uninstall first.

The gradle config falls back to the debug key when `key.properties` is absent, so
a fresh clone still builds. Verify what signed a build with:

```bash
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --print-certs \
  build/app/outputs/flutter-apk/app-release.apk
```

## Changing the server

Edit `_baseUrl` in `lib/main.dart`, then rebuild and re-copy. There is no
remote-config mechanism on purpose — a test shell does not need one.
