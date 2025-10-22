import { z } from 'zod';
import type { EffectDef } from '../effects';

import { effectSchema } from './effect_schemas';

export { effectSchema, evaluatorSchema } from './effect_schemas';

export const requirementSchema = z.object({
	type: z.string(),
	method: z.string(),
	params: z.record(z.string(), z.unknown()).optional(),
	message: z.string().optional(),
});

export type RequirementConfig = z.infer<typeof requirementSchema>;

export type EffectConfig = EffectDef;

const costBagSchema = z.record(z.string(), z.number());

const actionCategoryLayoutSchema = z.enum([
	'grid-primary',
	'grid-secondary',
	'list',
]);

export const actionCategorySchema = z.object({
	id: z.string(),
	title: z.string(),
	subtitle: z.string().optional(),
	description: z.string().optional(),
	icon: z.string(),
	order: z.number(),
	layout: actionCategoryLayoutSchema,
	hideWhenEmpty: z.boolean().optional(),
	analyticsKey: z.string().optional(),
});

export type ActionCategoryConfig = z.infer<typeof actionCategorySchema>;

const actionEffectGroupOptionSchema = z.object({
	id: z.string(),
	label: z.string().optional(),
	icon: z.string().optional(),
	summary: z.string().optional(),
	description: z.string().optional(),
	actionId: z.string(),
	params: z.record(z.string(), z.unknown()).optional(),
});

export const actionEffectGroupSchema = z.object({
	id: z.string(),
	title: z.string(),
	summary: z.string().optional(),
	description: z.string().optional(),
	icon: z.string().optional(),
	layout: z.enum(['default', 'compact']).optional(),
	options: z.array(actionEffectGroupOptionSchema).min(1),
});

export const actionEffectSchema = z.union([
	actionEffectGroupSchema,
	effectSchema,
]);

export type ActionEffectGroupOption = z.infer<
	typeof actionEffectGroupOptionSchema
>;
export type ActionEffectGroup = z.infer<typeof actionEffectGroupSchema>;
export type ActionEffect = z.infer<typeof actionEffectSchema>;

export const actionSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().optional(),
	baseCosts: costBagSchema.optional(),
	requirements: z.array(requirementSchema).optional(),
	effects: z.array(actionEffectSchema),
	system: z.boolean().optional(),
});

export type ActionConfig = z.infer<typeof actionSchema>;

export const buildingSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().optional(),
	costs: costBagSchema,
	upkeep: costBagSchema.optional(),
	onBuild: z.array(effectSchema).optional(),
	onGrowthPhase: z.array(effectSchema).optional(),
	onUpkeepPhase: z.array(effectSchema).optional(),
	onBeforeAttacked: z.array(effectSchema).optional(),
	onAttackResolved: z.array(effectSchema).optional(),
	onPayUpkeepStep: z.array(effectSchema).optional(),
	onGainIncomeStep: z.array(effectSchema).optional(),
	onGainAPStep: z.array(effectSchema).optional(),
});

export type BuildingConfig = z.infer<typeof buildingSchema>;

export const developmentSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().optional(),
	upkeep: costBagSchema.optional(),
	onBuild: z.array(effectSchema).optional(),
	onGrowthPhase: z.array(effectSchema).optional(),
	onBeforeAttacked: z.array(effectSchema).optional(),
	onAttackResolved: z.array(effectSchema).optional(),
	onPayUpkeepStep: z.array(effectSchema).optional(),
	onGainIncomeStep: z.array(effectSchema).optional(),
	onGainAPStep: z.array(effectSchema).optional(),
	system: z.boolean().optional(),
	populationCap: z.number().optional(),
});

export type DevelopmentConfig = z.infer<typeof developmentSchema>;

export const populationSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().optional(),
	upkeep: costBagSchema.optional(),
	onAssigned: z.array(effectSchema).optional(),
	onUnassigned: z.array(effectSchema).optional(),
	onGrowthPhase: z.array(effectSchema).optional(),
	onUpkeepPhase: z.array(effectSchema).optional(),
	onPayUpkeepStep: z.array(effectSchema).optional(),
	onGainIncomeStep: z.array(effectSchema).optional(),
	onGainAPStep: z.array(effectSchema).optional(),
});

