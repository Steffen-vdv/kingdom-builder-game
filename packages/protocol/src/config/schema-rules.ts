import { z } from 'zod';
import { effectSchema } from './schema-effects';

const tierRangeSchema = z.object({
	min: z.number(),
	max: z.number().optional(),
});

const tierEffectSchema = z.object({
	incomeMultiplier: z.number(),
	buildingDiscountPct: z.number().optional(),
	growthBonusPct: z.number().optional(),
	upkeepCouncilReduction: z.number().optional(),
	halveCouncilAPInUpkeep: z.boolean().optional(),
	disableGrowth: z.boolean().optional(),
});

const tierPassivePreviewSchema = z.object({
	id: z.string(),
	effects: z.array(effectSchema).optional(),
});

const tierPassiveTextTokensSchema = z.object({
	summary: z.string().optional(),
	description: z.string().optional(),
	removal: z.string().optional(),
});

const tierDisplayMetadataSchema = z.object({
	removalCondition: z.string().optional(),
	icon: z.string().optional(),
	summaryToken: z.string().optional(),
	title: z.string().optional(),
});

const happinessTierDefinitionSchema = z.object({
	id: z.string(),
	range: tierRangeSchema,
	effect: tierEffectSchema,
	enterEffects: z.array(effectSchema).optional(),
	exitEffects: z.array(effectSchema).optional(),
	preview: tierPassivePreviewSchema.optional(),
	text: tierPassiveTextTokensSchema.optional(),
	display: tierDisplayMetadataSchema.optional(),
});

const winConditionOutcomeSchema = z.enum(['victory', 'defeat', 'none']);

const winConditionResultSchema = z.object({
	subject: winConditionOutcomeSchema,
	opponent: winConditionOutcomeSchema.optional(),
});

const winConditionDisplaySchema = z.object({
	icon: z.string().optional(),
	victory: z.string().optional(),
	defeat: z.string().optional(),
});

const winConditionTriggerSchema = z.object({
	type: z.literal('resource'),
	key: z.string(),
	comparison: z.enum(['lt', 'lte', 'gt', 'gte']),
	value: z.number(),
	target: z.enum(['self', 'opponent']),
});

const winConditionDefinitionSchema = z.object({
	id: z.string(),
	trigger: winConditionTriggerSchema,
	result: winConditionResultSchema,
	display: winConditionDisplaySchema.optional(),
});

const corePhaseIdsSchema = z.object({
	growth: z.string(),
	upkeep: z.string(),
});

export const ruleSetSchema = z.object({
	defaultActionAPCost: z.number(),
	absorptionCapPct: z.number(),
	absorptionRounding: z.enum(['down', 'up', 'nearest']),
	tieredResourceKey: z.string(),
	tierDefinitions: z.array(happinessTierDefinitionSchema),
	slotsPerNewLand: z.number(),
	maxSlotsPerLand: z.number(),
	basePopulationCap: z.number(),
	winConditions: z.array(winConditionDefinitionSchema),
	corePhaseIds: corePhaseIdsSchema.optional(),
});
