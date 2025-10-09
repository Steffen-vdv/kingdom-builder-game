import { expect, test } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const DEV_SERVER_PORT = 4173;
const BASE_URL = `http://127.0.0.1:${DEV_SERVER_PORT}`;

let devServer: ChildProcess | undefined;

async function waitForServer(url: string, timeoutMs = 60000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		try {
			const response = await fetch(url, { cache: 'no-store' });
			if (response.ok) {
				return;
			}
		} catch {
			// Server is not ready yet.
		}
		await delay(250);
	}
	throw new Error(`Timed out waiting for dev server at ${url}`);
}

async function ensureServerIsReady(url: string) {
	if (!devServer) {
		throw new Error('Dev server process has not been started.');
	}
	await Promise.race([
		waitForServer(url),
		(async () => {
			const [code, signal] = await once(devServer!, 'exit');
			throw new Error(
				`Dev server exited early with code ${code} and signal ${signal}.`,
			);
		})(),
	]);
}

async function stopServer() {
	if (!devServer) {
		return;
	}
	devServer.kill('SIGTERM');
	await Promise.race([once(devServer, 'exit'), delay(5000)]);
	if (!devServer.killed) {
		devServer.kill('SIGKILL');
	}
	devServer = undefined;
}

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(currentDirectory, '..', '..');

test.beforeAll(async () => {
	devServer = spawn(
		'npm',
		[
			'run',
			'dev:web',
			'--',
			'--host',
			'127.0.0.1',
			'--port',
			`${DEV_SERVER_PORT}`,
			'--strictPort',
		],
		{
			cwd: repositoryRoot,
			stdio: 'pipe',
			env: {
				...process.env,
				BROWSER: 'none',
				NODE_ENV: 'development',
			},
		},
	);
	devServer.stdout?.on('data', (chunk) => {
		process.stdout.write(chunk);
	});
	devServer.stderr?.on('data', (chunk) => {
		process.stderr.write(chunk);
	});
	await ensureServerIsReady(`${BASE_URL}/`);
});

test.afterAll(async () => {
	await stopServer();
});

test('standard game smoke flow', async ({ page }) => {
	const pageErrors: Error[] = [];
	const consoleErrors: string[] = [];

	page.on('pageerror', (error) => {
		pageErrors.push(error);
	});
	page.on('console', (message) => {
		if (message.type() === 'error') {
			consoleErrors.push(message.text());
		}
	});

	await page.goto('/');
	const confirmNameButton = page.getByRole('button', { name: 'Confirm Name' });
	if ((await confirmNameButton.count()) > 0) {
		await page.getByLabel('Your Name').fill('Playwright Sovereign');
		await confirmNameButton.click();
	}

	await page.getByRole('button', { name: 'Start New Game' }).click();

	const actionsHeading = page.getByRole('heading', { name: 'Actions' });
	await expect(actionsHeading).toBeVisible();

	const actionCard = page.locator('button.action-card__face--front').first();
	await expect(actionCard).toBeVisible();

	const settingsButton = page.getByRole('button', { name: 'Settings' }).first();
	await settingsButton.click();

	const settingsHeading = page.getByRole('heading', { name: 'Settings' });
	await expect(settingsHeading).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(settingsHeading).not.toBeVisible();
	await expect(actionsHeading).toBeVisible();

	expect(pageErrors).toEqual([]);
	expect(consoleErrors).toEqual([]);
});
