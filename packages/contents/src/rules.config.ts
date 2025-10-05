import type { EffectConfig } from '@kingdom-builder/protocol';
import { PhaseId, PhaseStepId } from './phases';
import {
	buildingDiscountModifier,
	growthBonusEffect,
	incomeModifier,
} from './happinessHelpers';

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

export const TIER_CONFIGS: TierConfig[] = [
	{
		id: 'happiness:tier:despair',
		passiveId: 'passive:happiness:despair',
		slug: 'despair',
		range: { min: -10 },
		incomeMultiplier: 0.5,
		disableGrowth: true,
		skipPhases: [PhaseId.Growth],
		skipSteps: [
			{
				phase: PhaseId.Upkeep,
				step: PhaseStepId.WarRecovery,
			},
		],
		summary: joinSummary(
			'During income step, gain 50% less 🪙 gold (rounded up).',
			'Skip Growth phase.',
			'Skip War Recovery step during Upkeep phase.',
		),
		removal: 'happiness is -10 or lower',
		effects: [incomeModifier('happiness:despair:income', -0.5)],
	},
	{
		id: 'happiness:tier:misery',
		passiveId: 'passive:happiness:misery',
		slug: 'misery',
		range: { min: -9, max: -8 },
		incomeMultiplier: 0.5,
		disableGrowth: true,
		skipPhases: [PhaseId.Growth],
		summary: joinSummary(
			'During income step, gain 50% less 🪙 gold (rounded up).',
			'Skip Growth phase.',
		),
		removal: 'happiness stays between -9 and -8',
		effects: [incomeModifier('happiness:misery:income', -0.5)],
	},
	{
		id: 'happiness:tier:grim',
		passiveId: 'passive:happiness:grim',
		slug: 'grim',
		range: { min: -7, max: -5 },
		incomeMultiplier: 0.75,
		disableGrowth: true,
		skipPhases: [PhaseId.Growth],
		summary: joinSummary(
			'During income step, gain 25% less 🪙 gold (rounded up).',
			'Skip Growth phase.',
		),
		removal: 'happiness stays between -7 and -5',
		effects: [incomeModifier('happiness:grim:income', -0.25)],
	},
	{
		id: 'happiness:tier:unrest',
		passiveId: 'passive:happiness:unrest',
		slug: 'unrest',
		range: { min: -4, max: -3 },
		incomeMultiplier: 0.75,
		summary: 'During income step, gain 25% less 🪙 gold (rounded up).',
		removal: 'happiness stays between -4 and -3',
		effects: [incomeModifier('happiness:unrest:income', -0.25)],
	},
	{
		id: 'happiness:tier:steady',
		slug: 'steady',
		range: { min: -2, max: 2 },
		incomeMultiplier: 1,
		summary: 'No effect',
		removal: 'happiness stays between -2 and +2',
	},
	{
		id: 'happiness:tier:content',
		passiveId: 'passive:happiness:content',
		slug: 'content',
		range: { min: 3, max: 4 },
		incomeMultiplier: 1.25,
		summary: 'During income step, gain 25% more 🪙 gold (rounded up).',
		removal: 'happiness stays between +3 and +4',
		effects: [incomeModifier('happiness:content:income', 0.25)],
	},
	{
		id: 'happiness:tier:joyful',
		passiveId: 'passive:happiness:joyful',
		slug: 'joyful',
		range: { min: 5, max: 7 },
		incomeMultiplier: 1.25,
		buildingDiscountPct: 0.2,
		summary: joinSummary(
			'During income step, gain 25% more 🪙 gold (rounded up).',
			'Build action costs 20% less 🪙 gold (rounded up).',
		),
		removal: 'happiness stays between +5 and +7',
		effects: [
			incomeModifier('happiness:joyful:income', 0.25),
			buildingDiscountModifier('happiness:joyful:build-discount'),
		],
	},
	{
		id: 'happiness:tier:elated',
		passiveId: 'passive:happiness:elated',
		slug: 'elated',
		range: { min: 8, max: 9 },
		incomeMultiplier: 1.5,
		buildingDiscountPct: 0.2,
		summary: joinSummary(
			'During income step, gain 50% more 🪙 gold (rounded up).',
			'Build action costs 20% less 🪙 gold (rounded up).',
		),
		removal: 'happiness stays between +8 and +9',
		effects: [
			incomeModifier('happiness:elated:income', 0.5),
			buildingDiscountModifier('happiness:elated:build-discount'),
		],
	},
	{
		id: 'happiness:tier:ecstatic',
		passiveId: 'passive:happiness:ecstatic',
		slug: 'ecstatic',
		range: { min: 10 },
		incomeMultiplier: 1.5,
		buildingDiscountPct: 0.2,
		summary: joinSummary(
			'During income step, gain 50% more 🪙 gold (rounded up).',
			'Build action costs 20% less 🪙 gold (rounded up).',
			'Gain +20% 📈 Growth.',
		),
		removal: 'happiness is +10 or higher',
		effects: [
			incomeModifier('happiness:ecstatic:income', 0.5),
			buildingDiscountModifier('happiness:ecstatic:build-discount'),
			growthBonusEffect(0.2),
		],
	},
];
