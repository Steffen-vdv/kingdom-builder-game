import { vi } from 'vitest';

export function createActionsPanelState(actionCostResource: string) {
	return {
		log: [],
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
		phaseSteps: [],
		setPhaseSteps: vi.fn(),
		phaseTimer: 0,
		mainApStart: 0,
		displayPhase: 'main',
		setDisplayPhase: vi.fn(),
		phaseHistories: {},
		tabsEnabled: true,
		actionCostResource,
		handlePerform: vi.fn().mockResolvedValue(undefined),
		runUntilActionPhase: vi.fn(),
		handleEndTurn: vi.fn().mockResolvedValue(undefined),
		updateMainPhaseStep: vi.fn(),
		darkMode: false,
		onToggleDark: vi.fn(),
		timeScale: 1,
		setTimeScale: vi.fn(),
	} as const;
}
