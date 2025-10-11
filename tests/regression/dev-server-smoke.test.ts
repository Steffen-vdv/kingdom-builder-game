import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, test } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';

const configFile = fileURLToPath(
	new URL('../../packages/web/vite.config.ts', import.meta.url),
);

/**
 * Regression coverage for the blank-screen bug where the dev server silently
 * served an empty document. Launch the Vite dev server and assert the root
 * markup renders as expected.
 */
describe('dev server smoke test', () => {
	let server: ViteDevServer | undefined;

	afterAll(async () => {
		if (server) {
			await server.close();
		}
	});

	test('serves the root document with expected markup', async () => {
		server = await createServer({
			configFile,
			server: {
				host: '127.0.0.1',
				port: 0,
			},
		});

		await server.listen();

		const address = server.httpServer?.address();
		if (!address || typeof address === 'string') {
			throw new Error('Dev server did not provide an address.');
		}

		const { address: host, port } = address as AddressInfo;
		const baseUrl = `http://${host}:${port}`;

		const response = await fetch(`${baseUrl}/`);
		const contentType = response.headers.get('content-type');

		expect(response.status).toBe(200);
		expect(contentType).toMatch(/text\/html/);

		const body = await response.text();
		expect(body).toContain('<div id="root"></div>');
	});
});
