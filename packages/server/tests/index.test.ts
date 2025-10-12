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

describe('server entrypoint', () => {
	it('starts a Fastify server and listens for requests', async () => {
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
	});

	it('allows HttpSessionGateway to toggle developer mode', async () => {
		const module = await import('../src/index.js');
		const result = await module.startServer({
			host: '127.0.0.1',
			port: 0,
			tokens: {
				'integration-token': {
					userId: 'integration-tester',
					roles: ['session:create', 'session:advance', 'admin'],
				},
			},
		});
		try {
			const gateway = new module.HttpSessionGateway({
				baseUrl: result.address,
				headers: {
					authorization: 'Bearer integration-token',
				},
			});
			const created = await gateway.createSession();
			const updated = await gateway.setDevMode({
				sessionId: created.sessionId,
				enabled: true,
			});
			expect(updated.snapshot.game.devMode).toBe(true);
		} finally {
			await result.app.close();
		}
	});

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
	it('rejects empty KB_SERVER_AUTH_TOKENS values', async () => {
		process.env.KB_SERVER_AUTH_TOKENS = '  ';
		const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
		const module = await import('../src/index.js');
		await expect(module.startServer()).rejects.toThrow(
			/KB_SERVER_AUTH_TOKENS is set but empty/,
		);
		expect(errorLog).toHaveBeenCalledWith(
			'KB_SERVER_AUTH_TOKENS is set but empty. Provide a JSON token map.',
		);
	});

	it('fails fast in production when tokens are not configured', async () => {
		process.env.NODE_ENV = 'production';
		const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
		const module = await import('../src/index.js');
		await expect(module.startServer()).rejects.toThrow(
			/Authentication tokens are required in production/,
		);
		expect(errorLog).toHaveBeenCalledWith(
			'Authentication tokens are required in production. ' +
				'Set KB_SERVER_AUTH_TOKENS or pass tokens to startServer().',
		);
	});

	it('allows opting into the default developer token', async () => {
		process.env.KB_SERVER_ALLOW_DEV_TOKEN = '1';
		vi.doMock('fastify', () => ({
			__esModule: true,
			default: () => ({
				register: vi.fn().mockResolvedValue(undefined),
				listen: vi.fn().mockResolvedValue('http://127.0.0.1:3001'),
				close: vi.fn().mockResolvedValue(undefined),
			}),
		}));
		const authModule = await import('../src/auth/tokenAuthMiddleware.js');
		const middlewareSpy = vi.spyOn(authModule, 'createTokenAuthMiddleware');
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const module = await import('../src/index.js');
		const result = await module.startServer({ host: '127.0.0.1', port: 0 });
		expect(warn).toHaveBeenCalledWith(
			'KB_SERVER_AUTH_TOKENS not set; using default dev token "local-dev".',
		);
		const options = middlewareSpy.mock.calls.at(-1)?.[0];
		expect(options?.tokens?.['local-dev']).toBeDefined();
		await result.app.close();
	});

	it('warns when authentication tokens are missing in development', async () => {
		vi.doMock('fastify', () => ({
			__esModule: true,
			default: () => ({
				register: vi.fn().mockResolvedValue(undefined),
				listen: vi.fn().mockResolvedValue('http://127.0.0.1:3001'),
				close: vi.fn().mockResolvedValue(undefined),
			}),
		}));
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const module = await import('../src/index.js');
		const result = await module.startServer({ host: '127.0.0.1', port: 0 });
		expect(warn).toHaveBeenCalledWith(
			'Authentication tokens are not configured. ' +
				'Set KB_SERVER_AUTH_TOKENS or enable KB_SERVER_ALLOW_DEV_TOKEN=1 ' +
				'to use the default dev token.',
		);
		await result.app.close();
	});
});
