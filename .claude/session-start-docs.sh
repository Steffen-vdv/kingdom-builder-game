#!/bin/bash

# SessionStart Hook: Auto-load project documentation context
# This script runs automatically when Claude Code starts a new session
# and injects critical documentation files into the context.

# Ensure dependencies and Husky git hooks are properly initialized
# This handles fresh clones or cases where npm install wasn't run
if [ ! -d "node_modules" ]; then
  # Full install needed - no node_modules at all
  npm install 2>/dev/null || true
elif [ ! -d ".husky/_" ]; then
  # Dependencies exist but Husky not initialized
  npm run prepare 2>/dev/null || true
fi

{
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║          PROJECT DOCUMENTATION CONTEXT AUTO-LOADED             ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo ""

  # Load README.md
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "📄 README.md"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f "$(pwd)/README.md" ]; then
    cat "$(pwd)/README.md"
  else
    echo "⚠️  README.md not found"
  fi
  echo ""
  echo ""

  # Load AGENTS.md
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🤖 AGENTS.md"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f "$(pwd)/AGENTS.md" ]; then
    cat "$(pwd)/AGENTS.md"
  else
    echo "⚠️  AGENTS.md not found"
  fi
  echo ""
  echo ""

  # Load docs/agent-quick-start.md
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🚀 docs/agent-quick-start.md"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f "$(pwd)/docs/agent-quick-start.md" ]; then
    cat "$(pwd)/docs/agent-quick-start.md"
  else
    echo "⚠️  docs/agent-quick-start.md not found"
  fi
  echo ""
  echo ""

  # Load docs/text-formatting.md
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✍️  docs/text-formatting.md"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f "$(pwd)/docs/text-formatting.md" ]; then
    cat "$(pwd)/docs/text-formatting.md"
  else
    echo "⚠️  docs/text-formatting.md not found"
  fi
  echo ""
  echo ""

  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║            CONTEXT LOADING COMPLETE ✅                          ║"
  echo "╚════════════════════════════════════════════════════════════════╝"

} | head -c 150000  # Limit output to 150K characters to stay within context budgets

exit 0
