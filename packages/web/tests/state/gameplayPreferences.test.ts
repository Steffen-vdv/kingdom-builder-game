/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY,
	AUTO_PASS_PREFERENCE_STORAGE_KEY,
	getStoredGameplayPreferences,
	useGameplayPreferences,
} from '../../src/state/gameplayPreferences';

describe('getStoredGameplayPreferences', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	it('returns defaults when nothing is stored', () => {
		const preferences = getStoredGameplayPreferences();

		expect(preferences.autoAcknowledge).toBe(false);
		expect(preferences.autoPass).toBe(false);
	});

	it('returns stored values when available', () => {
		window.localStorage.setItem(
			AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY,
			'true',
		);
		window.localStorage.setItem(AUTO_PASS_PREFERENCE_STORAGE_KEY, 'true');

		const preferences = getStoredGameplayPreferences();

		expect(preferences.autoAcknowledge).toBe(true);
		expect(preferences.autoPass).toBe(true);
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

		expect(result.current.isAutoAcknowledgeEnabled).toBe(false);
		expect(result.current.isAutoPassEnabled).toBe(false);
		expect(typeof result.current.setIsAutoAcknowledgeEnabled).toBe('function');
		expect(typeof result.current.setIsAutoPassEnabled).toBe('function');

		expect(() => {
			act(() => {
				result.current.setIsAutoAcknowledgeEnabled(true);
			});
		}).not.toThrow();
		expect(result.current.isAutoAcknowledgeEnabled).toBe(true);
		expect(setItemSpy).toHaveBeenCalledWith(
			AUTO_ACKNOWLEDGE_PREFERENCE_STORAGE_KEY,
			'true',
		);

		expect(() => {
			act(() => {
				result.current.setIsAutoPassEnabled(true);
			});
		}).not.toThrow();
		expect(result.current.isAutoPassEnabled).toBe(true);
		expect(setItemSpy).toHaveBeenCalledWith(
			AUTO_PASS_PREFERENCE_STORAGE_KEY,
			'true',
		);
	});
});
