/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MutableRefObject } from 'react';
import type { ActionParams } from '@kingdom-builder/engine';
import type { Action } from '../../src/state/actionTypes';
import { useAiRunner } from '../../src/state/useAiRunner';
import type { LegacySession } from '../../src/state/sessionTypes';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import { createResourceKeys } from '../helpers/sessionRegistries';

describe('useAiRunner', () => {
	it('forwards fatal session errors when AI progression fails', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const activePlayer = createSnapshotPlayer({ id: 'player-1' });
		const opponent = createSnapshotPlayer({ id: 'player-2' });
		const phases = [
			{
				id: 'phase-main',
				name: 'Main Phase',
				action: true,
				steps: [],
			},
		];
		const ruleSnapshot = {
			tieredResourceKey: actionCostResource,
			tierDefinitions: [],
			winConditions: [],
		};
		const sessionState = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: activePlayer.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot,
			turn: 1,
			currentPhase: phases[0]?.id,
			currentStep: phases[0]?.id,
		});
		const actionDefinition = {
			id: 'action.test',
			name: 'Test Action',
		};
		const fatalError = new Error('AI runner failed');
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockRejectedValueOnce(fatalError);
		const performActionMock = vi
			.fn<[Action, ActionParams<string> | undefined], Promise<void>>()
			.mockResolvedValue(undefined);
		const performRef: MutableRefObject<
			(action: Action, params?: ActionParams<string>) => Promise<void>
		> = {
			current: performActionMock,
		};
		const syncPhaseState = vi.fn();
		const onFatalSessionError = vi.fn();
		const session = {
			hasAiController: vi.fn(() => true),
			enqueue: vi.fn(async (task: () => Promise<void>) => {
				await task();
			}),
			runAiTurn: vi.fn(async (_activeId, { performAction }) => {
				await performAction(actionDefinition.id, undefined, undefined);
				return true;
			}),
			getActionDefinition: vi.fn(() => actionDefinition),
			getSnapshot: vi.fn(() => sessionState),
			advancePhase: vi.fn(),
		};
		const mountedRef: MutableRefObject<boolean> = { current: true };
		const legacySession = session as unknown as LegacySession;
		type SessionSnapshotProps = { snapshot: typeof sessionState };

		const { rerender } = renderHook(
			({ snapshot }: SessionSnapshotProps) =>
				useAiRunner({
					session: legacySession,
					sessionState: snapshot,
					runUntilActionPhaseCore,
					syncPhaseState,
					performRef,
					mountedRef,
					onFatalSessionError,
				}),
			{ initialProps: { snapshot: sessionState } },
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(onFatalSessionError).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);

		const nextSessionState = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: activePlayer.id,
			opponentId: opponent.id,
			phases: phases.map((phase) => ({ ...phase })),
			actionCostResource,
			ruleSnapshot,
			turn: 1,
			currentPhase: phases[0]?.id,
			currentStep: phases[0]?.id,
		});

		await act(async () => {
			rerender({ snapshot: nextSessionState });
			await Promise.resolve();
		});

		expect(session.enqueue).toHaveBeenCalledTimes(1);
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
	});
});
