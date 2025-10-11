import type { PhaseProgressState } from '../state/phaseTypes';

export function isActionPhaseActive(
	phase: PhaseProgressState,
	actionPhaseId: string | undefined,
): boolean {
	if (!phase.isActionPhase || phase.isAdvancing) {
		return false;
	}
	if (!actionPhaseId) {
		return true;
	}
	return phase.currentPhaseId === actionPhaseId;
}
