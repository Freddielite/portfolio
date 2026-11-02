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
echo "1/5 Pulling your latest edits from GitHub (branch: $BRANCH)..."
git pull --rebase origin "$BRANCH"

echo "2/5 Unpacking the zip..."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q "$ZIP" -d "$TMP"
SRC="$(dirname "$(find "$TMP" -maxdepth 3 -name package.json -not -path '*/node_modules/*' | head -1)")"
[ -f "$SRC/package.json" ] || { echo "Could not find the project inside the zip."; exit 1; }

echo "3/5 Copying code, keeping your admin content..."
# Code files are copied over. Content (the content/ folder, plus the older
# src/data/*.json location, images and the CV) is only ever ADDED when missing,
# never overwritten, so your /admin edits always win.
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
    content/*|src/data/*.json|public/images/*|public/cv.pdf)
      if [ -e "$dest" ]; then kept=$((kept + 1)); else cp "$SRC/$rel" "$dest"; copied=$((copied + 1)); fi ;;
    *)
      cp "$SRC/$rel" "$dest"; copied=$((copied + 1)) ;;
  esac
done < <(cd "$SRC" && find . -type f -print0)
echo "   copied $copied files, kept $kept of your content files untouched"

echo "4/5 Moving content to the content/ folder (one-time, safe to repeat)..."
moved=0
for t in siteSettings projects skills testimonials posts drafts; do
  old="src/data/$t.json"
  new="content/$t.json"
  if [ -f "$old" ] && [ ! -f "$new" ]; then
    mkdir -p content
    if git ls-files --error-unmatch "$old" >/dev/null 2>&1; then git mv "$old" "$new"; else mv "$old" "$new"; fi
    moved=$((moved + 1))
  elif [ -f "$old" ] && [ -f "$new" ]; then
    # The new location wins. Drop the stale old copy so it cannot confuse anyone.
    if git ls-files --error-unmatch "$old" >/dev/null 2>&1; then git rm -q "$old"; else rm "$old"; fi
  fi
done
echo "   moved $moved content file(s)"
[ -f content/siteSettings.json ] || echo "WARNING: content/siteSettings.json is missing. Your site will not build until it exists."

echo "5/5 Done. What changed:"
git status --short
echo
echo "If package.json changed, run: npm install"
echo "Then: git add . && git commit -m \"your message\" && git push"
