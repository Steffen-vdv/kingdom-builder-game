/**
 * MCP Server for QA Approval Signing
 *
 * This server provides tools that QA and Pusher subagents use to
 * create and verify cryptographically signed approval files.
 *
 * Security model:
 * - The secret is read directly from process.env (never passed as parameter)
 * - Main agents are identified by the presence of ~/.claude-main-agent-marker
 * - Main agents CANNOT call these tools (blocked by marker check)
 * - Only subagents (no marker) can sign approvals and push
 * - Approval files are HMAC-signed for integrity verification
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createHmac } from 'crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

const QA_SIGNING_SECRET = process.env.QA_SIGNING_SECRET;
const MARKER_FILE = join(homedir(), '.claude-main-agent-marker');

if (!QA_SIGNING_SECRET) {
	console.error('ERROR: QA_SIGNING_SECRET environment variable not set');
	process.exit(1);
}

/**
 * Check if the caller is a main agent (has marker file).
 * Returns an error response if main agent, null otherwise.
 */
function checkMainAgentBlocked(): {
	content: Array<{ type: 'text'; text: string }>;
} | null {
	if (existsSync(MARKER_FILE)) {
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: false,
						error:
							'Main agents cannot use QA approval tools. Only subagents (QA reviewer, Pusher) can sign and push.',
						hint: 'Spawn the appropriate subagent to perform this action.',
					}),
				},
			],
		};
	}
	return null;
}

// Create MCP server
const server = new McpServer({
	name: 'qa-approval',
	version: '0.2.0',
});

// Register the sign_approval tool
server.tool(
	'sign_approval',
	'Signs a QA approval after review. Only callable by QA subagents (not main agents).',
	{
		verdict: {
			type: 'string',
			enum: ['APPROVED'],
			description: 'The review verdict (must be APPROVED to sign)',
		},
		commits: {
			type: 'array',
			items: { type: 'string' },
			description: 'Array of commit SHAs being approved',
		},
		diffHash: {
			type: 'string',
			description: 'SHA256 hash of the reviewed diff',
		},
		reviewSummary: {
			type: 'string',
			description: 'Summary of the review findings',
		},
	},
	async ({ verdict, commits, diffHash, reviewSummary }) => {
		// Block main agents
		const blocked = checkMainAgentBlocked();
		if (blocked) return blocked;

		// Verify verdict is APPROVED
		if (verdict !== 'APPROVED') {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: 'Only APPROVED verdicts can be signed.',
						}),
					},
				],
			};
		}

		// Create the approval payload
		const payload = {
			status: verdict,
			timestamp: new Date().toISOString(),
			commits: commits as string[],
			diffHash,
			reviewer_verdict: reviewSummary,
		};

		// Generate HMAC signature using secret from env
		const payloadStr = JSON.stringify(payload);
		const signature = createHmac('sha256', QA_SIGNING_SECRET)
			.update(payloadStr)
			.digest('hex');

		// Write approval file
		const approvalPath = join(homedir(), '.claude-push-approval');
		const fileContent = { ...payload, signature };

		try {
			writeFileSync(approvalPath, JSON.stringify(fileContent, null, 2));
		} catch (err) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: `Failed to write approval file: ${err}`,
						}),
					},
				],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: true,
						approvalPath,
						message:
							'Approval signed successfully. Use Pusher subagent to push.',
					}),
				},
			],
		};
	},
);

