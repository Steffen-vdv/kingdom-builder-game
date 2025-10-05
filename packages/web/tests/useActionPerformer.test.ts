/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActionPerformer } from '../src/state/useActionPerformer';
import type { Action } from '../src/state/actionTypes';
import type { EngineContext } from '@kingdom-builder/engine';

const mockSnapshot = {
	resources: {},
	stats: {},
	buildings: [],
	lands: [],
	passives: [],
};

const getActionCostsMock = vi.fn(() => ({}));
const performActionMock = vi.fn(() => [
	{ id: 'house', before: mockSnapshot, after: mockSnapshot },
]);
const resolveActionEffectsMock = vi.fn(() => ({
	effects: [],
	groups: [],
	choices: {},
	missingSelections: [],
	params: {},
	steps: [],
}));
const simulateActionMock = vi.fn();

vi.mock('@kingdom-builder/engine', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		getActionCosts: (...args: unknown[]) => getActionCostsMock(...args),
		performAction: (...args: unknown[]) => performActionMock(...args),
		resolveActionEffects: (...args: unknown[]) =>
			resolveActionEffectsMock(...args),
		simulateAction: (...args: unknown[]) => simulateActionMock(...args),
	};
});

const diffStepSnapshotsMock = vi.fn(() => []);
const logContentMock = vi.fn(() => []);
const snapshotPlayerMock = vi.fn(() => mockSnapshot);

vi.mock('../src/translation', async (importOriginal) => {
	const actual = (await importOriginal()) as Record<string, unknown>;
	return {
		...actual,
		diffStepSnapshots: (...args: unknown[]) => diffStepSnapshotsMock(...args),
		logContent: (...args: unknown[]) => logContentMock(...args),
		snapshotPlayer: (...args: unknown[]) => snapshotPlayerMock(...args),
	};
});

describe('useActionPerformer', () => {
	beforeEach(() => {
		getActionCostsMock.mockClear();
		performActionMock.mockClear();
		resolveActionEffectsMock.mockClear();
		simulateActionMock.mockClear();
		diffStepSnapshotsMock.mockClear();
		logContentMock.mockClear();
		snapshotPlayerMock.mockClear();
	});

	it('skips trace logging when the referenced action is unknown', async () => {
		const action: Action = { id: 'royal_decree', name: 'Royal Decree' };
		const actions = new Map([
			[
				action.id,
				{ id: action.id, name: action.name, icon: '📜', effects: [] },
			],
		]);
		const ctx = {
			actions: {
				get(id: string) {
					const definition = actions.get(id);
					if (!definition) {
						throw new Error(`Unknown id: ${id}`);
					}
					return definition;
				},
				map: actions,
			},
			activePlayer: {
				id: 'A',
				resources: { ap: 3 },
				lands: [],
			},
			game: { devMode: false },
		} as unknown as EngineContext;
		const addLog = vi.fn();
		const logWithEffectDelay = vi.fn(() => Promise.resolve(undefined));
		const updateMainPhaseStep = vi.fn();
		const refresh = vi.fn();
		const pushErrorToast = vi.fn();
		const mountedRef = { current: true };
		const endTurn = vi.fn(() => Promise.resolve(undefined));
		const enqueue = vi.fn(async (task: () => Promise<void> | void) => {
			return await task();
		});

		const { result } = renderHook(() =>
			useActionPerformer({
				ctx,
				actionCostResource: 'ap',
				addLog,
				logWithEffectDelay,
				updateMainPhaseStep,
				refresh,
				pushErrorToast,
				mountedRef,
				endTurn,
				enqueue,
				resourceKeys: [],
			}),
		);

		await act(async () => {
			await result.current.handlePerform(action);
		});

		expect(pushErrorToast).not.toHaveBeenCalled();
		expect(logWithEffectDelay).toHaveBeenCalled();
	});
});
