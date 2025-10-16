import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUILT_IN_TOKENS = {
	'local-dev': {
		userId: 'local-dev',
		roles: ['admin', 'session:create', 'session:advance'],
	},
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function createEnv(tokensString) {
	return {
		...process.env,
		KB_SERVER_AUTH_TOKENS: tokensString,
	};
}

async function readJsonFile(filePath) {
	const contents = await readFile(filePath, 'utf8');
	return JSON.parse(contents);
}

async function resolveTokens({ requireTokens }) {
	const envValue = process.env.KB_SERVER_AUTH_TOKENS;
	if (envValue && envValue.trim().length > 0) {
		return envValue;
	}

	const localPath = path.join(
		ROOT_DIR,
		'config',
		'server-auth.tokens.local.json',
	);
	try {
		const localTokens = await readJsonFile(localPath);
		return JSON.stringify(localTokens);
	} catch (error) {
		if (error && error.code !== 'ENOENT') {
			throw error;
		}
	}

	const defaultPath = path.join(
		ROOT_DIR,
		'config',
		'server-auth.tokens.default.json',
	);
	try {
		const defaultTokens = await readJsonFile(defaultPath);
		return JSON.stringify(defaultTokens);
	} catch (error) {
		if (requireTokens || (error && error.code !== 'ENOENT')) {
			throw error;
		}
	}

	if (requireTokens) {
		return null;
	}

	console.warn('[run-with-auth] Falling back to built-in dev tokens.');
	return JSON.stringify(BUILT_IN_TOKENS);
}

function printMissingTokensMessage() {
	console.error('No authentication tokens were found.');
	console.error('Provide tokens by setting KB_SERVER_AUTH_TOKENS or by');
	console.error('creating config/server-auth.tokens.local.json with a JSON');
	console.error('object mapping token strings to user definitions.');
}

function spawnScript(scriptName, forwardArgs, tokensString) {
	const spawnArgs = ['run', scriptName];
	if (forwardArgs.length > 0) {
		spawnArgs.push('--', ...forwardArgs);
	}

	const child = spawn('npm', spawnArgs, {
		stdio: 'inherit',
		shell: process.platform === 'win32',
		env: createEnv(tokensString),
	});

	child.on('exit', (code, signal) => {
		if (signal) {
			process.kill(process.pid, signal);
			return;
		}
		process.exit(code ?? 0);
	});

	child.on('error', (error) => {
		console.error('[run-with-auth] Failed to start npm:', error);
		process.exit(1);
	});
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error('Usage: node run-with-auth.mjs <script> [args...]');
		process.exit(1);
		return;
	}

	const scriptName = args[0];
	const rawForward = args.slice(1);
	const requireTokens = rawForward.includes('--require-tokens');
	const forwardArgs = rawForward.filter((arg) => arg !== '--require-tokens');

	try {
		const tokensString = await resolveTokens({ requireTokens });
		if (!tokensString) {
			printMissingTokensMessage();
			process.exit(1);
			return;
		}
		spawnScript(scriptName, forwardArgs, tokensString);
	} catch (error) {
		console.error('[run-with-auth] Unable to resolve tokens:', error);
		process.exit(1);
	}
}

await main();
