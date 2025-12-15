#!/bin/bash

# Subagent setup hook for Kingdom Builder
# Runs when subagents spawn (SubagentStart hook)
# Downloads crypto-gate binary so subagents can sign QA approvals
#
# SECURITY: This script should ONLY be invoked via the SubagentStart hook.
# Direct execution by agents is blocked by PreToolUse hook.

LOG="/tmp/claude-subagent-setup-hook.log"
echo "=== SubagentStart $(date -Iseconds) ===" >> "$LOG"

cd "$CLAUDE_PROJECT_DIR" || { echo "FAILED to cd" >> "$LOG"; exit 1; }

# ═══════════════════════════════════════════════════════════════════════════════
# DOWNLOAD CRYPTO-GATE BINARY (if not present)
# ═══════════════════════════════════════════════════════════════════════════════

CRYPTO_GATE_VERSION="0.3.0"
CRYPTO_GATE_REPO="Steffen-vdv/crypto-gate-releases"

download_crypto_gate() {
  local BIN_DIR="$CLAUDE_PROJECT_DIR/bin"

  # Determine OS
  case "$(uname -s)" in
    Linux*)  OS="linux" ;;
    Darwin*) OS="darwin" ;;
    MINGW*|CYGWIN*|MSYS*) OS="win" ;;
    *) echo "Unsupported OS: $(uname -s)" >> "$LOG"; return 1 ;;
  esac

  # Determine architecture
  case "$(uname -m)" in
    x86_64|amd64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) echo "Unsupported arch: $(uname -m)" >> "$LOG"; return 1 ;;
  esac

  # Construct binary name
  if [[ "$OS" == "win" ]]; then
    BINARY_NAME="crypto-gate-${OS}-${ARCH}.exe"
  else
    BINARY_NAME="crypto-gate-${OS}-${ARCH}"
  fi

  local BINARY_PATH="$BIN_DIR/$BINARY_NAME"

  # Skip if already exists
  if [[ -x "$BINARY_PATH" ]]; then
    echo "crypto-gate binary already exists: $BINARY_NAME" >> "$LOG"
    return 0
  fi

  echo "Downloading crypto-gate ($BINARY_NAME)..." >> "$LOG"

  # Ensure bin directory exists
  mkdir -p "$BIN_DIR"

  # Download using gh CLI
  if command -v gh &> /dev/null; then
    if gh release download "$CRYPTO_GATE_VERSION" \
        --repo "$CRYPTO_GATE_REPO" \
        --pattern "$BINARY_NAME" \
        --dir "$BIN_DIR" >> "$LOG" 2>&1; then
      chmod +x "$BINARY_PATH"
      echo "Successfully downloaded crypto-gate" >> "$LOG"
      return 0
    else
      echo "Failed to download crypto-gate via gh" >> "$LOG"
    fi
  else
    echo "gh CLI not found, trying curl..." >> "$LOG"
  fi

  # Fallback to curl (GitHub release URL pattern)
  local DOWNLOAD_URL="https://github.com/$CRYPTO_GATE_REPO/releases/download/$CRYPTO_GATE_VERSION/$BINARY_NAME"
  if curl -fsSL "$DOWNLOAD_URL" -o "$BINARY_PATH" >> "$LOG" 2>&1; then
    chmod +x "$BINARY_PATH"
    echo "Successfully downloaded crypto-gate via curl" >> "$LOG"
    return 0
  fi

  echo "WARNING: Failed to download crypto-gate binary" >> "$LOG"
  return 1
}

download_crypto_gate

echo "=== Completed $(date -Iseconds) ===" >> "$LOG"
exit 0
