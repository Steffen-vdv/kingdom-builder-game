#!/bin/bash
# Tests for the context-manager system
#
# This test suite verifies the atomic counter-based context management
# that prevents race conditions when parallel subagents complete.
#
# Run: bash .claude/tests/context-manager.test.sh
# Exit: 0 on success, non-zero on failure

set -e

# =============================================================================
# Test Framework
# =============================================================================

TESTS_RUN=0
TESTS_PASSED=0

# Colors for output (disabled if not a terminal)
if [[ -t 1 ]]; then
	GREEN='\033[0;32m'
	RED='\033[0;31m'
	YELLOW='\033[0;33m'
	NC='\033[0m'
else
	GREEN=''
	RED=''
	YELLOW=''
	NC=''
fi

assert_equals() {
	local actual="$1"
	local expected="$2"
	local message="$3"
	TESTS_RUN=$((TESTS_RUN + 1))
	if [[ "$actual" != "$expected" ]]; then
		echo -e "${RED}FAIL${NC}: $message"
		echo "  Expected: '$expected'"
		echo "  Actual:   '$actual'"
		return 1
	fi
	TESTS_PASSED=$((TESTS_PASSED + 1))
	echo -e "${GREEN}PASS${NC}: $message"
	return 0
}

assert_file_exists() {
	local file="$1"
	local message="$2"
	TESTS_RUN=$((TESTS_RUN + 1))
	if [[ -f "$file" ]]; then
		TESTS_PASSED=$((TESTS_PASSED + 1))
		echo -e "${GREEN}PASS${NC}: $message"
		return 0
	fi
	echo -e "${RED}FAIL${NC}: $message"
	echo "  File does not exist: $file"
	return 1
}

assert_dir_exists() {
	local dir="$1"
	local message="$2"
	TESTS_RUN=$((TESTS_RUN + 1))
	if [[ -d "$dir" ]]; then
		TESTS_PASSED=$((TESTS_PASSED + 1))
		echo -e "${GREEN}PASS${NC}: $message"
		return 0
	fi
	echo -e "${RED}FAIL${NC}: $message"
	echo "  Directory does not exist: $dir"
	return 1
}

assert_greater_than() {
	local actual="$1"
	local threshold="$2"
	local message="$3"
	TESTS_RUN=$((TESTS_RUN + 1))
	if [[ "$actual" -gt "$threshold" ]]; then
		TESTS_PASSED=$((TESTS_PASSED + 1))
		echo -e "${GREEN}PASS${NC}: $message"
		return 0
	fi
	echo -e "${RED}FAIL${NC}: $message"
	echo "  Expected > $threshold, got $actual"
	return 1
}

# =============================================================================
# Test Setup
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONTEXT_MANAGER="$REPO_ROOT/.claude/agents/shared/scripts/context-manager"

# Create isolated test environment
TEST_DIR=$(mktemp -d)
export XDG_RUNTIME_DIR="$TEST_DIR"

