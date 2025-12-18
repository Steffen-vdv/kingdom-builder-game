# Agent Intercommunication Protocols

Single source of truth for all master↔subagent communication formats.

Injected into:

- master-agent (master-session-start.sh)
- all subagents (subagent-session-start.sh)

---

## Protocol Rules

1. Master-agent dispatches subagents with structured INPUT (pure JSON prompt)
2. Subagents write structured OUTPUT to a JSON file before completing
3. Post-hook validates JSON format; master-agent reads directly

IMPORTANT:

- Subagent chat output may be verbose and narrative
- Only the JSON output file is used for structured decisions

---

## Three-Phase Workflow Overview

```
Phase 1 (parallel):  6 reviewers → 6 signatures
Phase 2 (sequential): review-lead → 1 final signature
Phase 3 (sequential): safe-deployment-gate → push
```

---

## Input Format (master → subagent)

Master-agent prompt MUST be a pure JSON string — nothing else.

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"...": "agent-specific fields"
}
```

Notes:

- The backticks above are documentation-only
- The actual prompt contains raw JSON
- No markdown, no prefixes, no surrounding text

---

## Output Format (subagent → file)

Before completing, subagents MUST write structured output to a JSON file.

File path:

```text
/tmp/claude/sub-agents/output/{agent}.json
```

Where `{agent}` is the subagent identifier:

**Phase 1 Reviewers:**

- review-ci-tests-required
- review-claims-auditor
- review-contracts-boundaries
- review-mechanics-content
- review-infra-concurrency
- review-tests-docs-dry

**Phase 2 Aggregator:**

- review-lead

**Phase 3 Deployment:**

- safe-deployment-gate

How to write the file:

**USE THE HELPER SCRIPTS:**

```bash
# Step 1: Sign your verdict (ALL verdicts, not just APPROVED)
SIGN_OUTPUT=$(sign.sh '<summary>' '<signature_type>' --verdict '<VERDICT>' [--blockers '<json>'] [--questions '<json>'])
PAYLOAD=$(echo "$SIGN_OUTPUT" | jq -r '.payload')
SIGNATURE=$(echo "$SIGN_OUTPUT" | jq -r '.signature')

# Step 2: Write output file
write-output.sh '<agent>' \
  --verdict '<VERDICT>' \
  --summary '<summary>' \
  --type '<signature_type>' \
  --payload "$PAYLOAD" \
  --signature "$SIGNATURE" \
  [--blockers '<json>'] \
  [--details '<json>']
```

Run `sign.sh` or `write-output.sh` without arguments to see full usage.

**Why sign all verdicts?**

- Enables delta review in subsequent rounds (see Delta Review Protocol below)
- Agent can prove what it decided before without re-analyzing everything
- Speeds up fix-and-retry workflows significantly

Rules:

- Chat output may be free-form
- Only the JSON file is parsed by hooks
- Missing or invalid JSON causes downstream failure

---

## Phase 1 Reviewers (6-Agent Family)

All Phase 1 reviewers share the SAME input schema and the SAME output schema.

### Phase 1 Agent Identifiers

- review-ci-tests-required (CI/test runner)
- review-claims-auditor
- review-contracts-boundaries
- review-mechanics-content
- review-infra-concurrency
- review-tests-docs-dry

---

## Phase 1 Input Schema (shared by all 6 Phase 1 agents)

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"original_request": "What the user originally asked for",
	"changes_summary": "What the coder implemented",
	"user_approval": "What user explicitly approved, or null",
	"files_changed": ["path/to/file1.ts", "path/to/file2.ts"]
}
```

Rules:

- `files_changed` is REQUIRED
- Agents may ignore fields but must not require additional ones

**Exception:** review-ci-tests-required only requires `branch`, `commits`, and
`files_changed`. Other fields are optional for it.

---

## Phase 1 Output Schema (shared by all 6 Phase 1 agents)

Each Phase 1 agent MUST write the following structure to `{agent}.json`:

