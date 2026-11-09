#!/usr/bin/env bash
# Writes public/.well-known/assetlinks.json: the site's statement that links to
# /admin may open the Android app. Android checks the app's signing key against
# it, so it must hold the fingerprint of the key the APK is signed with (your
# computer's debug key, ~/.android/debug.keystore). build-apk.sh runs this; the
# file then has to be pushed so it is live on the site.
#   bash scripts/assetlinks.sh [path/to/app.apk]
set -euo pipefail
cd "$(dirname "$0")/.."
PKG="xyz.wyntek.admin"
APK="${1:-android/app/build/outputs/apk/debug/app-debug.apk}"
SHA=""

# Best source: the certificate inside the APK that was just built.
if [ -f "$APK" ] && [ -n "${ANDROID_HOME:-}" ]; then
  SIGNER="$(ls -d "$ANDROID_HOME"/build-tools/*/apksigner 2>/dev/null | sort -V | tail -1 || true)"
  if [ -n "$SIGNER" ]; then
    SHA="$("$SIGNER" verify --print-certs "$APK" 2>/dev/null | sed -n 's/.*SHA-256 digest: *//p' | head -1 | tr -d ' :' | tr 'a-f' 'A-F')"
  fi
fi
# Otherwise: the debug key itself.
if [ -z "$SHA" ] && [ -f "$HOME/.android/debug.keystore" ]; then
  KT="keytool"; [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/keytool" ] && KT="$JAVA_HOME/bin/keytool"
  SHA="$("$KT" -list -v -keystore "$HOME/.android/debug.keystore" -alias androiddebugkey -storepass android -keypass android 2>/dev/null \
    | sed -n 's/.*SHA256: *//p' | head -1 | tr -d ' :' | tr 'a-f' 'A-F')"
fi
[ -n "$SHA" ] || { echo "Could not read the app's signing key, so links will keep opening in the browser. Build the APK once, then run this again." >&2; exit 1; }

# AA:BB:CC... as Android expects it
PRETTY="$(echo "$SHA" | sed 's/../&:/g; s/:$//')"
mkdir -p public/.well-known
OUT="public/.well-known/assetlinks.json"
NEW="$(printf '[\n  {\n    "relation": ["delegate_permission/common.handle_all_urls"],\n    "target": {\n      "namespace": "android_app",\n      "package_name": "%s",\n      "sha256_cert_fingerprints": ["%s"]\n    }\n  }\n]\n' "$PKG" "$PRETTY")"
if [ -f "$OUT" ] && [ "$(cat "$OUT")" = "$NEW" ]; then
  echo "assetlinks.json is up to date ($PRETTY)"
else
  printf '%s' "$NEW" > "$OUT"
  echo "Wrote $OUT ($PRETTY). Push it so it is live, or links keep opening in the browser."
fi
