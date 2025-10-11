import { vi } from 'vitest';
import { PhaseId } from '@kingdom-builder/contents';

export function createActionsPanelState(actionCostResource: string) {
	return {
		log: [],
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
		phase: {
			currentPhaseId: PhaseId.Main,
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
