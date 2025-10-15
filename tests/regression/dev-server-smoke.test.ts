import path from 'path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';

/**
 * Regression coverage for the blank-screen bug where the dev server failed to
 * serve the root markup for the web client.
 */
const DEV_SERVER_START_TIMEOUT_MS = 60_000;
const DEV_SERVER_REQUEST_TIMEOUT_MS = 30_000;

describe('dev server smoke test', () => {
	let server: ViteDevServer | undefined;
	let baseUrl: string | undefined;

	beforeAll(async () => {
		let server: ViteDevServer | undefined;

		beforeAll(async () => {
		server = await createServer({
			configFile: path.resolve(process.cwd(), 'packages/web/vite.config.ts'),
			server: {
				host: '127.0.0.1',
			configFile: path.resolve(process.cwd(), 'packages/web/vite.config.ts'),
			server: {
				host: '127.0.0.1',
				port: 0,
			},
		});
		await server.listen();
		await server.waitForRequestsIdle();
		const address = server.httpServer?.address() as AddressInfo | null;
		if (!address || typeof address === 'string') {
			throw new Error('Unable to determine dev server address');
		}
		baseUrl = `http://${address.address}:${address.port}`;
	}, DEV_SERVER_START_TIMEOUT_MS);

	afterAll(async () => {
		if (server) {
			await server.close();
		}
	});

	it(
		'serves the root markup without returning a blank screen',
		async () => {
			if (!baseUrl) {
				throw new Error('Dev server did not start');
			}
			const response = await fetch(`${baseUrl}/`);
			expect(response.status).toBe(200);
			const contentType = response.headers.get('content-type') ?? '';
			expect(contentType).toContain('text/html');
			const body = await response.text();
			expect(body).toContain('<div id="root"></div>');
			const cssResponse = await fetch(`${baseUrl}/src/styles/index.css`);
			expect(cssResponse.ok).toBe(true);
			const cssText = await cssResponse.text();
			expect(cssText.length).toBeGreaterThan(100);
			expect(cssText).not.toContain('@tailwind');
			expect(cssText).toMatch(/(--tw-|\.bg-slate-100\b)/);
		},
		DEV_SERVER_REQUEST_TIMEOUT_MS,
	);
});
