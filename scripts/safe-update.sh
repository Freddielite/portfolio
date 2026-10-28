#!/usr/bin/env bash
# Apply a portfolio.zip update WITHOUT overwriting content you edited in /admin.
#
# The admin saves edits straight to GitHub (src/data/*.json, public/cv.pdf and
# public/images/*). Unzipping a new zip over your folder would replace them with
# older copies. This script pulls your latest edits first, then copies only the
# code from the zip, and only ADDS content files that do not exist yet.
#
# Usage (from anywhere inside your repo):
#   ./scripts/safe-update.sh ~/Downloads/portfolio.zip
set -euo pipefail

ZIP="${1:-}"
if [ -z "$ZIP" ] || [ ! -f "$ZIP" ]; then
  echo "Usage: scripts/safe-update.sh path/to/portfolio.zip"
  exit 1
fi

cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes. Commit or stash them first, then run this again."
  exit 1
fi

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
echo "1/4 Pulling your latest edits from GitHub (branch: $BRANCH)..."
git pull --rebase origin "$BRANCH"

echo "2/4 Unpacking the zip..."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q "$ZIP" -d "$TMP"
SRC="$(dirname "$(find "$TMP" -maxdepth 3 -name package.json -not -path '*/node_modules/*' | head -1)")"
[ -f "$SRC/package.json" ] || { echo "Could not find the project inside the zip."; exit 1; }

echo "3/4 Copying code, keeping your admin content..."
# Code files are copied over. Content files (src/data, public/images, public/cv.pdf)
# are only added when they do not exist yet, never overwritten.
copied=0
kept=0
while IFS= read -r -d '' file; do
  rel="${file#./}"
  case "$rel" in
    .git/*|node_modules/*|dist/*) continue ;;
  esac
  dest="$rel"
  mkdir -p "$(dirname "$dest")"
  case "$rel" in
    src/data/*|public/images/*|public/cv.pdf)
      if [ -e "$dest" ]; then kept=$((kept + 1)); else cp "$SRC/$rel" "$dest"; copied=$((copied + 1)); fi ;;
    *)
      cp "$SRC/$rel" "$dest"; copied=$((copied + 1)) ;;
  esac
done < <(cd "$SRC" && find . -type f -print0)
echo "   copied $copied files, kept $kept of your content files untouched"

echo "4/4 Done. What changed:"
git status --short
echo
echo "If package.json changed, run: npm install"
echo "Then: git add . && git commit -m \"your message\" && git push"
