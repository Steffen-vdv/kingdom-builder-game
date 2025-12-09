export const PhaseId = {
	Growth: 'growth',
	Upkeep: 'upkeep',
	Main: 'main',
} as const;

export type PhaseId = (typeof PhaseId)[keyof typeof PhaseId];

export const PhaseStepId = {
	GainIncome: 'gain-income',
	GainActionPoints: 'gain-ap',
	RaiseStrength: 'raise-strength',
	PayUpkeep: 'pay-upkeep',
	WarRecovery: 'war-recovery',
	Main: 'main',
} as const;

export type PhaseStepId = (typeof PhaseStepId)[keyof typeof PhaseStepId];
