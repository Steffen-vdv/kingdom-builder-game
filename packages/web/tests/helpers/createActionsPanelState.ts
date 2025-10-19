import { vi } from 'vitest';
import type { SimulateUpcomingPhasesResult } from '@kingdom-builder/protocol/session';
import type { SessionActionMetadataSnapshot } from '../../src/state/sessionTypes';

interface ActionsPanelStateOptions {
	actionCostResource: string;
	phaseId: string;
}

export function createActionsPanelState({
	actionCostResource,
	phaseId,
}: ActionsPanelStateOptions) {
	return {
		log: [],
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
		phase: {
			currentPhaseId: phaseId,
			isActionPhase: true,
			canEndTurn: true,
			isAdvancing: false,
			activePlayerId: 'player-actions',
			activePlayerName: 'Player Actions',
		},
		actionCostResource,
		requests: {
			performAction: vi.fn().mockResolvedValue(undefined),
			advancePhase: vi.fn().mockResolvedValue(undefined),
			refreshSession: vi.fn().mockResolvedValue(undefined),
			hasAiController: vi.fn().mockReturnValue(false),
			readActionMetadata: vi.fn(
				() =>
					({
						costs: {},
						requirements: [],
						groups: [],
					}) as SessionActionMetadataSnapshot,
			),
			subscribeActionMetadata: vi.fn(() => () => {}),
			getActionCosts: vi.fn(() => ({})),
			getActionRequirements: vi.fn(() => []),
			enqueueTask: vi.fn(async <T>(task: () => Promise<T> | T) => await task()),
			simulateUpcomingPhases: vi.fn(
				() =>
					({
						delta: {
							resources: {},
							stats: {},
							population: {},
						},
					}) as SimulateUpcomingPhasesResult,
			),
		},
		runUntilActionPhase: vi.fn(),
		refreshPhaseState: vi.fn(),
		darkMode: false,
		onToggleDark: vi.fn(),
		resolution: null,
		showResolution: vi.fn().mockResolvedValue(undefined),
		acknowledgeResolution: vi.fn(),
		timeScale: 1,
		setTimeScale: vi.fn(),
	} as const;
}
