/**
 * MCP Server for QA Approval Signing
 *
 * This server provides the `sign_approval` tool that QA subagents use to
 * create cryptographically signed approval files after reviewing code.
 *
 * Security model:
 * - The tool requires `signing_secret` parameter matching $QA_SIGNING_SECRET
 * - Main agents have this secret poisoned (empty) by session-start.sh
 * - Only QA subagents have the actual secret value
 * - Approval files are HMAC-signed so Pusher can verify authenticity
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createHmac } from 'crypto';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';

const QA_SIGNING_SECRET = process.env.QA_SIGNING_SECRET;

if (!QA_SIGNING_SECRET) {
	console.error('ERROR: QA_SIGNING_SECRET environment variable not set');
	process.exit(1);
}

// Create MCP server
const server = new McpServer({
	name: 'qa-approval',
	version: '0.1.0',
});

// Register the sign_approval tool
server.tool(
	'sign_approval',
	'Signs a QA approval after review. Only callable with valid QA_SIGNING_SECRET.',
	{
		signing_secret: {
			type: 'string',
			description:
				'The QA signing secret from $QA_SIGNING_SECRET environment variable',
		},
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
	async ({ signing_secret, verdict, commits, diffHash, reviewSummary }) => {
		// Verify the signing secret
		if (signing_secret !== QA_SIGNING_SECRET) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error:
								'Invalid signing secret. Only QA subagents with valid $QA_SIGNING_SECRET can sign approvals.',
						}),
					},
				],
			};
		}

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

		// Generate HMAC signature
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
// This tool verifies the approval AND pushes in one atomic operation
// Pusher subagent MUST use this tool - it cannot skip verification
server.tool(
	'verify_and_push',
	'Verifies QA approval signature and pushes to remote. ALWAYS use this tool - verification cannot be skipped.',
	{
		signing_secret: {
			type: 'string',
			description:
				'The QA signing secret from $QA_SIGNING_SECRET environment variable',
		},
		branch: {
			type: 'string',
			description: 'Branch name to push (optional, defaults to current branch)',
		},
	},
	async ({ signing_secret, branch }) => {
		// Verify the signing secret (ensures caller is a subagent)
		if (signing_secret !== QA_SIGNING_SECRET) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({
							success: false,
							error:
								'Invalid signing secret. Only subagents with valid $QA_SIGNING_SECRET can push.',
						}),
					},
				],
			};
		}

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
