/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import type {
	SessionCreateResponse,
	SessionPlayerId,
} from '@kingdom-builder/protocol/session';
import type { GameApi } from '../../src/services/gameApi';
import { useActionMetadata } from '../../src/state/useActionMetadata';
import {
	initializeSessionState,
	deleteSessionRecord,
	clearSessionStateStore,
} from '../../src/state/sessionStateStore';
import {
	getOrCreateRemoteAdapter,
	deleteRemoteAdapter,
} from '../../src/state/remoteSessionAdapter';
import { setGameApi } from '../../src/state/sessionSdk';
import type { LegacyGameEngineContextValue } from '../../src/state/GameContext.types';
import { createTestSessionScaffold } from '../helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../helpers/sessionFixtures';
import { createSessionRegistriesPayload } from '../helpers/sessionRegistries';

interface MetadataProbeProps {
	actionId: string;
}

function MetadataProbe({ actionId }: MetadataProbeProps) {
	const { costs, requirements, options } = useActionMetadata(actionId);
	const goldCost = costs.gold ?? 0;
	return (
		<div>
			<span data-testid="cost">{goldCost}</span>
			<span data-testid="requirements">{requirements.length}</span>
			<span data-testid="options">{options.length}</span>
		</div>
	);
}

let mockContext: LegacyGameEngineContextValue;

vi.mock('../../src/state/GameContext', () => ({
	useGameEngine: () => mockContext,
}));

describe('useActionMetadata', () => {
	const sessionId = 'metadata-session';
	const actionId = 'test.action';
	const playerId = 'player-1' as SessionPlayerId;
	const opponentId = 'player-2' as SessionPlayerId;
	const mockGameApi: Partial<GameApi> = {
		getActionCosts: vi.fn(() =>
			Promise.resolve({
				sessionId,
				costs: { gold: 7 },
			}),
		),
		getActionRequirements: vi.fn(() =>
			Promise.resolve({
				sessionId,
				requirements: [
					{
						requirement: {
							type: 'custom',
							id: 'demo',
						},
					},
				],
			}),
		),
		getActionOptions: vi.fn(() =>
			Promise.resolve({
				sessionId,
				groups: [
					{
						id: 'group-1',
						options: [],
					},
				],
			}),
		),
	};

	beforeEach(() => {
		const scaffold = createTestSessionScaffold();
		const registries = createSessionRegistriesPayload();
		const activePlayer = createSnapshotPlayer({
			id: playerId,
			name: 'Active Player',
			resources: { gold: 10 },
		});
		const opponent = createSnapshotPlayer({
			id: opponentId,
			name: 'Opponent',
		});
		const snapshot = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId: playerId,
			opponentId,
			phases: scaffold.phases,
			actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
			ruleSnapshot: scaffold.ruleSnapshot,
			metadata: scaffold.metadata,
		});
		const response: SessionCreateResponse = {
			sessionId,
			snapshot,
			registries,
		};
		initializeSessionState(response);
		setGameApi(mockGameApi as GameApi);
		const adapter = getOrCreateRemoteAdapter(sessionId, {
			ensureGameApi: () => mockGameApi as GameApi,
			runAiTurn: vi.fn(),
		});
		mockContext = {
			sessionId,
			session: adapter,
		} as unknown as LegacyGameEngineContextValue;
	});

	afterEach(() => {
		deleteRemoteAdapter(sessionId);
		deleteSessionRecord(sessionId);
		clearSessionStateStore();
		setGameApi(null);
		vi.clearAllMocks();
	});

	it('fetches metadata and updates when the API responds', async () => {
		render(<MetadataProbe actionId={actionId} />);
		await waitFor(() =>
			expect(screen.getByTestId('cost')).toHaveTextContent('7'),
		);
		expect(mockGameApi.getActionCosts).toHaveBeenCalledWith(
			{ sessionId, actionId },
			{},
		);
		expect(mockGameApi.getActionRequirements).toHaveBeenCalledWith(
			{ sessionId, actionId },
			{},
		);
		expect(mockGameApi.getActionOptions).toHaveBeenCalledWith(
			{ sessionId, actionId },
			{},
		);
		expect(screen.getByTestId('requirements')).toHaveTextContent('1');
		expect(screen.getByTestId('options')).toHaveTextContent('1');
	});
});
