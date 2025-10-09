import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalArgv = [...process.argv];

afterEach(() => {
	process.argv = [...originalArgv];
	vi.resetModules();
	vi.restoreAllMocks();
});

describe('server entrypoint', () => {
	it('logs a startup message when startServer is called', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		const module = await import('../src/index.js');
		module.startServer();
		expect(log).toHaveBeenCalledWith('Starting Kingdom Builder server...');
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
		const log = vi.spyOn(console, 'log').mockImplementation(() => {});
		await import('../src/index.js');
		expect(log).toHaveBeenCalledWith('Starting Kingdom Builder server...');
	});
});
