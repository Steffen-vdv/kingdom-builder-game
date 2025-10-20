/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import { useAudioPreferenceToggles } from '../../src/state/useAudioPreferenceToggles';
import type { HistoryState } from '../../src/state/appHistory';
import { Screen } from '../../src/state/appHistory';

type BooleanSetterFactory = {
	setter: Dispatch<SetStateAction<boolean>>;
	getValue: () => boolean;
};

const DEFAULT_HISTORY_STATE: HistoryState = {
	screen: Screen.Menu,
	gameKey: 17,
	isDarkModeEnabled: false,
	isDevModeEnabled: false,
	isMusicEnabled: true,
	isSoundEnabled: true,
	isBackgroundAudioMuted: false,
	isAutoAcknowledgeEnabled: false,
	isAutoPassEnabled: false,
};

function createBooleanSetter(initialValue: boolean): BooleanSetterFactory {
	let currentValue = initialValue;
	const mock = vi.fn((action: SetStateAction<boolean>) => {
		currentValue =
			typeof action === 'function'
				? (action as (previous: boolean) => boolean)(currentValue)
				: action;
	});
	return {
		setter: mock as unknown as Dispatch<SetStateAction<boolean>>,
		getValue: () => currentValue,
	};
}

function renderAudioPreferenceToggles(
	initialState: HistoryState = DEFAULT_HISTORY_STATE,
) {
	const music = createBooleanSetter(initialState.isMusicEnabled);
	const sound = createBooleanSetter(initialState.isSoundEnabled);
	const background = createBooleanSetter(initialState.isBackgroundAudioMuted);
	const buildHistoryState = vi.fn((overrides?: Partial<HistoryState>) => ({
		...initialState,
		...overrides,
	}));
	const recordedStates: HistoryState[] = [];
	const replaceHistoryState = vi.fn(
		(nextState: HistoryState, _path?: string) => {
			recordedStates.push(nextState);
			return undefined;
		},
	);
	const { result } = renderHook(() =>
		useAudioPreferenceToggles(buildHistoryState, replaceHistoryState, {
			setIsMusicEnabled: music.setter,
			setIsSoundEnabled: sound.setter,
			setIsBackgroundAudioMuted: background.setter,
		}),
	);
	return {
		result,
		initialState,
		buildHistoryState,
		replaceHistoryState,
		recordedStates,
		getMusic: music.getValue,
		getSound: sound.getValue,
		getBackgroundMute: background.getValue,
	};
}

describe('useAudioPreferenceToggles', () => {
	it('flips music preference and writes new history state', () => {
		const harness = renderAudioPreferenceToggles();
		act(() => {
			harness.result.current.toggleMusic();
		});
		expect(harness.getMusic()).toBe(false);
		expect(harness.buildHistoryState).toHaveBeenCalledTimes(1);
		expect(harness.buildHistoryState).toHaveBeenCalledWith({
			isMusicEnabled: false,
		});
		expect(harness.replaceHistoryState).toHaveBeenCalledTimes(1);
		const nextState = harness.recordedStates[0];
		expect(nextState.isMusicEnabled).toBe(false);
		expect(nextState.isSoundEnabled).toBe(harness.initialState.isSoundEnabled);
		expect(nextState.isBackgroundAudioMuted).toBe(
			harness.initialState.isBackgroundAudioMuted,
		);
	});

	it('flips sound preference and writes new history state', () => {
		const harness = renderAudioPreferenceToggles();
		act(() => {
			harness.result.current.toggleSound();
		});
		expect(harness.getSound()).toBe(false);
		expect(harness.buildHistoryState).toHaveBeenCalledTimes(1);
		expect(harness.buildHistoryState).toHaveBeenCalledWith({
			isSoundEnabled: false,
		});
		expect(harness.replaceHistoryState).toHaveBeenCalledTimes(1);
		const nextState = harness.recordedStates[0];
		expect(nextState.isSoundEnabled).toBe(false);
		expect(nextState.isMusicEnabled).toBe(harness.initialState.isMusicEnabled);
		expect(nextState.isBackgroundAudioMuted).toBe(
			harness.initialState.isBackgroundAudioMuted,
		);
	});

	it('flips background mute preference and writes new history state', () => {
		const harness = renderAudioPreferenceToggles();
		act(() => {
			harness.result.current.toggleBackgroundAudioMute();
		});
		expect(harness.getBackgroundMute()).toBe(true);
		expect(harness.buildHistoryState).toHaveBeenCalledTimes(1);
		expect(harness.buildHistoryState).toHaveBeenCalledWith({
			isBackgroundAudioMuted: true,
		});
		expect(harness.replaceHistoryState).toHaveBeenCalledTimes(1);
		const nextState = harness.recordedStates[0];
		expect(nextState.isBackgroundAudioMuted).toBe(true);
		expect(nextState.isMusicEnabled).toBe(harness.initialState.isMusicEnabled);
		expect(nextState.isSoundEnabled).toBe(harness.initialState.isSoundEnabled);
	});

	it('alternates stored value with repeated toggles', () => {
		const harness = renderAudioPreferenceToggles();
		act(() => {
			harness.result.current.toggleMusic();
		});
		act(() => {
			harness.result.current.toggleMusic();
		});
		act(() => {
			harness.result.current.toggleSound();
		});
		act(() => {
			harness.result.current.toggleSound();
		});
		act(() => {
			harness.result.current.toggleBackgroundAudioMute();
		});
		act(() => {
			harness.result.current.toggleBackgroundAudioMute();
		});
		expect(harness.recordedStates).toHaveLength(6);
		const [
			musicDisabled,
			musicEnabled,
			soundDisabled,
			soundEnabled,
			backgroundMuted,
			backgroundRestored,
		] = harness.recordedStates;
		expect(musicDisabled.isMusicEnabled).toBe(false);
		expect(musicEnabled.isMusicEnabled).toBe(true);
		expect(soundDisabled.isSoundEnabled).toBe(false);
		expect(soundEnabled.isSoundEnabled).toBe(true);
		expect(backgroundMuted.isBackgroundAudioMuted).toBe(true);
		expect(backgroundRestored.isBackgroundAudioMuted).toBe(false);
	});

	it.each([
		['toggleMusic', (state: HistoryState) => state.isMusicEnabled],
		['toggleSound', (state: HistoryState) => state.isSoundEnabled],
		[
			'toggleBackgroundAudioMute',
			(state: HistoryState) => state.isBackgroundAudioMuted,
		],
	])(
		'calls replaceHistoryState exactly once when %s runs',
		(toggleName, accessor) => {
			const harness = renderAudioPreferenceToggles();
			act(() => {
				// @ts-expect-error dynamic access to toggle function
				harness.result.current[toggleName]();
			});
			expect(harness.replaceHistoryState).toHaveBeenCalledTimes(1);
			expect(harness.recordedStates).toHaveLength(1);
			const state = harness.recordedStates[0];
			expect(accessor(state)).not.toBe(accessor(harness.initialState));
		},
	);
});