```json
{
	"agent": "review-ci-tests-required | review-claims-auditor | review-contracts-boundaries | review-mechanics-content | review-infra-concurrency | review-tests-docs-dry",
	"verdict": "APPROVED | BLOCKED | NEEDS_INPUT | ERROR",
	"summary": "Human-readable summary",

	"signature_type": null,
	"payload": null,
	"signature": null,

	"blockers": null,
	"questions": null,
	"details": {}
}
```

### Field Requirements

- `agent`: constant identifier for the agent
- `verdict`: required
- `summary`: required

Signing rules (ALL verdicts are signed to enable delta review):

- `signature_type` MUST always be a non-empty string
- `payload` MUST always be a non-empty string
- `signature` MUST always be a non-empty string

BLOCKED rules:

- verdict == BLOCKED → `blockers` MUST be a non-empty array
- otherwise `blockers` MUST be null

NEEDS_INPUT rules:

- verdict == NEEDS_INPUT → `questions` MUST be a non-empty array
- otherwise `questions` MUST be null

`details`:

- Always present
- Agent-specific structured metadata goes here
  (risk tier, files examined, systems touched, etc.)

### Concrete Example (APPROVED verdict)

**Your output file MUST follow this structure** (values are examples — use your own):

```json
{
	"agent": "review-claims-auditor",
	"verdict": "APPROVED",
	"summary": "All claims verified against diff. Pure refactor, no behavioral changes.",
	"signature_type": "QA_CLAIMS_AUDITOR",
	"payload": "{\"commits\":[\"abc123\"],\"diffHash\":\"def456\",\"verdict\":\"APPROVED\",\"summary\":\"Claims verified\",\"timestamp\":\"2025-01-01T12:00:00Z\"}",
	"signature": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
	"blockers": null,
	"questions": null,
	"details": {
		"risk_tier": "LIGHT",
		"files_audited": ["packages/engine/src/foo.ts"],
		"claims_verified": ["Parameter rename", "No behavioral change"]
	}
}
```

**Key points:**

- `agent` matches your identifier exactly
- `verdict` is `"APPROVED"` (not `"APPROVE"`)
- `signature_type`, `payload`, `signature` are ALL present and non-null
- `blockers` and `questions` are `null` (not omitted)
- `details` contains agent-specific metadata

**Use `write-output.sh` to write this file:**

```bash
write-output.sh 'review-claims-auditor' \
  --verdict 'APPROVED' \
  --summary 'All claims verified against diff. Pure refactor, no behavioral changes.' \
  --type 'QA_CLAIMS_AUDITOR' \
  --payload '{"commits":["abc123"],...}' \
  --signature 'a1b2c3d4e5f6...' \
  --details '{"risk_tier":"LIGHT","files_audited":["packages/engine/src/foo.ts"]}'
```

---

## Signature Type Registry

### Phase 1 (6 signatures required for Phase 2)

| Agent                       | Signature Type            |
| --------------------------- | ------------------------- |
| review-ci-tests-required    | `QA_CI_REQUIRED_TESTS`    |
| review-claims-auditor       | `QA_CLAIMS_AUDITOR`       |
| review-contracts-boundaries | `QA_CONTRACTS_BOUNDARIES` |
| review-mechanics-content    | `QA_MECHANICS_CONTENT`    |
| review-infra-concurrency    | `QA_INFRA_CONCURRENCY`    |
| review-tests-docs-dry       | `QA_TESTS_DOCS_DRY`       |

### Phase 2 (1 signature required for Phase 3)

| Agent       | Signature Type       |
| ----------- | -------------------- |
| review-lead | `QA_FINAL_SIGNATORY` |

For signing/verification details, see:
`.claude/agents/sub-agent/docs/cryptographic-signing.md`

---

## review-lead (Phase 2)

### Input Schema

```json
{
	"branch": "branch-name",
	"commits": ["sha1", "sha2"],
	"approvals_json": [
		{ "payload": "...", "signature": "...", "type": "QA_CI_REQUIRED_TESTS" },
		{ "payload": "...", "signature": "...", "type": "QA_CLAIMS_AUDITOR" },
		{ "payload": "...", "signature": "...", "type": "QA_CONTRACTS_BOUNDARIES" },
		{ "payload": "...", "signature": "...", "type": "QA_MECHANICS_CONTENT" },
		{ "payload": "...", "signature": "...", "type": "QA_INFRA_CONCURRENCY" },
		{ "payload": "...", "signature": "...", "type": "QA_TESTS_DOCS_DRY" }
	],
	"original_request": "What the user originally asked for",
	"changes_summary": "What the coder implemented"
}
```

