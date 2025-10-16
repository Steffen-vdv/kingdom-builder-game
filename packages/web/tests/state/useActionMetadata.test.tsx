/** @vitest-environment jsdom */
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import type { RequirementConfig } from '@kingdom-builder/protocol';
import { useActionMetadata } from '../../src/state/useActionMetadata';
import { setGameApi } from '../../src/state/sessionSdk';
import {
	clearSessionStateStore,
	initializeSessionState,
} from '../../src/state/sessionStateStore';
import {
	deleteRemoteAdapter,
	getOrCreateRemoteAdapter,
} from '../../src/state/remoteSessionAdapter';
import type { GameApi } from '../../src/services/gameApi';
import type { LegacyGameEngineContextValue } from '../../src/state/GameContext.types';
import {
	createSnapshotPlayer,
	createSessionSnapshot,
} from '../helpers/sessionFixtures';
import { createTestSessionScaffold } from '../helpers/testSessionScaffold';
import { createSessionRegistriesPayload } from '../helpers/sessionRegistries';

const mockUseGameEngine = vi.fn<[], LegacyGameEngineContextValue>();

vi.mock('../../src/state/GameContext', () => ({
	useGameEngine: () => mockUseGameEngine(),
}));

function MetadataViewer({ actionId }: { actionId: string }) {
	const { costs, requirements, options } = useActionMetadata(actionId);
	return (
		<div>
			<div data-testid="costs">{JSON.stringify(costs)}</div>
			<div data-testid="requirements">
				{requirements.map((entry) => entry.message ?? '').join('|')}
			</div>
			<div data-testid="options">
				{options.map((group) => group.id).join('|')}
			</div>
		</div>
	);
}

describe('useActionMetadata', () => {
	const sessionId = 'session-metadata';
	const actionId = 'expand';
	const costResponse = { sessionId, costs: { gold: 5, ap: 1 } };
	const requirementFailure = {
		requirement: { id: 'req', type: 'mock' } as RequirementConfig,
		message: 'Need more gold',
	};
	const requirementResponse = {
		sessionId,
		requirements: [requirementFailure],
	};
	const optionsResponse = {
		sessionId,
		groups: [
			{
				id: 'group-1',
				title: 'Choose one',
				layout: 'compact' as const,
				options: [],
			},
		],
	};
	const getActionCostsMock = vi.fn().mockResolvedValue(costResponse);
	const getActionRequirementsMock = vi
		.fn()
		.mockResolvedValue(requirementResponse);
	const getActionOptionsMock = vi.fn().mockResolvedValue(optionsResponse);
	const mockGameApi: GameApi = {
		createSession: vi.fn(),
		fetchSnapshot: vi.fn(),
		performAction: vi.fn(),
		advancePhase: vi.fn(),
		setDevMode: vi.fn(),
		updatePlayerName: vi.fn(),
		getActionCosts: getActionCostsMock,
		getActionRequirements: getActionRequirementsMock,
		getActionOptions: getActionOptionsMock,
		runAiTurn: vi.fn(),
		simulateUpcomingPhases: vi.fn(),
	};

	beforeEach(() => {
		const scaffold = createTestSessionScaffold();
		const playerA = createSnapshotPlayer({
			id: 'A',
			resources: { gold: 10, ap: 3 },
			actions: [actionId],
		});
		const playerB = createSnapshotPlayer({ id: 'B' });
		const snapshot = createSessionSnapshot({
			players: [playerA, playerB],
			activePlayerId: playerA.id,
			opponentId: playerB.id,
			phases: scaffold.phases,
			actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
			ruleSnapshot: scaffold.ruleSnapshot,
			metadata: scaffold.metadata,
		});
		const registries = createSessionRegistriesPayload();
		initializeSessionState({ sessionId, snapshot, registries });
		setGameApi(mockGameApi);
		const adapter = getOrCreateRemoteAdapter(sessionId, {
			ensureGameApi: () => mockGameApi,
			runAiTurn: vi.fn(),
		});
		mockUseGameEngine.mockReturnValue({
			sessionId,
			session: adapter,
		} as unknown as LegacyGameEngineContextValue);
	});

	afterEach(() => {
		setGameApi(null);
		deleteRemoteAdapter(sessionId);
		clearSessionStateStore();
		vi.clearAllMocks();
	});

	it('exposes metadata after API responses resolve', async () => {
		render(<MetadataViewer actionId={actionId} />);
		expect(screen.getByTestId('costs').textContent).toBe('{}');
		expect(screen.getByTestId('requirements').textContent).toBe('');
		expect(screen.getByTestId('options').textContent).toBe('');
		await waitFor(() => {
			expect(screen.getByTestId('costs').textContent).toContain('"gold":5');
		});
		expect(screen.getByTestId('requirements').textContent).toContain(
			requirementFailure.message ?? '',
		);
		expect(screen.getByTestId('options').textContent).toContain('group-1');
		expect(getActionCostsMock).toHaveBeenCalledWith(
			{
				actionId,
				sessionId,
			},
			{},
		);
		expect(getActionRequirementsMock).toHaveBeenCalled();
		expect(getActionOptionsMock).toHaveBeenCalled();
	});
});
