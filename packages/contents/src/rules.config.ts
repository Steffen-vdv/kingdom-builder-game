import type { EffectConfig } from '@kingdom-builder/protocol';
import { PhaseId, PhaseStepId } from './phaseTypes';
import { actionDiscountModifier, growthBonusEffect, happinessModifierId, happinessPassiveId, happinessTierId, resourceGainModifier } from './happinessHelpers';

export const HAPPINESS_TIER_ICONS = {
	despair: '😡',
	misery: '😠',
	grim: '😟',
	unrest: '🙁',
	steady: '😐',
	content: '🙂',
	joyful: '😊',
	elated: '😄',
	ecstatic: '🤩',
} as const;

const joinSummary = (...lines: string[]) => lines.join('\n');

export type TierConfig = {
	id: string;
	passiveId?: string;
	slug: keyof typeof HAPPINESS_TIER_ICONS;
	range: { min: number; max?: number };
	incomeMultiplier: number;
	disableGrowth?: boolean;
	skipPhases?: PhaseId[];
	skipSteps?: Array<{ phase: PhaseId; step: PhaseStepId }>;
	summary: string;
	removal: string;
	effects?: EffectConfig[];
	buildingDiscountPct?: number;
};

// Lazy initialization to break circular dependency with happinessHelpers
let cachedTierConfigs: TierConfig[] | null = null;

export function getTierConfigs(): TierConfig[] {
	if (cachedTierConfigs) {
		return cachedTierConfigs;
	}

	// Build configs lazily - the imports are at module level, but builder functions
	// are only called when this function is invoked, after all modules are loaded
	cachedTierConfigs = [
		{
			id: happinessTierId('despair'),
			passiveId: happinessPassiveId('despair'),
			slug: 'despair',
			range: { min: Number.MIN_SAFE_INTEGER, max: -10 },
			incomeMultiplier: 0.5,
			disableGrowth: true,
			skipPhases: [PhaseId.Growth],
			skipSteps: [
				{
					phase: PhaseId.Upkeep,
					step: PhaseStepId.WarRecovery,
				},
			],
			summary: joinSummary('Gain 50% less resources (rounded up).', 'Skip Growth phase.', 'Skip War Recovery step during Upkeep phase.'),
			removal: 'happiness is -10 or lower',
			effects: [resourceGainModifier(happinessModifierId('despair', 'resource-gain'), -0.5)],
		},
		{
			id: happinessTierId('misery'),
			passiveId: happinessPassiveId('misery'),
			slug: 'misery',
			range: { min: -9, max: -8 },
			incomeMultiplier: 0.5,
			disableGrowth: true,
			skipPhases: [PhaseId.Growth],
			summary: joinSummary('Gain 50% less resources (rounded up).', 'Skip Growth phase.'),
			removal: 'happiness stays between -9 and -8',
			effects: [resourceGainModifier(happinessModifierId('misery', 'resource-gain'), -0.5)],
		},
		{
			id: happinessTierId('grim'),
			passiveId: happinessPassiveId('grim'),
			slug: 'grim',
			range: { min: -7, max: -5 },
			incomeMultiplier: 0.75,
			disableGrowth: true,
			skipPhases: [PhaseId.Growth],
			summary: joinSummary('Gain 25% less resources (rounded up).', 'Skip Growth phase.'),
			removal: 'happiness stays between -7 and -5',
			effects: [resourceGainModifier(happinessModifierId('grim', 'resource-gain'), -0.25)],
		},
		{
			id: happinessTierId('unrest'),
			passiveId: happinessPassiveId('unrest'),
			slug: 'unrest',
			range: { min: -4, max: -3 },
			incomeMultiplier: 0.75,
			summary: 'Gain 25% less resources (rounded up).',
			removal: 'happiness stays between -4 and -3',
			effects: [resourceGainModifier(happinessModifierId('unrest', 'resource-gain'), -0.25)],
		},
		{
			id: happinessTierId('steady'),
			slug: 'steady',
			range: { min: -2, max: 2 },
			incomeMultiplier: 1,
			summary: 'No effect',
			removal: 'happiness stays between -2 and +2',
		},
		{
			id: happinessTierId('content'),
			passiveId: happinessPassiveId('content'),
			slug: 'content',
			range: { min: 3, max: 4 },
			incomeMultiplier: 1.25,
			summary: 'Gain 25% more resources (rounded up).',
			removal: 'happiness stays between +3 and +4',
			effects: [resourceGainModifier(happinessModifierId('content', 'resource-gain'), 0.25)],
		},
		{
			id: happinessTierId('joyful'),
			passiveId: happinessPassiveId('joyful'),
			slug: 'joyful',
			range: { min: 5, max: 7 },
			incomeMultiplier: 1.25,
			buildingDiscountPct: 0.2,
			summary: joinSummary('Gain 25% more resources (rounded up).', 'All actions cost 20% less 🪙 gold (rounded up).'),
			removal: 'happiness stays between +5 and +7',
			effects: [resourceGainModifier(happinessModifierId('joyful', 'resource-gain'), 0.25), actionDiscountModifier(happinessModifierId('joyful', 'action-discount'))],
		},
		{
			id: happinessTierId('elated'),
			passiveId: happinessPassiveId('elated'),
			slug: 'elated',
			range: { min: 8, max: 9 },
			incomeMultiplier: 1.5,
			buildingDiscountPct: 0.2,
			summary: joinSummary('Gain 50% more resources (rounded up).', 'All actions cost 20% less 🪙 gold (rounded up).'),
			removal: 'happiness stays between +8 and +9',
			effects: [resourceGainModifier(happinessModifierId('elated', 'resource-gain'), 0.5), actionDiscountModifier(happinessModifierId('elated', 'action-discount'))],
		},
		{
			id: happinessTierId('ecstatic'),
			passiveId: happinessPassiveId('ecstatic'),
			slug: 'ecstatic',
			range: { min: 10 },
			incomeMultiplier: 1.5,
			buildingDiscountPct: 0.2,
			summary: joinSummary('Gain 50% more resources (rounded up).', 'All actions cost 20% less 🪙 gold (rounded up).', 'Gain +20% 📈 Growth.'),
			removal: 'happiness is +10 or higher',
			effects: [resourceGainModifier(happinessModifierId('ecstatic', 'resource-gain'), 0.5), actionDiscountModifier(happinessModifierId('ecstatic', 'action-discount')), growthBonusEffect(0.2)],
		},
	];

	return cachedTierConfigs;
}
