#!/bin/bash

# Subagent setup hook for Kingdom Builder
# Downloads crypto-gate binary so subagents can sign QA approvals

# Read stdin FIRST before cd (stdin may not survive cd in some shells)
HOOK_INPUT=$(cat)

cd "$CLAUDE_PROJECT_DIR" || exit 1
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"

# Extract agent_type from hook input
AGENT_TYPE=$(echo "$HOOK_INPUT" | jq -r '.agent_type // empty' 2>/dev/null)

log_session "subagent:$AGENT_TYPE" "SubagentStart"

# Register subagent context (only for custom agents)
"$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager/register-subagent.sh" "$AGENT_TYPE"

# ═══════════════════════════════════════════════════════════════════════════════
# DOWNLOAD CRYPTO-GATE BINARY (if not present)
# ═══════════════════════════════════════════════════════════════════════════════

CRYPTO_GATE_VERSION="0.5.0"
CRYPTO_GATE_REPO="Steffen-vdv/crypto-gate-releases"

download_crypto_gate() {
  local BIN_DIR="$CLAUDE_PROJECT_DIR/bin"

  # Determine OS
  case "$(uname -s)" in
    Linux*)  OS="linux" ;;
    Darwin*) OS="darwin" ;;
    MINGW*|CYGWIN*|MSYS*) OS="win" ;;
    *) log_hook "subagent:$AGENT_TYPE" "Unsupported OS: $(uname -s)"; return 1 ;;
  esac

  # Determine architecture
  case "$(uname -m)" in
    x86_64|amd64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) log_hook "subagent:$AGENT_TYPE" "Unsupported arch: $(uname -m)"; return 1 ;;
  esac

  # Construct binary name
  if [[ "$OS" == "win" ]]; then
    BINARY_NAME="crypto-gate-${OS}-${ARCH}.exe"
  else
    BINARY_NAME="crypto-gate-${OS}-${ARCH}"
  fi

  local BINARY_PATH="$BIN_DIR/$BINARY_NAME"

  # Skip download if already exists, but ensure symlink exists
  if [[ -x "$BINARY_PATH" ]]; then
    log_hook "subagent:$AGENT_TYPE" "crypto-gate binary already exists: $BINARY_NAME"
    # Ensure symlink exists (idempotent)
    if [[ ! -L "$BIN_DIR/crypto-gate" ]]; then
      ln -sf "$BINARY_NAME" "$BIN_DIR/crypto-gate"
      log_hook "subagent:$AGENT_TYPE" "Created missing symlink bin/crypto-gate -> $BINARY_NAME"
    fi
    return 0
  fi

  log_hook "subagent:$AGENT_TYPE" "Downloading crypto-gate ($BINARY_NAME)..."

  # Ensure bin directory exists
  mkdir -p "$BIN_DIR"

  # Download using gh CLI
  if command -v gh &> /dev/null; then
    if gh release download "$CRYPTO_GATE_VERSION" \
        --repo "$CRYPTO_GATE_REPO" \
        --pattern "$BINARY_NAME" \
        --dir "$BIN_DIR" >> "$LOG_FILE" 2>&1; then
      chmod +x "$BINARY_PATH"
      ln -sf "$BINARY_NAME" "$BIN_DIR/crypto-gate"
      log_hook "subagent:$AGENT_TYPE" "Successfully downloaded crypto-gate (symlinked to bin/crypto-gate)"
      return 0
    else
      log_hook "subagent:$AGENT_TYPE" "Failed to download crypto-gate via gh"
    fi
  else
    log_hook "subagent:$AGENT_TYPE" "gh CLI not found, trying curl..."
  fi

  # Fallback to curl (GitHub release URL pattern)
  local DOWNLOAD_URL="https://github.com/$CRYPTO_GATE_REPO/releases/download/$CRYPTO_GATE_VERSION/$BINARY_NAME"
  if curl -fsSL "$DOWNLOAD_URL" -o "$BINARY_PATH" >> "$LOG_FILE" 2>&1; then
    chmod +x "$BINARY_PATH"
    ln -sf "$BINARY_NAME" "$BIN_DIR/crypto-gate"
    log_hook "subagent:$AGENT_TYPE" "Successfully downloaded crypto-gate via curl (symlinked to bin/crypto-gate)"
    return 0
  fi

  log_hook "subagent:$AGENT_TYPE" "WARNING: Failed to download crypto-gate binary"
  return 1
}

download_crypto_gate

log_session "subagent:$AGENT_TYPE" "SubagentStart" "completed"

# Output protocol spec (injected into subagent context)
PROTOCOL_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/shared/docs/agent-intercommunication-protocols.md"

cat << 'PROTOCOL_HEADER'
=== Subagent Communication Protocol ===
Before completing your session, you MUST write your structured output to a JSON file.
Your chat output can be free-form narrative — only the JSON file matters for data exchange.
See the OUTPUT format section below for file path and schema.

PROTOCOL_HEADER

cat "$PROTOCOL_DOC"

exit 0