The `approvals_json` array must contain exactly 6 objects (one per Phase 1
reviewer). Review-lead verifies all 6 signatures before producing its own.

### Output Schema

Same as Phase 1 Output Schema, with:

- `agent`: "review-lead"
- `signature_type`: "QA_FINAL_SIGNATORY" (when APPROVED)

---

## safe-deployment-gate (Phase 3)

### Input Schema

**Mode 1: QA Approval (normal workflow)**

```json
{
	"branch": "branch-name",
	"approval": {
		"payload": "...",
		"signature": "...",
		"type": "QA_FINAL_SIGNATORY"
	}
}
```

The `approval` object contains the single signature from review-lead.
Only `QA_FINAL_SIGNATORY` type is accepted.

**Mode 2: User Override (escape hatch)**

```json
{
	"branch": "branch-name",
	"override_token": "token-from-user"
}
```

### Output

Phase 3 does not write JSON output. It communicates results via:

- Exit code (0 = success, non-zero = failure)
- stdout/stderr messages

There is no Phase 4, so no downstream consumer needs structured output.

---

## Master-Agent Responsibilities

The three-phase workflow requires master-agent to:

### Phase 1

1. Dispatch all 6 Phase 1 reviewers in parallel (single message with 6 Task calls)
2. Wait for all to complete
3. Collect approvals:

```bash
APPROVALS=$(.claude/agents/sub-agent/scripts/collect-phase1-assessments.sh)
```

### Phase 2

4. Dispatch review-lead with the collected approvals in `approvals_json`
5. Wait for completion
6. Read `/tmp/claude/sub-agents/output/review-lead.json`
7. **Display JSON contents verbatim to user (CRUCIAL) (Review Lead should send master agent a reminder about this)**
8. Extract review-lead's approval (payload, signature, type)

### Phase 3

9. Dispatch safe-deployment-gate with review-lead's single approval
10. Report result to user

---

## Delta Review Protocol (Round 2+)

When a QA round results in BLOCKED and the issue is fixed, subsequent rounds
can be faster. Agents check for prior signed state and only analyze new commits.

### How It Works

1. Agent checks for its own prior JSON file at startup
2. If file exists and signature verifies, agent compares commits
3. If prior commits ⊆ current commits, agent enters delta review mode
4. Agent only analyzes the new commits, not the full diff

### Helper Script

Agents call `check-prior-state.sh` to determine review mode:

```bash
PRIOR_STATE=$(check-prior-state.sh '<agent>' '["commit1","commit2","commit3"]')
MODE=$(echo "$PRIOR_STATE" | jq -r '.mode')

if [[ "$MODE" == "DELTA_REVIEW" ]]; then
  PRIOR_VERDICT=$(echo "$PRIOR_STATE" | jq -r '.prior_verdict')
  NEW_COMMITS=$(echo "$PRIOR_STATE" | jq -r '.new_commits')
  # Only analyze new commits
else
  # Full review
fi
```

Returns:

- `{"mode":"FULL_REVIEW","reason":"..."}` - Do full review
- `{"mode":"DELTA_REVIEW","prior_verdict":"...","prior_commits":[...],"new_commits":[...]}` - Delta review possible

### Delta Review Behavior

| Prior Verdict | Action                                                         |
| ------------- | -------------------------------------------------------------- |
| APPROVED      | Check if new commits invalidate approval; fast approve if safe |
| BLOCKED       | Check if new commits address blockers                          |
| NEEDS_INPUT   | Check if answers were provided and proceed                     |

### Fallback to Full Review

Delta review is conservative. Full review happens if:

- No prior state file exists
- Signature verification fails
- Prior commits not subset of current (rebase, etc.)
- Agent uncertain if delta affects its domain