export type PopulationConfig = z.infer<typeof populationSchema>;

const landStartSchema = z.object({
	developments: z.array(z.string()).optional(),
	slotsMax: z.number().optional(),
	slotsUsed: z.number().optional(),
	tilled: z.boolean().optional(),
	upkeep: costBagSchema.optional(),
	onPayUpkeepStep: z.array(effectSchema).optional(),
	onGainIncomeStep: z.array(effectSchema).optional(),
	onGainAPStep: z.array(effectSchema).optional(),
});

const playerStartSchema = z.object({
	resources: z.record(z.string(), z.number()).optional(),
	stats: z.record(z.string(), z.number()).optional(),
	population: z.record(z.string(), z.number()).optional(),
	lands: z.array(landStartSchema).optional(),
});

const startModeConfigSchema = z.object({
	player: playerStartSchema.optional(),
	players: z.record(z.string(), playerStartSchema).optional(),
});

const startModesSchema = z
	.object({
		dev: startModeConfigSchema.optional(),
	})
	.partial();

export const startConfigSchema = z.object({
	player: playerStartSchema,
	players: z.record(z.string(), playerStartSchema).optional(),
	modes: startModesSchema.optional(),
});

export type PlayerStartConfig = z.infer<typeof playerStartSchema>;
export type StartConfig = z.infer<typeof startConfigSchema>;
export type StartModeConfig = z.infer<typeof startModeConfigSchema>;
export type StartModesConfig = z.infer<typeof startModesSchema>;

export const phaseStepSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	triggers: z.array(z.string()).optional(),
	effects: z.array(effectSchema).optional(),
	icon: z.string().optional(),
});

export type PhaseStepConfig = z.infer<typeof phaseStepSchema>;

export const phaseSchema = z.object({
	id: z.string(),
	steps: z.array(phaseStepSchema).min(1),
	action: z.boolean().optional(),
	label: z.string().optional(),
	icon: z.string().optional(),
});

export type PhaseConfig = z.infer<typeof phaseSchema>;

export const gameConfigSchema = z.object({
	start: startConfigSchema.optional(),
	actions: z.array(actionSchema).optional(),
	buildings: z.array(buildingSchema).optional(),
	developments: z.array(developmentSchema).optional(),
	populations: z.array(populationSchema).optional(),
	phases: z.array(phaseSchema).optional(),
});

export type GameConfig = z.infer<typeof gameConfigSchema>;

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

export {
	resourceV2RoundingModeSchema,
	resourceV2ReconciliationStrategySchema,
	resourceV2HookSuppressionSchema,
	resourceV2GlobalActionCostSchema,
	resourceV2TierRangeSchema,
	resourceV2TierPassivePreviewSchema,
	resourceV2TierTextTokensSchema,
	resourceV2TierDisplayMetadataSchema,
	resourceV2TierDefinitionSchema,
	resourceV2TierTrackSchema,
	resourceV2BaseDefinitionSchema,
	resourceV2GroupParentSchema,
	resourceV2DefinitionSchema,
	resourceV2GroupMetadataSchema,
	resourceV2ValueDeltaSchema,
	resourceV2TransferSchema,
	resourceV2BoundAdjustmentSchema,
	resourceV2EffectSchema,
} from './resourceV2';

export type {
	ResourceV2RoundingMode,
	ResourceV2ReconciliationStrategy,
	ResourceV2HookSuppression,
	ResourceV2GlobalActionCost,
	ResourceV2TierRange,
	ResourceV2TierPassivePreview,
	ResourceV2TierTextTokens,
	ResourceV2TierDisplayMetadata,
	ResourceV2TierDefinition,
	ResourceV2TierTrack,
	ResourceV2BaseDefinition,
	ResourceV2GroupParent,
	ResourceV2Definition,
	ResourceV2GroupMetadata,
	ResourceV2ValueDelta,
	ResourceV2Transfer,
	ResourceV2BoundAdjustment,
} from './resourceV2';

export function validateGameConfig(config: unknown): GameConfig {
	return gameConfigSchema.parse(config);
}
