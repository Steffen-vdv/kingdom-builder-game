import { expect, test } from '@playwright/test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import process from 'node:process';

let devServer: ChildProcessWithoutNullStreams | undefined;
let devServerReady = false;

async function startDevServer(): Promise<void> {
	if (devServerReady) {
		return;
	}
	devServer = spawn('npm', ['run', 'dev:web'], {
		cwd: process.cwd(),
		env: {
			...process.env,
			BROWSER: 'none',
			NODE_ENV: 'development',
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	await new Promise<void>((resolve, reject) => {
		if (!devServer) {
			reject(new Error('Failed to spawn dev server'));
			return;
		}
		const handleData = (chunk: Buffer) => {
			const text = chunk.toString();
			if (text.includes('Local:') && text.includes('http')) {
				cleanup();
				devServerReady = true;
				resolve();
			}
		};
		const handleError = (error: Error) => {
			cleanup();
			reject(error);
		};
		const handleExit = (code: number | null) => {
			if (devServerReady) {
				return;
			}
			cleanup();
			reject(new Error(`Dev server exited early with code ${code ?? 'null'}`));
		};
		const timeout = setTimeout(() => {
			cleanup();
			reject(new Error('Timed out waiting for dev server to start'));
		}, 60_000);
		const cleanup = () => {
			if (!devServer) {
				return;
			}
			clearTimeout(timeout);
			devServer.stdout.off('data', handleData);
			devServer.stderr.off('data', handleData);
			devServer.stderr.off('error', handleError);
			devServer.off('error', handleError);
			devServer.off('exit', handleExit);
		};
		devServer.stdout.on('data', handleData);
		devServer.stderr.on('data', handleData);
		devServer.stderr.on('error', handleError);
		devServer.on('error', handleError);
		devServer.on('exit', handleExit);
	});
}

async function stopDevServer(): Promise<void> {
	const server = devServer;
	devServer = undefined;
	devServerReady = false;
	if (!server) {
		return;
	}
	await new Promise<void>((resolve) => {
		server.once('exit', () => {
			resolve();
		});
		server.kill('SIGTERM');
		setTimeout(() => {
			if (!server.killed) {
				server.kill('SIGKILL');
			}
		}, 5_000);
	});
}

test.beforeAll(async () => {
	await startDevServer();
});

test.afterAll(async () => {
	await stopDevServer();
});

test('standard game smoke test', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Start New Game' }).click();
	await expect(page.getByRole('heading', { name: /Actions/u })).toBeVisible();
	await expect(page.locator('.action-card__face--front').first()).toBeVisible();
	await page.getByRole('button', { name: 'Settings' }).click();
	const settingsHeading = page.getByRole('heading', { name: 'Settings' });
	await expect(settingsHeading).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(settingsHeading).not.toBeVisible();
});
