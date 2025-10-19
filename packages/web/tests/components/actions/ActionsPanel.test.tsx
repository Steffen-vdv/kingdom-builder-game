/** @vitest-environment jsdom */
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	clearSessionActionMetadataStore,
	seedSessionActionMetadata,
} from '../../helpers/mockSessionActionMetadataStore';
const sessionAiMocks = vi.hoisted(() => ({
	hasAiController: vi.fn(),
}));

vi.mock('../../../src/state/sessionAi', () => ({
	hasAiController: sessionAiMocks.hasAiController,
}));

import ActionsPanel from '../../../src/components/actions/ActionsPanel';
import { RegistryMetadataProvider } from '../../../src/contexts/RegistryMetadataContext';
import { createTestSessionScaffold } from '../../helpers/testSessionScaffold';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from '../../helpers/sessionFixtures';
import { createPassiveGame } from '../../helpers/createPassiveDisplayGame';
import { selectSessionView } from '../../../src/state/sessionSelectors';

function createActionsPanelScenario() {
	clearSessionActionMetadataStore();
	const scaffold = createTestSessionScaffold();
	const actionCostResource = scaffold.ruleSnapshot.tieredResourceKey;
	const aiPlayer = createSnapshotPlayer({
		id: 'player-ai',
		name: 'AI Opponent',
		aiControlled: true,
		resources: { [actionCostResource]: 5, gold: 5 },
		actions: ['expand'],
	});
	const humanPlayer = createSnapshotPlayer({
		id: 'player-human',
		name: 'Player Hero',
		resources: { [actionCostResource]: 5, gold: 5 },
		actions: ['expand'],
	});
	const sessionState = createSessionSnapshot({
		players: [aiPlayer, humanPlayer],
		activePlayerId: aiPlayer.id,
		opponentId: humanPlayer.id,
		phases: scaffold.phases,
		actionCostResource,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata: scaffold.metadata,
		turn: 4,
		currentPhase: scaffold.phases[1]?.id ?? 'phase.action',
		currentStep: scaffold.phases[1]?.steps?.[0]?.id ?? 'phase.action.perform',
		phaseIndex: 1,
		stepIndex: 0,
	});
	const { mockGame, registries, metadata } = createPassiveGame(sessionState, {
		ruleSnapshot: scaffold.ruleSnapshot,
		registries: scaffold.registries,
		metadata: scaffold.metadata,
	});
	mockGame.selectors.sessionView = selectSessionView(
		sessionState,
		scaffold.registries,
	);
	const metadataSnapshot = {
		costs: { [actionCostResource]: 1, gold: 2 },
		requirements: [],
		groups: [],
	};
	sessionAiMocks.hasAiController.mockImplementation(
		(_sessionId: string, playerId: string) => playerId === aiPlayer.id,
	);
	for (const actionDefinition of mockGame.selectors.sessionView.actionList) {
		seedSessionActionMetadata(
			mockGame.sessionId,
			actionDefinition.id,
			metadataSnapshot,
		);
	}
	return {
		mockGame,
		actionCostResource,
		registries,
		metadata,
	};
}

let scenario = createActionsPanelScenario();
let mockGame = scenario.mockGame;

vi.mock('../../../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

describe('<ActionsPanel />', () => {
	beforeEach(() => {
		sessionAiMocks.hasAiController.mockReset();
		scenario = createActionsPanelScenario();
		mockGame = scenario.mockGame;
	});

	afterEach(() => {
		cleanup();
	});

	it('disables player interactions while the AI resolves its turn', () => {
		render(
			<RegistryMetadataProvider
				registries={scenario.registries}
				metadata={scenario.metadata}
			>
				<ActionsPanel />
			</RegistryMetadataProvider>,
		);
		expect(screen.getByText('Opponent Turn')).toBeInTheDocument();
		const expandButton = screen.getByRole('button', { name: /expand/i });
		expect(expandButton).toBeDisabled();
	});
});
