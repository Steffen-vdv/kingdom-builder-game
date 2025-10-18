import { defineConfig } from '@playwright/test';

const UI_TEST_PORT = 4173;

const webServerCommand = [
	'npm',
	'run',
	'dev',
	'--',
	'--host',
	'127.0.0.1',
	'--port',
	String(UI_TEST_PORT),
].join(' ');

export default defineConfig({
	testDir: 'tests/ui',
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? 'line' : 'list',
	use: {
		baseURL: `http://127.0.0.1:${UI_TEST_PORT}`,
		headless: true,
		viewport: { width: 1280, height: 720 },
		trace: 'on-first-retry',
	},
	webServer: {
		command: webServerCommand,
		url: `http://127.0.0.1:${UI_TEST_PORT}`,
		reuseExistingServer: !process.env.CI,
		timeout: 120 * 1000,
	},
	expect: { timeout: 10_000 },
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' },
		},
	],
});
