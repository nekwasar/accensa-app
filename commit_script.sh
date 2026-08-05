#!/bin/bash
set -e

git reset

# 1. Untracked files
if [ -f "apps/web/public/accensa-logo-no-bg.png" ]; then
  git add apps/web/public/accensa-logo-no-bg.png
  git commit -m "feat: add transparent brand logo"
fi

if [ -f "apps/web/public/accensa-logo.jpg" ]; then
  git add apps/web/public/accensa-logo.jpg
  git commit -m "feat: add primary brand logo"
fi

if [ -f "apps/web/src/app/icon.png" ]; then
  git add apps/web/src/app/icon.png
  git commit -m "feat: add dynamic favicon"
fi

if [ -f "apps/web/src/components/scroll-reveal.tsx" ]; then
  git add apps/web/src/components/scroll-reveal.tsx
  git commit -m "feat: add scroll reveal component"
fi

if [ -d "apps/web/src/app/coming-soon/" ]; then
  git add apps/web/src/app/coming-soon/
  git commit -m "feat: add coming soon placeholder page"
fi

# 2. Deletions
if [ -f "apps/web/src/app/favicon.ico" ]; then
  git rm apps/web/src/app/favicon.ico
  git commit -m "chore: remove default favicon"
else
  # It might already be deleted from working tree, check if git knows
  if git status | grep -q "deleted:    apps/web/src/app/favicon.ico"; then
    git rm apps/web/src/app/favicon.ico
    git commit -m "chore: remove default favicon"
  fi
fi

# 3. Interactive hunks
i=1
while ! git diff --quiet; do
  printf "y\nq\n" | git add -p || true
  
  staged_file=$(git diff --cached --name-only | head -n 1)
  if [ -z "$staged_file" ]; then
    echo "No files staged. Committing remaining..."
    git add -u
    git commit -m "style: finalize remaining UI updates"
    break
  fi
  
  git commit -m "style: incremental UI update to $(basename "$staged_file") (part $i)"
  ((i++))
done

echo "Pushing to remote..."
git push origin main
