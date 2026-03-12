#!/usr/bin/env bash
# Run from project root: ./scripts/git-init-and-commit.sh
# Initializes git, stages files, and creates the first commit.

set -e
cd "$(dirname "$0")/.."

if [ -d .git ]; then
  echo "Git is already initialized."
else
  git init
  echo "Git initialized."
fi

git add .
git status

echo ""
echo "Creating initial commit..."
git commit -m "Initial commit: LaunchNYC Next.js app" || {
  echo ""
  echo "If commit failed due to user.name/user.email, run:"
  echo "  git config user.email 'your@email.com'"
  echo "  git config user.name 'Your Name'"
  echo "Then run this script again."
  exit 1
}

echo ""
echo "Done. Next steps:"
echo "  1. Create a repo at https://github.com/new named 'launchnyc'"
echo "  2. Run:"
echo "     git remote add origin https://github.com/YOUR_USERNAME/launchnyc.git"
echo "     git branch -M main"
echo "     git push -u origin main"
echo "  3. Connect the repo to Vercel at https://vercel.com (see DEPLOY.md)"
