#!/bin/bash

# Session start hook for Kingdom Builder
# Runs on first session start - installs dependencies

cd "$CLAUDE_PROJECT_DIR" || exit 1
source "$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/log.sh"

log_session "start" "SessionStart"

# Install dependencies if needed
if [ ! -d "$CLAUDE_PROJECT_DIR/node_modules" ]; then
  log_hook "start" "Installing dependencies with pnpm..."
  pnpm install --frozen-lockfile >> "$LOG_FILE" 2>&1
fi

# Initialize Husky if needed
[ ! -d "$CLAUDE_PROJECT_DIR/.husky/_" ] && pnpm run prepare >> "$LOG_FILE" 2>&1

# Register master-agent context
"$CLAUDE_PROJECT_DIR/.claude/agents/shared/scripts/context-manager/register-master-agent.sh"
log_hook "start" "Context set to master-agent"

# ═══════════════════════════════════════════════════════════════════════════════
# DOWNLOAD CRYPTO-GATE BINARY (if not present)
# Downloaded once by master-agent, used by all subagents for signing
# Config: config/crypto-gate.json
# ═══════════════════════════════════════════════════════════════════════════════

CRYPTO_GATE_CONFIG="$CLAUDE_PROJECT_DIR/config/crypto-gate.json"
CRYPTO_GATE_VERSION=$(jq -r '.version' "$CRYPTO_GATE_CONFIG")
CRYPTO_GATE_REPO=$(jq -r '.repository' "$CRYPTO_GATE_CONFIG")

download_crypto_gate() {
  local BIN_DIR="$CLAUDE_PROJECT_DIR/bin"

  # Determine OS
  case "$(uname -s)" in
    Linux*)  OS="linux" ;;
    Darwin*) OS="darwin" ;;
    MINGW*|CYGWIN*|MSYS*) OS="win" ;;
    *) log_hook "start" "Unsupported OS: $(uname -s)"; return 1 ;;
  esac

  # Determine architecture
  case "$(uname -m)" in
    x86_64|amd64) ARCH="x64" ;;
    arm64|aarch64) ARCH="arm64" ;;
    *) log_hook "start" "Unsupported arch: $(uname -m)"; return 1 ;;
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
    log_hook "start" "crypto-gate binary already exists: $BINARY_NAME"
    # Ensure symlink exists (idempotent)
    if [[ ! -L "$BIN_DIR/crypto-gate" ]]; then
      ln -sf "$BINARY_NAME" "$BIN_DIR/crypto-gate"
      log_hook "start" "Created missing symlink bin/crypto-gate -> $BINARY_NAME"
    fi
    return 0
  fi

  log_hook "start" "Downloading crypto-gate ($BINARY_NAME)..."

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
      log_hook "start" "Successfully downloaded crypto-gate (symlinked to bin/crypto-gate)"
      return 0
    else
      log_hook "start" "Failed to download crypto-gate via gh"
    fi
  else
    log_hook "start" "gh CLI not found, trying curl..."
  fi

  # Fallback to curl (GitHub release URL pattern)
  local DOWNLOAD_URL="https://github.com/$CRYPTO_GATE_REPO/releases/download/$CRYPTO_GATE_VERSION/$BINARY_NAME"
  if curl -fsSL "$DOWNLOAD_URL" -o "$BINARY_PATH" >> "$LOG_FILE" 2>&1; then
    chmod +x "$BINARY_PATH"
    ln -sf "$BINARY_NAME" "$BIN_DIR/crypto-gate"
    log_hook "start" "Successfully downloaded crypto-gate via curl (symlinked to bin/crypto-gate)"
    return 0
  fi

  log_hook "start" "WARNING: Failed to download crypto-gate binary"
  return 1
}

download_crypto_gate

log_session "start" "SessionStart" "completed"

# Output identity docs (injected into agent context)
IDENTITY_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/master-agent/docs/master-agent.md"
PROTOCOL_DOC="$CLAUDE_PROJECT_DIR/.claude/agents/shared/docs/agent-intercommunication-protocols.md"

cat << 'HEADER'
=== Master Agent Identity ===
The following is your identity document. You MUST follow these instructions.
Project rules in CLAUDE.md also apply.

HEADER

cat "$IDENTITY_DOC"

cat << 'PROTOCOL_HEADER'

=== Subagent Communication Protocol ===
When dispatching subagents (6 Phase 1 reviewers, review-lead, safe-deployment-gate),
you MUST follow the INPUT/OUTPUT formats defined below. All communication is pure JSON.

PROTOCOL_HEADER

cat "$PROTOCOL_DOC"

exit 0
