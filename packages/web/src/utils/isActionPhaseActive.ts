export function isActionPhaseActive(
	currentPhase: string,
	actionPhaseId: string | undefined,
	tabsEnabled: boolean,
): boolean {
	return tabsEnabled && currentPhase === actionPhaseId;
}
