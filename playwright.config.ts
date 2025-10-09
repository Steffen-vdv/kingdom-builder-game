import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	timeout: 120_000,
	expect: {
		timeout: 10_000,
	},
	reporter: [['list']],
	use: {
		baseURL: 'http://127.0.0.1:5173',
		headless: true,
	},
	projects: [
		{
			name: 'chromium',
			use: {
				browserName: 'chromium',
			},
		},
	],
	workers: process.env.CI ? 1 : undefined,
});
