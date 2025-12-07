import { useCallback, useMemo } from 'react';
import { useGameEngine } from './GameContext';

export type AdvanceMode =
	| 'start'
	| 'continue'
	| 'next-turn'
	| 'end-turn'
	| null;

export interface AdvanceActionState {
	/** The current mode: what action would be triggered */
	mode: AdvanceMode;
	/** Whether an advance action is currently available */
	canAdvance: boolean;
	/** Trigger the appropriate advance action */
	advance: () => void;
}

/**
 * Central hook that determines what "advance" action is available and provides
 * a unified trigger. Used by both UI buttons and keyboard shortcuts.
 *
 * Modes:
 * - 'start': Game is at initial state, waiting for "Let's Go"
 * - 'continue': A resolution requires acknowledgement (but not end of turn)
 * - 'next-turn': A resolution requires acknowledgement AND it's end of turn
 * - 'end-turn': No resolution pending, but can end turn directly
 * - null: No advance action available
 */
export function useAdvanceAction(): AdvanceActionState {
	const {
		sessionSnapshot,
		phase,
		resolution,
		acknowledgeResolution,
		actionCostResource,
		requests: { advancePhase, startSession },
	} = useGameEngine();

	// Check if this is "next turn" mode (same logic as HoverCard)
	const isNextTurnMode = useMemo(() => {
		if (!resolution) {
			return false;
		}
		if (!resolution.requireAcknowledgement) {
			return false;
		}
		const source = resolution.source;
		const sourceKind =
			typeof source === 'string'
				? source
				: source && typeof source === 'object'
					? source.kind
					: null;
		const isActionSource =
			sourceKind === 'action' || Boolean(resolution.action);
		if (!isActionSource) {
			return false;
		}
		if (!phase.isActionPhase || phase.isAdvancing) {
			return false;
		}
		if (sessionSnapshot.game.conclusion) {
			return false;
		}
		const activePlayerId =
			phase.activePlayerId ?? resolution.player?.id ?? null;
		if (!activePlayerId) {
			return false;
		}
		const activePlayer = sessionSnapshot.game.players.find(
			(player) => player.id === activePlayerId,
		);
		if (!activePlayer) {
			return false;
		}
		const remainingActions = activePlayer.valuesV2?.[actionCostResource] ?? 0;
		if (remainingActions > 0) {
			return false;
		}
		const isAiControlled = Boolean(activePlayer.aiControlled);
		if (!isAiControlled && !phase.canEndTurn) {
			return false;
		}
		return true;
	}, [
		resolution,
		phase.activePlayerId,
		phase.canEndTurn,
		phase.isActionPhase,
		phase.isAdvancing,
		sessionSnapshot.game.conclusion,
		sessionSnapshot.game.players,
		actionCostResource,
	]);

	// Determine the current mode
	const mode = useMemo<AdvanceMode>(() => {
		// Case 1: Awaiting manual start ("Let's Go")
		if (phase.awaitingManualStart) {
			return 'start';
		}

		// Case 2: Resolution needs acknowledgement
		if (
			resolution &&
			resolution.requireAcknowledgement &&
			resolution.isComplete
		) {
			return isNextTurnMode ? 'next-turn' : 'continue';
		}

		// Case 3: Can end turn directly (no resolution pending)
		if (
			(!resolution || !resolution.requireAcknowledgement) &&
			phase.canEndTurn &&
			!phase.isAdvancing
		) {
			return 'end-turn';
		}

		return null;
	}, [
		phase.awaitingManualStart,
		phase.canEndTurn,
		phase.isAdvancing,
		resolution,
		isNextTurnMode,
	]);

	// Single advance function that handles all modes
	const advance = useCallback(() => {
		switch (mode) {
			case 'start':
				void startSession();
				break;
			case 'continue':
				acknowledgeResolution();
				break;
			case 'next-turn':
				acknowledgeResolution();
				void advancePhase();
				break;
			case 'end-turn':
				void advancePhase();
				break;
			default:
				// No action available
				break;
		}
	}, [mode, acknowledgeResolution, advancePhase, startSession]);

	return {
		mode,
		canAdvance: mode !== null,
		advance,
	};
}
