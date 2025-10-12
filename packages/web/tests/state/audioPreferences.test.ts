/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	BACKGROUND_AUDIO_MUTE_STORAGE_KEY,
	MUSIC_PREFERENCE_STORAGE_KEY,
	SOUND_PREFERENCE_STORAGE_KEY,
	useAudioPreferences,
} from '../../src/state/audioPreferences';

describe('useAudioPreferences', () => {
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
		const { result } = renderHook(() => useAudioPreferences());

		expect(result.current.isMusicEnabled).toBe(true);
		expect(result.current.isSoundEnabled).toBe(true);
		expect(result.current.isBackgroundAudioMuted).toBe(true);
		expect(typeof result.current.setIsMusicEnabled).toBe('function');
		expect(typeof result.current.setIsSoundEnabled).toBe('function');
		expect(typeof result.current.setIsBackgroundAudioMuted).toBe('function');

		expect(() => {
			act(() => {
				result.current.setIsMusicEnabled(false);
			});
		}).not.toThrow();
		expect(result.current.isMusicEnabled).toBe(false);
		expect(setItemSpy).toHaveBeenCalledWith(
			MUSIC_PREFERENCE_STORAGE_KEY,
			'false',
		);

		expect(() => {
			act(() => {
				result.current.setIsSoundEnabled(false);
			});
		}).not.toThrow();
		expect(result.current.isSoundEnabled).toBe(false);
		expect(setItemSpy).toHaveBeenCalledWith(
			SOUND_PREFERENCE_STORAGE_KEY,
			'false',
		);

		expect(() => {
			act(() => {
				result.current.setIsBackgroundAudioMuted(false);
			});
		}).not.toThrow();
		expect(result.current.isBackgroundAudioMuted).toBe(false);
		expect(setItemSpy).toHaveBeenCalledWith(
			BACKGROUND_AUDIO_MUTE_STORAGE_KEY,
			'false',
		);
	});
});
