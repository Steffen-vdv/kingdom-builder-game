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
			activePlayerId: 'player-actions',
			activePlayerName: 'Player Actions',
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
		musicEnabled: true,
		onToggleMusic: vi.fn(),
		soundEnabled: true,
		onToggleSound: vi.fn(),
		backgroundAudioMuted: false,
		onToggleBackgroundAudioMute: vi.fn(),
		autoAcknowledgeEnabled: false,
		onToggleAutoAcknowledge: vi.fn(),
		autoPassEnabled: false,
		onToggleAutoPass: vi.fn(),
		autoAcknowledgeResolutions: false,
		onToggleAutoAcknowledgeResolutions: vi.fn(),
		autoPassTurn: false,
		onToggleAutoPassTurn: vi.fn(),
		toasts: [],
		pushToast: vi.fn(),
		pushErrorToast: vi.fn(),
		pushSuccessToast: vi.fn(),
		dismissToast: vi.fn(),
		playerName: 'Player Actions',
		onChangePlayerName: vi.fn(),
	} as const;
}
