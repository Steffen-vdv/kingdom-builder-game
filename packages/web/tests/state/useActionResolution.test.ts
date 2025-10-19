/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useActionResolution } from '../../src/state/useActionResolution';
import { ACTION_EFFECT_DELAY } from '../../src/state/useGameLog';

describe('useActionResolution', () => {
	it('reveals lines, logs entries, and resolves after acknowledgement', async () => {
		vi.useFakeTimers();
		try {
			const addLog = vi.fn();
			const addResolutionLog = vi.fn();
			const setTrackedTimeout = vi
				.fn<(callback: () => void, delay: number) => number>()
				.mockImplementation((callback, delay) => {
					return window.setTimeout(callback, delay);
				});
			const { result, rerender } = renderHook(
				({ scale }: { scale: number }) => {
					const timeScaleRef = React.useRef(scale);
					timeScaleRef.current = scale;
					const mountedRef = React.useRef(true);
					React.useEffect(() => {
						return () => {
							mountedRef.current = false;
						};
					}, []);
					return useActionResolution({
						addLog,
						addResolutionLog,
						setTrackedTimeout,
						timeScaleRef,
						mountedRef,
					});
				},
				{ initialProps: { scale: 3 } },
			);
			let resolutionPromise: Promise<void> = Promise.resolve();
			const actionMeta = {
				id: 'test-action',
				name: 'Test Action',
			};
			const timeline = [
				{ text: 'First reveal', depth: 0, kind: 'headline' as const },
				{ text: 'Second reveal', depth: 1, kind: 'effect' as const },
			];
			act(() => {
				resolutionPromise = result.current.showResolution({
					lines: ['First reveal', 'Second reveal'],
					timeline,
					player: {
						id: 'A',
						name: 'Player A',
					},
					action: actionMeta,
				});
			});
			expect(addResolutionLog).not.toHaveBeenCalled();
			expect(result.current.resolution?.visibleLines).toEqual(['First reveal']);
			expect(result.current.resolution?.visibleTimeline).toEqual([timeline[0]]);
			expect(result.current.resolution?.source).toBe('action');
			expect(result.current.resolution?.actorLabel).toBe('Test Action');
			expect(result.current.resolution?.isComplete).toBe(false);
			expect(setTrackedTimeout).toHaveBeenLastCalledWith(
				expect.any(Function),
				ACTION_EFFECT_DELAY / 3,
			);
			act(() => {
				vi.advanceTimersByTime(ACTION_EFFECT_DELAY / 3 - 1);
			});
			expect(result.current.resolution?.visibleLines).toEqual(['First reveal']);
			expect(addResolutionLog).not.toHaveBeenCalled();
			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(result.current.resolution?.visibleLines).toEqual([
				'First reveal',
				'Second reveal',
			]);
			expect(result.current.resolution?.visibleTimeline).toEqual(timeline);
			expect(result.current.resolution?.isComplete).toBe(true);
			expect(addResolutionLog).toHaveBeenCalledTimes(1);
			const loggedSnapshot = addResolutionLog.mock.calls[0][0];
			expect(loggedSnapshot.lines).toEqual(['First reveal', 'Second reveal']);
			expect(loggedSnapshot.visibleLines).toEqual(loggedSnapshot.lines);
			expect(loggedSnapshot.timeline).toEqual(timeline);
			expect(loggedSnapshot.visibleTimeline).toEqual(timeline);
			expect(loggedSnapshot.isComplete).toBe(true);
			expect(loggedSnapshot.requireAcknowledgement).toBe(false);
			expect(loggedSnapshot.source).toBe('action');
			expect(loggedSnapshot.actorLabel).toBe('Test Action');
			expect(loggedSnapshot.player).toEqual({ id: 'A', name: 'Player A' });
			expect(loggedSnapshot.action).toEqual(actionMeta);
			expect(addLog).not.toHaveBeenCalled();
			const resolvedState = { done: false };
			void resolutionPromise.then(() => {
				resolvedState.done = true;
			});
			await Promise.resolve();
			expect(resolvedState.done).toBe(false);
			act(() => {
				result.current.acknowledgeResolution();
			});
			await resolutionPromise;
			expect(resolvedState.done).toBe(true);
			expect(result.current.resolution).toBeNull();
			rerender({ scale: 1 });
		} finally {
			vi.useRealTimers();
		}
	});

	it('defaults source from action meta and accepts overrides', async () => {
		vi.useFakeTimers();
		try {
			const addLog = vi.fn();
			const addResolutionLog = vi.fn();
			const setTrackedTimeout = vi
				.fn<(callback: () => void, delay: number) => number>()
				.mockImplementation((callback, delay) => {
					return window.setTimeout(callback, delay);
				});
			const { result } = renderHook(() => {
				const timeScaleRef = React.useRef(1);
				const mountedRef = React.useRef(true);
				React.useEffect(() => {
					return () => {
						mountedRef.current = false;
					};
				}, []);
				return useActionResolution({
					addLog,
					addResolutionLog,
					setTrackedTimeout,
					timeScaleRef,
					mountedRef,
				});
			});
			let firstPromise: Promise<void> = Promise.resolve();
			act(() => {
				firstPromise = result.current.showResolution({
					lines: ['Only line'],
					action: {
						id: 'action-id',
						name: 'Action Name',
					},
				});
			});
			expect(result.current.resolution?.source).toBe('action');
			expect(result.current.resolution?.actorLabel).toBe('Action Name');
			expect(result.current.resolution?.visibleTimeline).toEqual([
				{ text: 'Only line', depth: 0, kind: 'headline' },
			]);
			act(() => {
				result.current.acknowledgeResolution();
			});
			await firstPromise;
			expect(result.current.resolution).toBeNull();
			act(() => {
				void result.current.showResolution({
					lines: ['Phase line'],
					source: 'phase',
					actorLabel: 'Growth Phase',
				});
			});
			expect(result.current.resolution?.source).toBe('phase');
			expect(result.current.resolution?.actorLabel).toBe('Growth Phase');
			expect(result.current.resolution?.visibleTimeline).toEqual([
				{ text: 'Phase line', depth: 0, kind: 'headline' },
			]);
		} finally {
			vi.useRealTimers();
		}
	});

	it('auto acknowledges when acknowledgement is not required', async () => {
		vi.useFakeTimers();
		try {
			const addLog = vi.fn();
			const addResolutionLog = vi.fn();
			const setTrackedTimeout = vi
				.fn<(callback: () => void, delay: number) => number>()
				.mockImplementation((callback, delay) => {
					return window.setTimeout(callback, delay);
				});
			const { result } = renderHook(() => {
				const timeScaleRef = React.useRef(1);
				const mountedRef = React.useRef(true);
				React.useEffect(() => {
					return () => {
						mountedRef.current = false;
					};
				}, []);
				return useActionResolution({
					addLog,
					addResolutionLog,
					setTrackedTimeout,
					timeScaleRef,
					mountedRef,
				});
			});
			let resolutionPromise: Promise<void> = Promise.resolve();
			act(() => {
				resolutionPromise = result.current.showResolution({
					lines: ['Auto line'],
					requireAcknowledgement: false,
				});
			});
			expect(result.current.resolution?.requireAcknowledgement).toBe(false);
			expect(result.current.resolution?.visibleTimeline).toEqual([
				{ text: 'Auto line', depth: 0, kind: 'headline' },
			]);
			expect(addResolutionLog).toHaveBeenCalledTimes(1);
			const autoSnapshot = addResolutionLog.mock.calls[0][0];
			expect(autoSnapshot.lines).toEqual(['Auto line']);
			expect(autoSnapshot.visibleLines).toEqual(['Auto line']);
			expect(autoSnapshot.timeline).toEqual([
				{ text: 'Auto line', depth: 0, kind: 'headline' },
			]);
			expect(autoSnapshot.visibleTimeline).toEqual([
				{ text: 'Auto line', depth: 0, kind: 'headline' },
			]);
			expect(autoSnapshot.requireAcknowledgement).toBe(false);
			expect(autoSnapshot.isComplete).toBe(true);
			expect(addLog).not.toHaveBeenCalled();
			expect(setTrackedTimeout).toHaveBeenLastCalledWith(
				expect.any(Function),
				ACTION_EFFECT_DELAY,
			);
			act(() => {
				vi.advanceTimersByTime(ACTION_EFFECT_DELAY - 1);
			});
			expect(result.current.resolution).not.toBeNull();
			act(() => {
				vi.advanceTimersByTime(1);
			});
			await resolutionPromise;
			expect(result.current.resolution).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});

	it('falls back to addLog when addResolutionLog is absent', async () => {
		vi.useFakeTimers();
		try {
			const addLog = vi.fn();
			const setTrackedTimeout = vi
				.fn<(callback: () => void, delay: number) => number>()
				.mockImplementation((callback, delay) => {
					return window.setTimeout(callback, delay);
				});
			const { result } = renderHook(() => {
				const timeScaleRef = React.useRef(1);
				const mountedRef = React.useRef(true);
				React.useEffect(() => {
					return () => {
						mountedRef.current = false;
					};
				}, []);
				return useActionResolution({
					addLog,
					setTrackedTimeout,
					timeScaleRef,
					mountedRef,
				});
			});
			let resolutionPromise: Promise<void> = Promise.resolve();
			act(() => {
				resolutionPromise = result.current.showResolution({
					lines: ['Fallback line'],
					player: {
						id: 'F',
						name: 'Fallback Player',
					},
				});
			});
			act(() => {
				vi.runAllTimers();
			});
			expect(addLog).toHaveBeenCalledTimes(1);
			expect(addLog).toHaveBeenCalledWith(['Fallback line'], {
				id: 'F',
				name: 'Fallback Player',
			});
			act(() => {
				result.current.acknowledgeResolution();
			});
			await resolutionPromise;
			expect(result.current.resolution).toBeNull();
		} finally {
			vi.useRealTimers();
		}
	});
});
