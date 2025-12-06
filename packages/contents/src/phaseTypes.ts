import type { TriggerKey } from './defs';

export const PhaseId = {
	Growth: 'growth',
	Upkeep: 'upkeep',
	Main: 'main',
} as const;

export type PhaseId = (typeof PhaseId)[keyof typeof PhaseId];

export const PhaseStepId = {
	ResolveDynamicTriggers: 'resolve-dynamic-triggers',
	GainIncome: 'gain-income',
	GainActionPoints: 'gain-ap',
	RaiseStrength: 'raise-strength',
	PayUpkeep: 'pay-upkeep',
	WarRecovery: 'war-recovery',
	Main: 'main',
} as const;

export type PhaseStepId = (typeof PhaseStepId)[keyof typeof PhaseStepId];

export const PhaseTrigger = {
	OnGrowthPhase: 'onGrowthPhase',
	OnUpkeepPhase: 'onUpkeepPhase',
} as const satisfies Record<string, TriggerKey>;

export type PhaseTrigger = (typeof PhaseTrigger)[keyof typeof PhaseTrigger];