// Register the verify_and_push tool
server.tool(
	'verify_and_push',
	'Verifies QA approval signature and pushes to remote. Only callable by Pusher subagent.',
	{
		branch: {
			type: 'string',
			description: 'Branch name to push (optional, defaults to current branch)',
		},
	},
	async ({ branch }) => {
		// Block main agents
		const blocked = checkMainAgentBlocked();
		if (blocked) return blocked;

		const approvalPath = join(homedir(), '.claude-push-approval');

		// Check approval file exists
		if (!existsSync(approvalPath)) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error:
								'No approval file found. QA review must be completed first.',
						}),
					},
				],
			};
		}

		// Read and parse approval file
		let approval;
		try {
			const content = readFileSync(approvalPath, 'utf-8');
			approval = JSON.parse(content);
		} catch (err) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: `Failed to read approval file: ${err}`,
						}),
					},
				],
			};
		}

		// Verify signature exists
		if (!approval.signature) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error:
								'Approval file has no signature. It may have been created manually.',
						}),
					},
				],
			};
		}

		// Reconstruct payload and verify HMAC
		const { signature, ...payload } = approval;
		const payloadStr = JSON.stringify(payload);
		const expectedSignature = createHmac('sha256', QA_SIGNING_SECRET)
			.update(payloadStr)
			.digest('hex');

		if (signature !== expectedSignature) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error:
								'Invalid HMAC signature. Approval file may have been tampered with.',
						}),
					},
				],
			};
		}

		// Verify HEAD commit is in approved commits
		let headSha;
		try {
			headSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
		} catch (err) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: `Failed to get HEAD commit: ${err}`,
						}),
					},
				],
			};
		}

		if (!approval.commits || !approval.commits.includes(headSha)) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: `Current HEAD (${headSha}) is not in approved commits. New commits may have been added after QA approval.`,
							approvedCommits: approval.commits,
						}),
					},
				],
			};
		}

		// All verification passed - execute push
		let pushOutput;
		try {
			const branchName =
				branch ||
				execSync('git rev-parse --abbrev-ref HEAD', {
					encoding: 'utf-8',
				}).trim();
			pushOutput = execSync(`git push -u origin ${branchName}`, {
				encoding: 'utf-8',
				stdio: ['pipe', 'pipe', 'pipe'],
			});
		} catch (err: unknown) {
			const error = err as { stderr?: string; message?: string };
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: `Git push failed: ${error.stderr || error.message}`,
						}),
					},
				],
			};
		}

		// Clean up approval file after successful push
		try {
			unlinkSync(approvalPath);
		} catch {
			// Ignore cleanup errors
		}

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: true,
						message: 'Push completed successfully',
						headCommit: headSha,
						output: pushOutput,
					}),
				},
			],
		};
	},
);

// Register the user_override_push tool (escape hatch for emergency situations)
server.tool(
	'user_override_push',
	'Emergency push with user-provided override code. Bypasses normal QA workflow when user explicitly authorizes. Use only when normal workflow is broken.',
	{
		override_code: {
			type: 'string',
			description: 'User-provided override authorization code',
		},
		branch: {
			type: 'string',
			description: 'Branch name to push (optional, defaults to current branch)',
		},
	},
	async ({ override_code, branch }) => {
		// NOTE: This tool intentionally does NOT check the main agent marker.
		// It's designed for emergency use when the normal workflow is broken
		// (e.g., QA subagent can't access MCP tools, or working on workflow itself).

		// Verify the override code against environment variable
		const QA_OVERRIDE_CODE = process.env.QA_OVERRIDE_CODE;

		if (!QA_OVERRIDE_CODE) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error:
								'Override feature not configured. QA_OVERRIDE_CODE environment variable not set.',
							hint: 'The user must configure QA_OVERRIDE_CODE in the environment.',
						}),
					},
				],
			};
		}

		if (override_code !== QA_OVERRIDE_CODE) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error:
								'Invalid override code. The user must provide the correct authorization code.',
						}),
					},
				],
			};
		}

		// Get HEAD commit
		let headSha;
		try {
			headSha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
		} catch (err) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: `Failed to get HEAD commit: ${err}`,
						}),
					},
				],
			};
		}

		// Execute push
		let pushOutput;
		try {
			const branchName =
				branch ||
				execSync('git rev-parse --abbrev-ref HEAD', {
					encoding: 'utf-8',
				}).trim();
			pushOutput = execSync(`git push -u origin ${branchName}`, {
				encoding: 'utf-8',
				stdio: ['pipe', 'pipe', 'pipe'],
			});
		} catch (err: unknown) {
			const error = err as { stderr?: string; message?: string };
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error: `Git push failed: ${error.stderr || error.message}`,
						}),
					},
				],
			};
		}

		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify({
						success: true,
						message: 'Override push completed successfully',
						headCommit: headSha,
						note: 'This push bypassed normal QA workflow via user authorization',
						output: pushOutput,
					}),
				},
			],
		};
	},
);

// Start the server
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error('QA Approval MCP server started');
}

main().catch((err) => {
	console.error('Failed to start MCP server:', err);
	process.exit(1);
});
