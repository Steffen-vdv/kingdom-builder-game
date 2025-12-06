/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	AUTO_ADVANCE_PREFERENCE_STORAGE_KEY,
	getStoredGameplayPreferences,
	useGameplayPreferences,
} from '../../src/state/gameplayPreferences';

describe('getStoredGameplayPreferences', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('returns defaults when nothing is stored', () => {
		const preferences = getStoredGameplayPreferences();

		expect(preferences.autoAdvance).toBe(false);
	});

	it('returns stored value when available', () => {
		window.localStorage.setItem(AUTO_ADVANCE_PREFERENCE_STORAGE_KEY, 'true');

		const preferences = getStoredGameplayPreferences();

		expect(preferences.autoAdvance).toBe(true);
	});

	it('ignores unrelated storage keys', () => {
		window.localStorage.setItem('some-other-key', 'true');

		const preferences = getStoredGameplayPreferences();

		expect(preferences.autoAdvance).toBe(false);
	});
});

describe('useGameplayPreferences', () => {
	const originalLocalStorage = window.localStorage;
	let getItemSpy: ReturnType<typeof vi.fn>;
	let setItemSpy: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		getItemSpy = vi.fn<Storage['getItem']>(() => {
			throw new Error('storage unavailable');
		});
		setItemSpy = vi.fn<Storage['setItem']>(() => {
			throw new Error('quota exceeded');
		});
		const storageStub: Storage = {
			get length() {
				return 0;
			},
			clear: vi.fn(),
			getItem: getItemSpy,
			key: vi.fn(() => null),
			removeItem: vi.fn(),
			setItem: setItemSpy,
		};
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: storageStub,
		});
	});

	afterEach(() => {
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: originalLocalStorage,
		});
		vi.restoreAllMocks();
	});

	it('falls back to defaults and keeps controls usable when storage fails', () => {
		const { result } = renderHook(() => useGameplayPreferences());

		expect(result.current.isAutoAdvanceEnabled).toBe(false);
		expect(typeof result.current.setIsAutoAdvanceEnabled).toBe('function');

		expect(() => {
			act(() => {
				result.current.setIsAutoAdvanceEnabled(true);
			});
		}).not.toThrow();
		expect(result.current.isAutoAdvanceEnabled).toBe(true);
		expect(setItemSpy).toHaveBeenCalledWith(
			AUTO_ADVANCE_PREFERENCE_STORAGE_KEY,
			'true',
		);
	});
});
