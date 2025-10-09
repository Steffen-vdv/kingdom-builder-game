import { expect, test, type Page } from '@playwright/test';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://127.0.0.1:5173';
const serverUrl = new URL(baseUrl);
const host = serverUrl.hostname || '127.0.0.1';
const port = serverUrl.port || '5173';

let devServer: ChildProcessWithoutNullStreams | undefined;

async function waitForServer(url: string): Promise<void> {
	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		try {
			const response = await fetch(url, {
				signal: AbortSignal.timeout(2_000),
			});
			if (response.ok) {
				return;
			}
		} catch {
			// Ignore fetch errors while waiting for the dev server.
		}
		await delay(500);
	}
	throw new Error(`Dev server did not respond at ${url}`);
}

async function stopDevServer(): Promise<void> {
	if (!devServer) {
		return;
	}
	await new Promise<void>((resolve) => {
		const done = () => resolve();
		devServer?.once('exit', done);
		devServer?.once('close', done);
		const killed = devServer?.kill('SIGTERM');
		if (!killed) {
			resolve();
		}
	});
	devServer = undefined;
}

test.beforeAll(async () => {
	devServer = spawn(
		process.platform === 'win32' ? 'npm.cmd' : 'npm',
		['run', 'dev:web', '--', '--host', host, '--port', port],
		{
			env: { ...process.env, BROWSER: 'none' },
			stdio: 'pipe',
		},
	);
	devServer.stdout?.on('data', (chunk) => {
		process.stdout.write(chunk);
	});
	devServer.stderr?.on('data', (chunk) => {
		process.stderr.write(chunk);
	});
	await waitForServer(`${baseUrl}/`);
});

test.afterAll(async () => {
	await stopDevServer();
});

async function ensurePlayerName(page: Page) {
	const nameField = page.getByLabel('Your Name', { exact: true });
	try {
		await nameField.waitFor({ state: 'visible', timeout: 2_000 });
	} catch {
		return;
	}
	await nameField.fill('Agent Prime');
	await page.getByRole('button', { name: 'Confirm Name' }).click();
}

test('standard game smoke flow', async ({ page }) => {
	const pageErrors: unknown[] = [];
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
	await ensurePlayerName(page);

	const startButton = page.getByRole('button', { name: 'Start New Game' });
	await expect(startButton).toBeVisible();
	await startButton.click();

	const title = page.getByRole('heading', { name: 'Kingdom Builder' });
	await expect(title).toBeVisible();

	const actionsSection = page
		.locator('section')
		.filter({ has: page.getByRole('heading', { name: /Actions/ }) });
	await expect(actionsSection).toBeVisible();
	await expect(
		actionsSection.getByRole('heading', { name: 'Basic' }),
	).toBeVisible();
	await expect(actionsSection.getByRole('button').first()).toBeVisible();

	const settingsButton = page.getByRole('button', { name: 'Settings' }).first();
	await settingsButton.click();

	const settingsHeading = page.getByRole('heading', { name: 'Settings' });
	await expect(settingsHeading).toBeVisible();
	await page.getByRole('button', { name: 'Close' }).click();
	await expect(settingsHeading).not.toBeVisible();

	expect(pageErrors).toHaveLength(0);
	expect(consoleErrors).toHaveLength(0);
});
