export interface PhaseProgressState {
	currentPhaseId: string;
	isActionPhase: boolean;
	canEndTurn: boolean;
	isAdvancing: boolean;
}

export type PhaseStep = {
	title: string;
	items: { text: string; italic?: boolean; done?: boolean }[];
	active: boolean;
};
