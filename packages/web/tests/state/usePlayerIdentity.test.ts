/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	DEFAULT_PLAYER_NAME,
	PLAYER_NAME_STORAGE_KEY,
	usePlayerIdentity,
} from '../../src/state/playerIdentity';

type LocalStorageMock = Pick<
	Storage,
	'length' | 'getItem' | 'setItem' | 'removeItem' | 'clear' | 'key'
>;

describe('usePlayerIdentity', () => {
	let storageMap: Map<string, string>;
	let localStorageStub: LocalStorageMock;

	beforeEach(() => {
		storageMap = new Map();
		localStorageStub = {
			get length() {
				return storageMap.size;
			},
			getItem: vi.fn<[string], string | null>((key) => {
				return storageMap.get(key) ?? null;
			}),
			setItem: vi.fn<[string, string], void>((key, value) => {
				storageMap.set(key, value);
			}),
			removeItem: vi.fn<[string], void>((key) => {
				storageMap.delete(key);
			}),
			clear: vi.fn(() => {
				storageMap.clear();
			}),
			key: vi.fn<[number], string | null>((index) => {
				return Array.from(storageMap.keys())[index] ?? null;
			}),
		};
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			enumerable: true,
			value: localStorageStub as Storage,
		});
	});

	afterEach(() => {
		storageMap.clear();
		vi.restoreAllMocks();
	});

	it('trims stored names, enforces maximum length, and persists the sanitized value', () => {
		const storedName = '   Commander Shepard   ';
		storageMap.set(PLAYER_NAME_STORAGE_KEY, storedName);
		const { result } = renderHook(() => usePlayerIdentity());

		expect(result.current.playerName).toBe('Commander Shepard');
		expect(result.current.hasStoredName).toBe(true);

		const baseName = 'Champion of the Citadel';
		const longName = `   ${baseName.padEnd(60, '!')}   `;
		const sanitized = longName.trim().slice(0, 40);

		act(() => {
			result.current.setPlayerName(longName);
		});

		expect(result.current.playerName).toBe(sanitized);
		expect(sanitized.length).toBeLessThanOrEqual(40);
		expect(localStorageStub.setItem).toHaveBeenCalledWith(
			PLAYER_NAME_STORAGE_KEY,
			sanitized,
		);
	});

	it('falls back to the default name when the stored value is only whitespace', () => {
		storageMap.set(PLAYER_NAME_STORAGE_KEY, '      ');
		const { result } = renderHook(() => usePlayerIdentity());

		expect(result.current.playerName).toBe(DEFAULT_PLAYER_NAME);
		expect(result.current.hasStoredName).toBe(false);
	});

	it('swallows storage exceptions during read and write operations', () => {
		localStorageStub.getItem = vi.fn<[string], string | null>(() => {
			throw new Error('storage blocked');
		});
		const { result } = renderHook(() => usePlayerIdentity());

		expect(result.current.playerName).toBe(DEFAULT_PLAYER_NAME);
		expect(result.current.hasStoredName).toBe(false);

		localStorageStub.setItem = vi.fn<[string, string], void>(() => {
			throw new Error('quota exceeded');
		});

		expect(() => {
			act(() => {
				result.current.setPlayerName("  Aria T'Loak  ");
			});
		}).not.toThrow();

		expect(result.current.playerName).toBe("Aria T'Loak");
	});

	it('clears the stored name and resets the state when clearStoredName is called', () => {
		storageMap.set(PLAYER_NAME_STORAGE_KEY, 'Miranda Lawson');
		const { result } = renderHook(() => usePlayerIdentity());

		expect(result.current.hasStoredName).toBe(true);

		act(() => {
			result.current.clearStoredName();
		});

		expect(localStorageStub.removeItem).toHaveBeenCalledWith(
			PLAYER_NAME_STORAGE_KEY,
		);
		expect(storageMap.has(PLAYER_NAME_STORAGE_KEY)).toBe(false);
		expect(result.current.hasStoredName).toBe(false);
		expect(result.current.playerName).toBe(DEFAULT_PLAYER_NAME);
	});
});
