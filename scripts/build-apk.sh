#!/usr/bin/env bash
# Builds the Android app and saves it as ~/Downloads/portfolio-admin.apk
# Run it from anywhere:  bash scripts/build-apk.sh
# Needs: Android Studio (for the Android SDK and its Java 21), and internet the first time.
set -euo pipefail
cd "$(dirname "$0")/.."

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

# ---- Java 21 (Android Studio ships one)
java_major() { "$1/bin/java" -version 2>&1 | sed -n '1s/.*"\([0-9]*\)[."].*/\1/p'; }
JDK=""
candidates=("${JAVA_HOME:-}" "$HOME/android-studio/jbr" "/opt/android-studio/jbr" "/usr/local/android-studio/jbr" "/snap/android-studio/current/android-studio/jbr")
for d in "$HOME"/.local/share/JetBrains/Toolbox/apps/*/ch-*/*/jbr /usr/lib/jvm/*21* /usr/lib/jvm/*jdk-2[1-9]*; do candidates+=("$d"); done
if command -v java >/dev/null 2>&1; then candidates+=("$(dirname "$(dirname "$(readlink -f "$(command -v java)")")")"); fi
for d in "${candidates[@]}"; do
  [ -n "$d" ] && [ -x "$d/bin/java" ] || continue
  v="$(java_major "$d" || true)"
  if [ -n "$v" ] && [ "$v" -ge 21 ]; then JDK="$d"; break; fi
done
[ -n "$JDK" ] || die "Java 21 or newer not found. Install Android Studio (it includes one) or set JAVA_HOME to a JDK 21."
export JAVA_HOME="$JDK"
echo "Java: $JAVA_HOME"

# ---- Android SDK
SDK=""
for d in "${ANDROID_HOME:-}" "${ANDROID_SDK_ROOT:-}" "$HOME/Android/Sdk" "$HOME/.android/sdk" "/opt/android-sdk"; do
  [ -n "$d" ] && [ -d "$d/platforms" -o -d "$d/platform-tools" ] && { SDK="$d"; break; }
done
[ -n "$SDK" ] || die "Android SDK not found. Open Android Studio once and finish its setup (it installs the SDK in ~/Android/Sdk), or set ANDROID_HOME."
export ANDROID_HOME="$SDK"
echo "SDK:  $ANDROID_HOME"
printf 'sdk.dir=%s\n' "$SDK" > android/local.properties
if [ -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --licenses >/dev/null 2>&1 || true; fi

say "Installing packages"
npm install --no-audit --no-fund

say "Syncing the Android project"
npx cap sync android

say "Building the APK (the first run downloads Gradle and takes a few minutes)"
chmod +x android/gradlew
( cd android && ./gradlew assembleDebug --console=plain )

APK="android/app/build/outputs/apk/debug/app-debug.apk"
[ -f "$APK" ] || die "The build finished but the APK was not found at $APK"
OUT="$HOME/Downloads/portfolio-admin.apk"
mkdir -p "$HOME/Downloads"
cp "$APK" "$OUT"
say "Done: $OUT ($(du -h "$OUT" | cut -f1))"
if command -v adb >/dev/null 2>&1 && [ -n "$(adb devices | sed -n '2p' | cut -f1)" ]; then
  echo "A phone is connected. Install it with:  adb install -r \"$OUT\""
else
  echo "Copy that file to your phone and open it, or connect the phone with USB debugging and run:  adb install -r \"$OUT\""
fi
