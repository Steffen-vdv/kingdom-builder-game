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

  # Load CLAUDE.md - THE source of truth for AI agents
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🤖 CLAUDE.md (AI Agent Operating Manual)"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if [ -f "$(pwd)/CLAUDE.md" ]; then
    cat "$(pwd)/CLAUDE.md"
  else
    echo "⚠️  CLAUDE.md not found - this is critical!"
  fi
  echo ""
  echo ""

  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║            CONTEXT LOADING COMPLETE ✅                          ║"
  echo "╚════════════════════════════════════════════════════════════════╝"

} | head -c 150000  # Limit output to 150K characters to stay within context budgets

exit 0
