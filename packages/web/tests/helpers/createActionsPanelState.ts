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
		},
		actionCostResource,
		handlePerform: vi.fn().mockResolvedValue(undefined),
		runUntilActionPhase: vi.fn(),
		handleEndTurn: vi.fn().mockResolvedValue(undefined),
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
