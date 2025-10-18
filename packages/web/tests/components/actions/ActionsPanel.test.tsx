/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ActionsPanel from '../../../src/components/actions/ActionsPanel';
import { RegistryMetadataProvider } from '../../../src/contexts/RegistryMetadataContext';
import { createTestSessionScaffold } from '../../helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../../helpers/sessionFixtures';
import { createPassiveGame } from '../../helpers/createPassiveDisplayGame';
import type { SessionPlayerId } from '@kingdom-builder/protocol/session';
import type { LegacyGameEngineContextValue } from '../../../src/state/GameContext.types';

interface ActionsPanelScenario {
	registries: ReturnType<typeof createTestSessionScaffold>['registries'];
	metadata: ReturnType<typeof createTestSessionScaffold>['metadata'];
	mockGame: LegacyGameEngineContextValue;
	localId: SessionPlayerId;
	opponentId: SessionPlayerId;
	hasAiController: ReturnType<typeof vi.fn>;
}

let currentGame: LegacyGameEngineContextValue;

vi.mock('../../../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
}));

function createScenario(active: 'local' | 'opponent'): ActionsPanelScenario {
	const scaffold = createTestSessionScaffold();
	const actionPhaseIndex = scaffold.phases.findIndex((phase) => phase.action);
	const actionPhaseId =
		actionPhaseIndex === -1
			? scaffold.phases[0]?.id
			: scaffold.phases[actionPhaseIndex]?.id;
	const [localId, opponentId] = ['player-1', 'player-2'].map(
		(id) => id as SessionPlayerId,
	);
	const actionIds = scaffold.registries.actions.keys();
	const localPlayer = createSnapshotPlayer({
		id: localId,
		name: 'Local Hero',
		resources: { gold: 8 },
		actions: actionIds,
	});
	const opponentPlayer = createSnapshotPlayer({
		id: opponentId,
		name: 'AI Opponent',
		resources: { gold: 8 },
		actions: actionIds,
	});
	const sessionState = createSessionSnapshot({
		players: [localPlayer, opponentPlayer],
		activePlayerId: active === 'local' ? localId : opponentId,
		opponentId,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata: scaffold.metadata,
		phaseIndex: actionPhaseIndex === -1 ? 0 : actionPhaseIndex,
		currentPhase: actionPhaseId,
		currentStep: actionPhaseId
			? scaffold.phases.find((phase) => phase.id === actionPhaseId)?.steps?.[0]
					?.id
			: undefined,
	});
	const { mockGame, registries, metadata } = createPassiveGame(sessionState, {
		ruleSnapshot: scaffold.ruleSnapshot,
		registries: scaffold.registries,
		metadata: scaffold.metadata,
	});
	const hasAiController = vi.fn((id: string) => id === opponentId);
	mockGame.session = {
		hasAiController,
	} as unknown as LegacyGameEngineContextValue['session'];
	mockGame.sessionState = sessionState;
	return {
		registries,
		metadata,
		mockGame: mockGame as LegacyGameEngineContextValue,
		localId,
		opponentId,
		hasAiController,
	};
}

function renderPanel(
	scenario: ActionsPanelScenario,
): ReturnType<typeof render> {
	return render(
		<RegistryMetadataProvider
			registries={scenario.registries}
			metadata={scenario.metadata}
		>
			<ActionsPanel />
		</RegistryMetadataProvider>,
	);
}

describe('<ActionsPanel /> turn ownership', () => {
	it('prevents interaction during the opponent turn', () => {
		const scenario = createScenario('opponent');
		currentGame = scenario.mockGame;
		const { container } = renderPanel(scenario);
		expect(scenario.hasAiController).toHaveBeenCalledWith(scenario.localId);
		expect(
			container.querySelector('section[aria-disabled="true"]'),
		).not.toBeNull();
	});

	it('allows interaction during the local turn', () => {
		const scenario = createScenario('local');
		currentGame = scenario.mockGame;
		const { container } = renderPanel(scenario);
		expect(container.querySelector('section[aria-disabled="true"]')).toBeNull();
	});
});
