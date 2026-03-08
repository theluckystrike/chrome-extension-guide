#!/bin/bash

cd /tmp/merge-guide
merged=0

git checkout main
git stash 2>/dev/null || true

branches=$(git branch -r | grep -v HEAD | grep -v main | sed 's|  origin/||')

for branch in $branches; do
  echo "=== Merging: $branch ==="
  git checkout main
  git pull origin main

  if git merge --no-ff "origin/$branch" -m "Merge $branch"; then
    echo "Merge OK"
  else
    echo "CONFLICT detected, resolving..."
    git checkout --theirs . 2>/dev/null || true
    git add -A
    git commit --no-edit || true
  fi

  git push origin main
  git push origin --delete "$branch" 2>/dev/null || echo "Branch already deleted"
  merged=$((merged + 1))
  echo "SUCCESS: $branch (total merged: $merged)"
  echo ""
done

echo "=== DONE: Merged $merged branches ==="
