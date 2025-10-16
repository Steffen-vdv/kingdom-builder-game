import { fileURLToPath } from 'node:url';
import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyBaseLogger } from 'fastify';

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

function createTestLogger(): FastifyBaseLogger {
	const logger: Partial<FastifyBaseLogger> = {
		child: vi.fn(),
		debug: vi.fn(),
		error: vi.fn(),
		fatal: vi.fn(),
		info: vi.fn(),
		trace: vi.fn(),
		warn: vi.fn(),
	};
	(logger.child as ReturnType<typeof vi.fn>).mockReturnValue(logger);
	return logger as FastifyBaseLogger;
}

describe('server entrypoint', () => {
	it('starts a Fastify server and listens for requests', async () => {
		const messages: Array<{ level: number; msg: string }> = [];
		const stream = new Writable({
			write(chunk, _encoding, callback) {
				try {
					messages.push(JSON.parse(String(chunk)));
				} catch {
					// Ignore parse errors from non-JSON log entries.
				}
				callback();
			},
		});
		const module = await import('../src/index.js');
		const result = await module.startServer({
			host: '127.0.0.1',
			port: 0,
			logger: {
				level: 'info',
				stream,
			},
			tokens: {
				'integration-token': {
					userId: 'integration-tester',
					roles: ['session:create', 'session:advance'],
				},
			},
		});
		const response = await fetch(`${result.address}/sessions`, {
			method: 'POST',
			headers: {
				authorization: 'Bearer integration-token',
				'content-type': 'application/json',
			},
			body: JSON.stringify({}),
		});
		expect(response.status).toBe(201);
		expect(
			messages.some(
				(entry) => entry.msg === 'Starting Kingdom Builder server...',
			),
		).toBe(true);
		expect(
			messages.some(
				(entry) =>
					entry.msg === `Kingdom Builder server listening on ${result.address}`,
			),
		).toBe(true);
		await result.app.close();
		stream.end();
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
		const fastifyMock = vi.fn(() => ({
			register: vi.fn(),
			listen: vi.fn(),
			log: createTestLogger(),
		}));
		vi.doMock('fastify', () => ({
			__esModule: true,
			default: fastifyMock,
		}));
		await import('../src/index.js');
		expect(fastifyMock).not.toHaveBeenCalled();
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
		const log = createTestLogger();
		const listen = vi.fn().mockResolvedValue('http://127.0.0.1:3001');
		const register = vi.fn().mockResolvedValue(undefined);
		const fastifyMock = vi.fn(() => ({
			register,
			listen,
			log,
		}));
		vi.doMock('fastify', () => ({
			__esModule: true,
			default: fastifyMock,
		}));
		await import('../src/index.js');
		expect(log.info).toHaveBeenCalledWith('Starting Kingdom Builder server...');
		expect(register).toHaveBeenCalled();
		expect(listen).toHaveBeenCalled();
		expect(fastifyMock).toHaveBeenCalledWith(
			expect.objectContaining({ logger: true }),
		);
	});

	it('allows the built-in development token when explicitly enabled', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const module = await import('../src/index.js');
		const result = await module.startServer({
			host: '127.0.0.1',
			port: 0,
			allowDevToken: true,
		});
		try {
			const response = await fetch(`${result.address}/sessions`, {
				method: 'POST',
				headers: {
					authorization: 'Bearer local-dev',
					'content-type': 'application/json',
				},
				body: JSON.stringify({}),
			});
			expect(response.status).toBe(201);
			expect(warn).toHaveBeenCalledWith(
				expect.stringContaining('default dev token'),
			);
		} finally {
			await result.app.close();
		}
	});

	it('throws actionable errors when authentication is missing in production', async () => {
		const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
		process.env.NODE_ENV = 'production';
		const module = await import('../src/index.js');
		await expect(
			module.startServer({ host: '127.0.0.1', port: 0 }),
		).rejects.toThrow(/Authentication tokens are not configured/);
		expect(errorLog).toHaveBeenCalledWith(
			expect.stringContaining('Authentication tokens are not configured'),
		);
	});

	it('rejects token tables that only contain empty token strings', async () => {
		const module = await import('../src/index.js');
		await expect(
			module.startServer({
				host: '127.0.0.1',
				port: 0,
				tokens: { '': { userId: 'nobody' } },
			}),
		).rejects.toThrow(/empty token strings/);
	});
});
