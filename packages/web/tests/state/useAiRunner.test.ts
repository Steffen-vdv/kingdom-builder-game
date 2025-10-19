/** @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAiRunner } from '../../src/state/useAiRunner';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import {
	createResourceKeys,
	createSessionRegistriesPayload,
} from '../helpers/sessionRegistries';
import { createRemoteSessionAdapter } from '../helpers/remoteSessionAdapter';
import { clearSessionStateStore } from '../../src/state/sessionStateStore';

describe('useAiRunner', () => {
	beforeEach(() => {
		clearSessionStateStore();
	});

	it('forwards fatal errors from the action phase runner', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const phases = [
			{
				id: 'phase-main',
				name: 'Main Phase',
				action: true,
				steps: [],
			},
		];
		const activePlayer = createSnapshotPlayer({ id: 'A', aiControlled: true });
		const opponent = createSnapshotPlayer({ id: 'B' });
		const sessionState = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: activePlayer.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot: {
				tieredResourceKey: actionCostResource,
				tierDefinitions: [],
				winConditions: [],
			},
			currentPhase: phases[0]?.id,
			currentStep: phases[0]?.id,
			phaseIndex: 0,
		});
		const registries = createSessionRegistriesPayload();
		const { adapter, api, record, cleanup } = createRemoteSessionAdapter({
			sessionId: 'session-ai',
			snapshot: sessionState,
			registries,
		});
		api.setNextRunAiResponse({
			sessionId: 'session-ai',
			snapshot: sessionState,
			registries,
			ranTurn: true,
		});
		const fatalError = new Error('failed to reach action phase');
		const runUntilActionPhaseCore = vi
			.fn<[], Promise<void>>()
			.mockRejectedValueOnce(fatalError);
		const onFatalSessionError = vi.fn();
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi.fn().mockResolvedValue(undefined);

		renderHook(() =>
			useAiRunner({
				session: adapter,
				sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				showResolution,
				resourceKeys: record.resourceKeys,
				registries: record.registries,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(syncPhaseState).toHaveBeenCalledWith(sessionState, {
			isAdvancing: true,
			canEndTurn: false,
		});
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledTimes(1);
		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		cleanup();
	});

	it('stops background turns when the AI run reports a fatal error', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const phases = [
			{
				id: 'phase-main',
				name: 'Main Phase',
				action: true,
				steps: [],
			},
		];
		const activePlayer = createSnapshotPlayer({ id: 'A', aiControlled: true });
		const opponent = createSnapshotPlayer({ id: 'B' });
		const sessionState = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: activePlayer.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot: {
				tieredResourceKey: actionCostResource,
				tierDefinitions: [],
				winConditions: [],
			},
			currentPhase: phases[0]?.id,
			currentStep: phases[0]?.id,
			phaseIndex: 0,
		});
		const registries = createSessionRegistriesPayload();
		const { adapter, record, cleanup } = createRemoteSessionAdapter({
			sessionId: 'session-ai',
			snapshot: sessionState,
			registries,
		});
		const fatalError = new Error('fatal AI failure');
		const onFatalSessionError = vi.fn();
		vi.spyOn(adapter, 'runAiTurn').mockRejectedValueOnce(fatalError);
		const syncPhaseState = vi.fn();
		const mountedRef = { current: true };
		const showResolution = vi.fn().mockResolvedValue(undefined);

		renderHook(() =>
			useAiRunner({
				session: adapter,
				sessionState,
				runUntilActionPhaseCore: vi.fn(),
				syncPhaseState,
				mountedRef,
				showResolution,
				resourceKeys: record.resourceKeys,
				registries: record.registries,
				onFatalSessionError,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(onFatalSessionError).toHaveBeenCalledWith(fatalError);
		expect(syncPhaseState).not.toHaveBeenCalled();
		cleanup();
	});

	it('shows the AI action resolution before advancing phases', async () => {
		const [actionCostResource] = createResourceKeys();
		if (!actionCostResource) {
			throw new Error('RESOURCE_KEYS is empty');
		}
		const phases = [
			{
				id: 'phase-main',
				name: 'Main Phase',
				action: true,
				steps: [],
			},
		];
		const activePlayer = createSnapshotPlayer({ id: 'A', aiControlled: true });
		const opponent = createSnapshotPlayer({ id: 'B' });
		const sessionState = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: activePlayer.id,
			opponentId: opponent.id,
			phases,
			actionCostResource,
			ruleSnapshot: {
				tieredResourceKey: actionCostResource,
				tierDefinitions: [],
				winConditions: [],
			},
			currentPhase: phases[0]?.id,
			currentStep: phases[0]?.id,
			phaseIndex: 0,
		});
		const registries = createSessionRegistriesPayload();
		const { adapter, api, record, cleanup } = createRemoteSessionAdapter({
			sessionId: 'session-ai',
			snapshot: sessionState,
			registries,
		});
		const updatedSnapshot = structuredClone(sessionState);
		const aiPlayerSnapshot = updatedSnapshot.game.players.find(
			(player) => player.id === activePlayer.id,
		);
		if (aiPlayerSnapshot) {
			aiPlayerSnapshot.resources.gold =
				(aiPlayerSnapshot.resources.gold ?? 0) + 4;
			aiPlayerSnapshot.resources.happiness =
				(aiPlayerSnapshot.resources.happiness ?? 0) - 1;
		}
		const taxActionEntry = Array.from(record.registries.actions.entries()).find(
			([, definition]) => definition.name === 'Tax',
		);
		if (!taxActionEntry) {
			throw new Error('Missing Tax action in registries');
		}
		const [taxActionId] = taxActionEntry;
		updatedSnapshot.metadata = {
			...updatedSnapshot.metadata,
			effectLogs: {
				...(updatedSnapshot.metadata.effectLogs ?? {}),
				'action:resolved': [
					{
						playerId: activePlayer.id,
						actionId: taxActionId,
					},
				],
			},
		};
		api.setNextRunAiResponse({
			sessionId: 'session-ai',
			snapshot: updatedSnapshot,
			registries,
			ranTurn: true,
		});
		const runUntilActionPhaseCore = vi.fn().mockResolvedValue(undefined);
		const syncPhaseState = vi.fn();
		const showResolution = vi.fn().mockResolvedValue(undefined);
		const mountedRef = { current: true };

		renderHook(() =>
			useAiRunner({
				session: adapter,
				sessionState,
				runUntilActionPhaseCore,
				syncPhaseState,
				mountedRef,
				showResolution,
				resourceKeys: record.resourceKeys,
				registries: record.registries,
			}),
		);

		await act(async () => {
			await Promise.resolve();
		});

		expect(showResolution).toHaveBeenCalledTimes(1);
		const [resolutionArgs] = showResolution.mock.calls[0] ?? [];
		const actionId: string | undefined = resolutionArgs?.action?.id;
		expect(actionId).toBeTruthy();
		if (actionId) {
			expect(record.registries.actions.has(actionId)).toBe(true);
			const definition = record.registries.actions.get(actionId);
			expect(definition?.name).toBe('Tax');
		}

		expect(
			resolutionArgs?.lines?.some((line: string) => /Gold/i.test(line ?? '')),
		).toBe(true);
		expect(runUntilActionPhaseCore).toHaveBeenCalledTimes(1);
		cleanup();
	});
});
