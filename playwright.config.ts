import { defineConfig } from '@playwright/test';

const DEFAULT_BASE_URL = 'http://127.0.0.1:5173';

function resolveBaseUrl(): string {
	return process.env.PLAYWRIGHT_TEST_BASE_URL ?? DEFAULT_BASE_URL;
}

const baseUrl = resolveBaseUrl();
const serverUrl = new URL(baseUrl);
const host = serverUrl.hostname || '127.0.0.1';
const port = serverUrl.port || '5173';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	timeout: 120_000,
	expect: {
		timeout: 10_000,
	},
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? 'github' : 'list',
	use: {
		baseURL: baseUrl,
		trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
		video: 'retain-on-failure',
	},
	metadata: {
		devServerHost: host,
		devServerPort: port,
	},
});
