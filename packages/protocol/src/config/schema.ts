import { z } from 'zod';

export {
	effectSchema,
	evaluatorSchema,
	requirementSchema,
	type EffectConfig,
	type RequirementConfig,
} from './schema-effects';
import { effectSchema, requirementSchema } from './schema-effects';
export { ruleSetSchema } from './schema-rules';

const costBagSchema = z.record(z.string(), z.number());
const numericRecordSchema = z.record(z.string(), z.number());

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
	/**
	 * When true, the action bypasses the global action cost (e.g., AP).
	 * Only valid for system actions. Useful for initial setup actions that
	 * need to run before players have any resources.
	 */
	free: z.boolean().optional(),
});

export type ActionConfig = z.infer<typeof actionSchema>;

export const buildingSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().optional(),
	costs: costBagSchema,
	upkeep: costBagSchema.optional(),
	onBuild: z.array(effectSchema).optional(),
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
	onPayUpkeepStep: z.array(effectSchema).optional(),
	onGainIncomeStep: z.array(effectSchema).optional(),
	onGainAPStep: z.array(effectSchema).optional(),
});

export type PopulationConfig = z.infer<typeof populationSchema>;

const resourceTierThresholdSchema = z.object({
	min: z.number().optional(),
	max: z.number().optional(),
});

const resourceTierDefinitionSchema = z.object({
	id: z.string(),
	label: z.string(),
	icon: z.string().optional(),
	description: z.string().optional(),
	order: z.number().optional(),
	threshold: resourceTierThresholdSchema,
	enterEffects: z.array(effectSchema).optional(),
	exitEffects: z.array(effectSchema).optional(),
});

const resourceTierTrackMetadataSchema = z.object({
	id: z.string(),
	label: z.string(),
	icon: z.string().optional(),
	description: z.string().optional(),
	order: z.number().optional(),
});

const resourceTierTrackSchema = z.object({
	metadata: resourceTierTrackMetadataSchema,
	tiers: z.array(resourceTierDefinitionSchema),
});

const resourceMetadataSchema = z.object({
	id: z.string(),
	label: z.string(),
	icon: z.string(),
	description: z.string().optional(),
	order: z.number().optional(),
	tags: z.array(z.string()).optional(),
});

const resourceReconciliationModeSchema = z.enum(['clamp', 'pass', 'reject']);

const resourceBoundReferenceSchema = z.object({
	resourceId: z.string(),
	reconciliation: resourceReconciliationModeSchema.optional(),
});

const resourceBoundValueSchema = z.union([
	z.number(),
	resourceBoundReferenceSchema,
]);

const resourceBoundsSchema = z.object({
	lowerBound: resourceBoundValueSchema.optional(),
	upperBound: resourceBoundValueSchema.optional(),
});

const resourceBoundOfConfigSchema = z.object({
	resourceId: z.string(),
	boundType: z.enum(['upper', 'lower']),
});

const resourceDefinitionSchema = resourceMetadataSchema
	.merge(resourceBoundsSchema)
	.extend({
		displayAsPercent: z.boolean().optional(),
		allowDecimal: z.boolean().optional(),
		trackValueBreakdown: z.boolean().optional(),
		trackBoundBreakdown: z.boolean().optional(),
		groupId: z.string().optional(),
		groupOrder: z.number().optional(),
		globalCost: z
			.object({
				amount: z.number(),
			})
			.optional(),
		tierTrack: resourceTierTrackSchema.optional(),
		boundOf: resourceBoundOfConfigSchema.optional(),
	});

const resourceGroupParentSchema = resourceMetadataSchema
	.merge(resourceBoundsSchema)
	.extend({
		displayAsPercent: z.boolean().optional(),
		trackValueBreakdown: z.boolean().optional(),
		trackBoundBreakdown: z.boolean().optional(),
		tierTrack: resourceTierTrackSchema.optional(),
	});

const resourceGroupDefinitionSchema = z.object({
	id: z.string(),
	order: z.number().optional(),
	parent: resourceGroupParentSchema.optional(),
});

const resourceRegistrySchema = z.object({
	byId: z.record(z.string(), resourceDefinitionSchema),
	ordered: z.array(resourceDefinitionSchema),
});

const resourceGroupRegistrySchema = z.object({
	byId: z.record(z.string(), resourceGroupDefinitionSchema),
	ordered: z.array(resourceGroupDefinitionSchema),
});

const resourceCategoryItemSchema = z.union([
	z.object({ type: z.literal('resource'), id: z.string() }),
	z.object({ type: z.literal('group'), id: z.string() }),
]);

const resourceCategoryDefinitionSchema = z.object({
	id: z.string(),
	label: z.string(),
	icon: z.string().optional(),
	description: z.string().optional(),
	order: z.number().optional(),
	contents: z.array(resourceCategoryItemSchema),
});

const resourceCategoryRegistrySchema = z.object({
	byId: z.record(z.string(), resourceCategoryDefinitionSchema),
	ordered: z.array(resourceCategoryDefinitionSchema),
});

const resourceCatalogSchema = z.object({
	resources: resourceRegistrySchema,
	groups: resourceGroupRegistrySchema,
	categories: resourceCategoryRegistrySchema.optional(),
});

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
	resources: numericRecordSchema.optional(),
	stats: numericRecordSchema.optional(),
	population: numericRecordSchema.optional(),
	values: numericRecordSchema.optional(),
	resourceLowerBounds: numericRecordSchema.optional(),
	resourceUpperBounds: numericRecordSchema.optional(),
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
	actions: z.array(actionSchema).optional(),
	buildings: z.array(buildingSchema).optional(),
	developments: z.array(developmentSchema).optional(),
	populations: z.array(populationSchema).optional(),
	phases: z.array(phaseSchema).optional(),
	resourceCatalog: resourceCatalogSchema.optional(),
});

export type ResourceCatalogSnapshot = z.infer<typeof resourceCatalogSchema>;

export type GameConfig = z.infer<typeof gameConfigSchema>;

export function validateGameConfig(config: unknown): GameConfig {
	return gameConfigSchema.parse(config);
}
