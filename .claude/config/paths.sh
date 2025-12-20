#!/bin/bash
#
# paths.sh — Single source of truth for QA workflow paths
#
# Source this file in any script that needs QA paths:
#   source "$CLAUDE_PROJECT_DIR/.claude/config/paths.sh"
#
# All paths can be overridden via environment variables for testing.
#

# QA workflow directories
QA_CURRENT_DIR="${QA_CURRENT_DIR:-/tmp/claude/qa/current}"
QA_DELTA_DIR="${QA_DELTA_DIR:-/tmp/claude/qa/current/delta}"
QA_OUTPUT_DIR="${QA_OUTPUT_DIR:-/tmp/claude/sub-agents/output}"

# Logging
QA_PROMPT_LOG_FILE="${QA_PROMPT_LOG_FILE:-/tmp/claude/qa/prompts.jsonl}"
HOOK_LOG_FILE="${HOOK_LOG_FILE:-/tmp/claude/hooks/central.log}"
HOOK_LOG_LOCK="${HOOK_LOG_LOCK:-/tmp/claude/hooks/.central.log.lock}"

# Context manager
CONTEXT_MANAGER_DIR="${CONTEXT_MANAGER_DIR:-/tmp/claude/context-manager}"

# Agent config (JSON) - use pwd fallback if CLAUDE_PROJECT_DIR not set
QA_AGENTS_CONFIG="${QA_AGENTS_CONFIG:-${CLAUDE_PROJECT_DIR:-.}/.claude/config/qa-agents.json}"

# Helper: Initialize all required directories
qa_init_dirs() {
	mkdir -p "$QA_CURRENT_DIR"
	mkdir -p "$QA_DELTA_DIR"
	mkdir -p "$QA_OUTPUT_DIR"
	mkdir -p "$(dirname "$QA_PROMPT_LOG_FILE")"
	mkdir -p "$(dirname "$HOOK_LOG_FILE")"
	mkdir -p "$CONTEXT_MANAGER_DIR"
}
