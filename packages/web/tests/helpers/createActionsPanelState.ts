import { vi } from 'vitest';
import { PhaseId } from '@kingdom-builder/contents';

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
		displayPhase: PhaseId.Main,
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
		resolution: null,
		showResolution: vi.fn().mockResolvedValue(undefined),
		acknowledgeResolution: vi.fn(),
		timeScale: 1,
		setTimeScale: vi.fn(),
	} as const;
}
