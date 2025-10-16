import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	AUTH_TOKEN_STORAGE_KEY,
	DEFAULT_DEV_TOKEN,
	resolveAuthToken,
} from '../../src/state/authToken';

type MutableGlobal = typeof globalThis & {
	__KINGDOM_BUILDER_AUTH_TOKEN__?: unknown;
};

const originalNodeEnv = process.env.NODE_ENV;

const clearGlobalToken = () => {
	delete (globalThis as MutableGlobal).__KINGDOM_BUILDER_AUTH_TOKEN__;
};

const createLocalStorageMock = (initial?: Record<string, string>): Storage => {
	const entries = Object.entries(initial ?? {});
	const store = new Map<string, string>(entries);
	return {
		get length() {
			return store.size;
		},
		clear: vi.fn(() => {
			store.clear();
		}),
		getItem: vi.fn((key: string) => {
			return store.has(key) ? (store.get(key) ?? null) : null;
		}),
		key: vi.fn((index: number) => {
			return Array.from(store.keys())[index] ?? null;
		}),
		removeItem: vi.fn((key: string) => {
			store.delete(key);
		}),
		setItem: vi.fn((key: string, value: string) => {
			store.set(key, value);
		}),
	} satisfies Storage;
};

describe('resolveAuthToken', () => {
	beforeEach(() => {
		clearGlobalToken();
		vi.unstubAllGlobals();
		process.env.NODE_ENV = originalNodeEnv;
	});

	afterEach(() => {
		clearGlobalToken();
		vi.unstubAllGlobals();
		process.env.NODE_ENV = originalNodeEnv;
	});

	it('returns stored token when present', async () => {
		const storage = createLocalStorageMock({
			[AUTH_TOKEN_STORAGE_KEY]: ' stored-token ',
		});
		vi.stubGlobal('window', { localStorage: storage } as unknown as Window);
		const token = await resolveAuthToken();
		expect(token).toBe('stored-token');
	});

	it('uses global token provider when available', async () => {
		(globalThis as MutableGlobal).__KINGDOM_BUILDER_AUTH_TOKEN__ = () =>
			'global-token';
		const token = await resolveAuthToken();
		expect(token).toBe('global-token');
	});

	it('falls back to the default development token when unset', async () => {
		process.env.NODE_ENV = 'development';
		const token = await resolveAuthToken();
		expect(token).toBe(DEFAULT_DEV_TOKEN);
	});

	it('returns null when production has no token', async () => {
		process.env.NODE_ENV = 'production';
		const token = await resolveAuthToken();
		expect(token).toBeNull();
	});
});
