import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalArgv = [...process.argv];
const originalEnv = { ...process.env };

function restoreEnvironment(): void {
	for (const key of Object.keys(process.env)) {
		if (!(key in originalEnv)) {
			delete process.env[key];
		}
	}
	for (const [key, value] of Object.entries(originalEnv)) {
		process.env[key] = value;
	}
}

beforeEach(() => {
	process.env.KB_SERVER_DISABLE_AUTOSTART = '1';
});

afterEach(() => {
	process.argv = [...originalArgv];
	restoreEnvironment();
	vi.doUnmock?.('fastify');
	vi.resetModules();
	vi.restoreAllMocks();
});

const SERVER_START_TIMEOUT_MS = 15000;

describe('server entrypoint', () => {
	it(
		'starts a Fastify server and listens for requests',
		async () => {
			const log = vi.spyOn(console, 'log').mockImplementation(() => {});
			const module = await import('../src/index.js');
			const result = await module.startServer({
				host: '127.0.0.1',
				port: 0,
				tokens: {
					'integration-token': {
						userId: 'integration-tester',
						roles: ['session:create', 'session:advance'],
					},
				},
			});
			expect(log).toHaveBeenCalledWith('Starting Kingdom Builder server...');
			const response = await fetch(`${result.address}/sessions`, {
				method: 'POST',
				headers: {
					authorization: 'Bearer integration-token',
					'content-type': 'application/json',
				},
				body: JSON.stringify({}),
			});
			expect(response.status).toBe(201);
			await result.app.close();
		},
		SERVER_START_TIMEOUT_MS,
	);

	it('does not auto-start when imported as a module', async () => {
		process.argv = ['/usr/bin/node', '/not/the/entrypoint'];
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		await import('../src/index.js');
		expect(log).not.toHaveBeenCalled();
	});

	it('auto-starts when the module is executed directly', async () => {
		const modulePath = fileURLToPath(
			new URL('../src/index.ts', import.meta.url),
		);
		process.argv = ['/usr/bin/node', modulePath];
		delete process.env.KB_SERVER_DISABLE_AUTOSTART;
		process.env.KB_SERVER_AUTH_TOKENS = JSON.stringify({
			'autostart-token': {
				userId: 'autostart',
				roles: ['admin'],
			},
		});
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const listen = vi.fn().mockResolvedValue('http://127.0.0.1:3001');
		const register = vi.fn().mockResolvedValue(undefined);
		vi.doMock('fastify', () => ({
			__esModule: true,
			default: () => ({
				register,
				listen,
			}),
		}));
		await import('../src/index.js');
		expect(log).toHaveBeenCalledWith('Starting Kingdom Builder server...');
		expect(register).toHaveBeenCalled();
		expect(listen).toHaveBeenCalled();
	});
});
