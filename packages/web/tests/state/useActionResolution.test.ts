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
			act(() => {
				resolutionPromise = result.current.showResolution({
					lines: ['First reveal', 'Second reveal'],
					player: {
						id: 'A',
						name: 'Player A',
					},
					action: actionMeta,
				});
			});
			expect(addLog).toHaveBeenCalledTimes(1);
			expect(addLog).toHaveBeenLastCalledWith('First reveal', {
				id: 'A',
				name: 'Player A',
			});
			expect(result.current.resolution?.visibleLines).toEqual(['First reveal']);
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
			expect(addLog).toHaveBeenCalledTimes(1);
			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(result.current.resolution?.visibleLines).toEqual([
				'First reveal',
				'Second reveal',
			]);
			expect(result.current.resolution?.isComplete).toBe(true);
			expect(addLog).toHaveBeenCalledTimes(2);
			expect(addLog).toHaveBeenLastCalledWith('Second reveal', {
				id: 'A',
				name: 'Player A',
			});
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
		} finally {
			vi.useRealTimers();
		}
	});

	it('auto acknowledges when acknowledgement is not required', async () => {
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
					lines: ['Auto line'],
					requireAcknowledgement: false,
				});
			});
			expect(result.current.resolution?.requireAcknowledgement).toBe(false);
			expect(addLog).toHaveBeenCalledWith('Auto line', undefined);
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

	it('accumulates resolution lines across steps in the same phase', async () => {
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
				timeScaleRef.current = 1;
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
			const firstSource = {
				kind: 'phase' as const,
				label: 'Growth Phase',
				icon: '🌱',
				id: 'growth',
				name: 'Step One',
			};
			act(() => {
				void result.current.showResolution({
					lines: ['Growth Phase – Step One', '+2 Gold'],
					summaries: ['+2 Gold'],
					source: firstSource,
					requireAcknowledgement: false,
					actorLabel: 'Growth Phase',
				});
			});
			expect(result.current.resolution?.visibleLines).toEqual([
				'Growth Phase – Step One',
			]);
			act(() => {
				vi.advanceTimersByTime(ACTION_EFFECT_DELAY);
			});
			expect(result.current.resolution?.visibleLines).toEqual([
				'Growth Phase – Step One',
				'+2 Gold',
			]);
			const secondSource = { ...firstSource, name: 'Step Two' };
			act(() => {
				void result.current.showResolution({
					lines: ['Growth Phase – Step Two', '+1 Population'],
					summaries: ['+1 Population'],
					source: secondSource,
					requireAcknowledgement: false,
					actorLabel: 'Growth Phase',
				});
			});
			expect(result.current.resolution?.lines).toEqual([
				'Growth Phase – Step One',
				'+2 Gold',
				'Growth Phase – Step Two',
				'+1 Population',
			]);
			expect(result.current.resolution?.visibleLines).toEqual([
				'Growth Phase – Step One',
				'+2 Gold',
				'Growth Phase – Step Two',
			]);
			expect(result.current.resolution?.summaries).toEqual([
				'+2 Gold',
				'+1 Population',
			]);
			act(() => {
				vi.advanceTimersByTime(ACTION_EFFECT_DELAY);
			});
			expect(result.current.resolution?.visibleLines).toEqual([
				'Growth Phase – Step One',
				'+2 Gold',
				'Growth Phase – Step Two',
				'+1 Population',
			]);
			act(() => {
				vi.advanceTimersByTime(ACTION_EFFECT_DELAY);
			});
			await Promise.resolve();
			expect(result.current.resolution).toBeNull();
			expect(addLog).toHaveBeenCalledWith('Growth Phase – Step Two', undefined);
			expect(addLog).toHaveBeenCalledWith('+1 Population', undefined);
		} finally {
			vi.useRealTimers();
		}
	});
});
