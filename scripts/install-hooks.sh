#!/usr/bin/env bash
# Install git hooks for PolityMarket development
set -e

HOOKS_DIR="$(git rev-parse --git-dir)/hooks"

cat > "$HOOKS_DIR/pre-push" << 'HOOK'
#!/usr/bin/env bash
# Pre-push hook: validate pipeline prompt/schema consistency
# This prevents broken pipeline changes from reaching main.

remote="$1"
branch="$(git rev-parse --abbrev-ref HEAD)"

# Only run on pushes that target main (direct or via PR branch)
echo "🔍 Pre-push: validating pipeline prompt & schema consistency..."
npx vitest run data-pipeline/pipeline.prompt-validation.test.js --reporter=dot 2>&1
if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Pipeline validation failed! Fix the issues above before pushing."
  echo "   Run: npx vitest run data-pipeline/pipeline.prompt-validation.test.js --reporter=verbose"
  exit 1
fi
echo "✅ Pipeline validation passed."
HOOK

chmod +x "$HOOKS_DIR/pre-push"
echo "✅ Pre-push hook installed at $HOOKS_DIR/pre-push"
