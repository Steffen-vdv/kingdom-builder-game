import { defineConfig } from '@playwright/test';

const DEV_SERVER_PORT = 4173;

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 120000,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	expect: {
		timeout: 10000,
	},
	use: {
		baseURL: `http://127.0.0.1:${DEV_SERVER_PORT}`,
		trace: 'retain-on-failure',
	},
});
