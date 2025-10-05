import type { EffectConfig } from '@kingdom-builder/protocol';
import type { PhaseId, PhaseStepId } from './phases';

export type TierSkipStep = { phase: PhaseId; step: PhaseStepId };

export type TierConfig = {
	id: string;
	passiveId?: string;
	slug: string;
	range: { min: number; max?: number };
	incomeMultiplier: number;
	disableGrowth?: boolean;
	skipPhases?: PhaseId[];
	skipSteps?: TierSkipStep[];
	summary: string;
	removal: string;
	effects?: EffectConfig[];
	buildingDiscountPct?: number;
	growthBonusPct?: number;
};