cleanup() {
	rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo "=============================================="
echo "Context Manager Test Suite"
echo "=============================================="
echo "Test directory: $TEST_DIR"
echo ""

# Helper to read state values
get_context() {
	bash "$CONTEXT_MANAGER/get-context.sh"
}

get_count() {
	local state_file="$TEST_DIR/claude/context-manager/state.json"
	if [[ -f "$state_file" ]]; then
		jq -r '.subagent_count // 0' "$state_file"
	else
		echo "0"
	fi
}

# =============================================================================
# Test 1: Initialization
# =============================================================================

echo -e "${YELLOW}Test 1: Initialization${NC}"

# Run init
bash "$CONTEXT_MANAGER/init.sh"

assert_dir_exists "$TEST_DIR/claude/context-manager" \
	"init.sh creates state directory"

assert_file_exists "$TEST_DIR/claude/context-manager/state.json" \
	"init.sh creates state.json file"

assert_file_exists "$TEST_DIR/claude/context-manager/.lock" \
	"init.sh creates lock file"

# Verify initial state
INITIAL_CONTEXT=$(get_context)
INITIAL_COUNT=$(get_count)

assert_equals "$INITIAL_CONTEXT" "hypervisor" \
	"Initial context is 'hypervisor'"

assert_equals "$INITIAL_COUNT" "0" \
	"Initial subagent count is 0"

echo ""

# =============================================================================
# Test 2: Hypervisor Registration
# =============================================================================

echo -e "${YELLOW}Test 2: Hypervisor Registration${NC}"

# First dirty the state
bash "$CONTEXT_MANAGER/register-subagent.sh"
bash "$CONTEXT_MANAGER/register-subagent.sh"

# Now register hypervisor (should reset everything)
bash "$CONTEXT_MANAGER/register-hypervisor.sh"

CONTEXT=$(get_context)
COUNT=$(get_count)

assert_equals "$CONTEXT" "hypervisor" \
	"register-hypervisor.sh sets context to 'hypervisor'"

assert_equals "$COUNT" "0" \
	"register-hypervisor.sh resets count to 0"

echo ""

# =============================================================================
# Test 3: Subagent Registration
# =============================================================================

echo -e "${YELLOW}Test 3: Subagent Registration${NC}"

# Start fresh
bash "$CONTEXT_MANAGER/register-hypervisor.sh"

# Register first subagent
bash "$CONTEXT_MANAGER/register-subagent.sh"

CONTEXT=$(get_context)
COUNT=$(get_count)

assert_equals "$CONTEXT" "subagent" \
	"First subagent switches context to 'subagent'"

assert_equals "$COUNT" "1" \
	"First subagent sets count to 1"

# Register second subagent
bash "$CONTEXT_MANAGER/register-subagent.sh"

CONTEXT=$(get_context)
COUNT=$(get_count)

assert_equals "$CONTEXT" "subagent" \
	"Second subagent keeps context as 'subagent'"

assert_equals "$COUNT" "2" \
	"Second subagent increments count to 2"

# Register third subagent
bash "$CONTEXT_MANAGER/register-subagent.sh"

COUNT=$(get_count)

assert_equals "$COUNT" "3" \
	"Third subagent increments count to 3"

echo ""

# =============================================================================
# Test 4: Subagent Unregistration
# =============================================================================

echo -e "${YELLOW}Test 4: Subagent Unregistration${NC}"

# State: count=3, context=subagent from previous test

# Unregister one subagent
bash "$CONTEXT_MANAGER/unregister-subagent.sh"

CONTEXT=$(get_context)
COUNT=$(get_count)

assert_equals "$COUNT" "2" \
	"First unregister decrements count to 2"

assert_equals "$CONTEXT" "subagent" \
	"Context remains 'subagent' when count > 0"

# Unregister another
bash "$CONTEXT_MANAGER/unregister-subagent.sh"

CONTEXT=$(get_context)
COUNT=$(get_count)

assert_equals "$COUNT" "1" \
	"Second unregister decrements count to 1"

assert_equals "$CONTEXT" "subagent" \
	"Context remains 'subagent' when count = 1"

echo ""

# =============================================================================
# Test 5: Context Restoration (count reaches 0)
# =============================================================================

echo -e "${YELLOW}Test 5: Context Restoration${NC}"

# State: count=1, context=subagent from previous test

# Unregister last subagent
bash "$CONTEXT_MANAGER/unregister-subagent.sh"

CONTEXT=$(get_context)
COUNT=$(get_count)

assert_equals "$COUNT" "0" \
	"Final unregister decrements count to 0"

assert_equals "$CONTEXT" "hypervisor" \
	"Context restored to 'hypervisor' when count = 0"

echo ""

# =============================================================================
# Test 6: Parallel Simulation
# =============================================================================

echo -e "${YELLOW}Test 6: Parallel Simulation${NC}"

# Reset state
bash "$CONTEXT_MANAGER/register-hypervisor.sh"

# Simulate 5 parallel subagents starting
for i in {1..5}; do
	bash "$CONTEXT_MANAGER/register-subagent.sh" &
done
wait

COUNT=$(get_count)
CONTEXT=$(get_context)

assert_equals "$COUNT" "5" \
	"Parallel registration: count is 5 after 5 parallel starts"

assert_equals "$CONTEXT" "subagent" \
	"Parallel registration: context is 'subagent'"

# Simulate 3 subagents completing (2 still running)
for i in {1..3}; do
	bash "$CONTEXT_MANAGER/unregister-subagent.sh" &
done
wait

COUNT=$(get_count)
CONTEXT=$(get_context)

assert_equals "$COUNT" "2" \
	"Parallel unregistration: count is 2 after 3 completions"

assert_equals "$CONTEXT" "subagent" \
	"Parallel unregistration: context remains 'subagent' while subagents active"

# Complete remaining 2
bash "$CONTEXT_MANAGER/unregister-subagent.sh" &
bash "$CONTEXT_MANAGER/unregister-subagent.sh" &
wait

COUNT=$(get_count)
CONTEXT=$(get_context)

assert_equals "$COUNT" "0" \
	"All parallel subagents complete: count is 0"

assert_equals "$CONTEXT" "hypervisor" \
	"All parallel subagents complete: context restored to 'hypervisor'"

echo ""

# =============================================================================
# Test 7: Counter Floor (never goes below 0)
# =============================================================================

echo -e "${YELLOW}Test 7: Counter Floor${NC}"

# Reset to hypervisor state (count=0)
bash "$CONTEXT_MANAGER/register-hypervisor.sh"

# Try to unregister when count is already 0
bash "$CONTEXT_MANAGER/unregister-subagent.sh"

COUNT=$(get_count)

assert_equals "$COUNT" "0" \
	"Count stays at 0 when unregistering with count=0"

# Try multiple times
bash "$CONTEXT_MANAGER/unregister-subagent.sh"
bash "$CONTEXT_MANAGER/unregister-subagent.sh"
bash "$CONTEXT_MANAGER/unregister-subagent.sh"

COUNT=$(get_count)
CONTEXT=$(get_context)

assert_equals "$COUNT" "0" \
	"Count never goes negative after multiple unregisters"

assert_equals "$CONTEXT" "hypervisor" \
	"Context remains 'hypervisor' after floor condition"

echo ""

# =============================================================================
# Test 8: State Persistence
# =============================================================================

echo -e "${YELLOW}Test 8: State Persistence${NC}"

# Set up specific state
bash "$CONTEXT_MANAGER/register-hypervisor.sh"
bash "$CONTEXT_MANAGER/register-subagent.sh"
bash "$CONTEXT_MANAGER/register-subagent.sh"

# Record expected values
EXPECTED_COUNT=2
EXPECTED_CONTEXT="subagent"

# Wait a moment (simulate time passing)
sleep 0.1

# Read state in new subshell (simulates new process)
PERSISTED_COUNT=$(bash -c "source '$CONTEXT_MANAGER/state.sh' && jq -r '.subagent_count' '$TEST_DIR/claude/context-manager/state.json'")
PERSISTED_CONTEXT=$(bash -c "bash '$CONTEXT_MANAGER/get-context.sh'")

assert_equals "$PERSISTED_COUNT" "$EXPECTED_COUNT" \
	"State count persists across processes"

assert_equals "$PERSISTED_CONTEXT" "$EXPECTED_CONTEXT" \
	"State context persists across processes"

# Verify state file has all expected fields
HAS_TIMESTAMP=$(jq -r '.last_updated' "$TEST_DIR/claude/context-manager/state.json")
TESTS_RUN=$((TESTS_RUN + 1))
if [[ -n "$HAS_TIMESTAMP" && "$HAS_TIMESTAMP" != "null" ]]; then
	TESTS_PASSED=$((TESTS_PASSED + 1))
	echo -e "${GREEN}PASS${NC}: State file includes last_updated timestamp"
else
	echo -e "${RED}FAIL${NC}: State file missing last_updated timestamp"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================

echo "=============================================="
echo "Test Summary"
echo "=============================================="
echo "Tests run:    $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $((TESTS_RUN - TESTS_PASSED))"
echo ""

if [[ $TESTS_PASSED -eq $TESTS_RUN ]]; then
	echo -e "${GREEN}All tests passed!${NC}"
	exit 0
else
	echo -e "${RED}Some tests failed.${NC}"
	exit 1
fi
