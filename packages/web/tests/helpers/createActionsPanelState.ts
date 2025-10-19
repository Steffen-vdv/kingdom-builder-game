import { vi } from 'vitest';

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
			activePlayerId: 'player:test',
			activePlayerName: 'Player Test',
		},
		actionCostResource,
		requests: {
			performAction: vi.fn().mockResolvedValue(undefined),
			advancePhase: vi.fn().mockResolvedValue(undefined),
			refreshSession: vi.fn().mockResolvedValue(undefined),
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
