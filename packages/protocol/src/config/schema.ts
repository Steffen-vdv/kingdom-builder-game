import { z } from 'zod';
import type { EffectDef } from '../effects';

export const requirementSchema = z.object({
	type: z.string(),
	method: z.string(),
	params: z.record(z.unknown()).optional(),
	message: z.string().optional(),
});

export type RequirementConfig = z.infer<typeof requirementSchema>;

const costBagSchema = z.record(z.string(), z.number());

const evaluatorSchema = z.object({
	type: z.string(),
	params: z.record(z.unknown()).optional(),
});

const winConditionOutcomeSchema = z.object({
	title: z.string(),
	description: z.string(),
});

export type WinConditionOutcomeConfig = z.infer<
	typeof winConditionOutcomeSchema
>;

const winConditionDisplaySchema = z.object({
	icon: z.string().optional(),
	winner: winConditionOutcomeSchema,
	loser: winConditionOutcomeSchema,
});

export type WinConditionDisplayConfig = z.infer<
	typeof winConditionDisplaySchema
>;

const winConditionRuleSchema = z.object({
	type: z.string(),
	method: z.string(),
	params: z.record(z.unknown()).optional(),
	awardsTo: z.enum(['self', 'opponents', 'none']).optional(),
});

export type WinConditionRuleConfig = z.infer<typeof winConditionRuleSchema>;

export const winConditionSchema = z.object({
	id: z.string(),
	rule: winConditionRuleSchema,
	priority: z.number().optional(),
	display: winConditionDisplaySchema.optional(),
});

export type WinConditionConfig = z.infer<typeof winConditionSchema>;

export const effectSchema: z.ZodType<EffectDef> = z.lazy(() =>
	z.object({
		type: z.string().optional(),
		method: z.string().optional(),
		params: z.record(z.unknown()).optional(),
		effects: z.array(effectSchema).optional(),
		evaluator: evaluatorSchema.optional(),
		round: z.enum(['up', 'down']).optional(),
		meta: z.record(z.unknown()).optional(),
	}),
);

export type EffectConfig = EffectDef;

const actionEffectGroupOptionSchema = z.object({
	id: z.string(),
	label: z.string().optional(),
	icon: z.string().optional(),
	summary: z.string().optional(),
	description: z.string().optional(),
	actionId: z.string(),
	params: z.record(z.unknown()).optional(),
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

export const startConfigSchema = z.object({
	player: playerStartSchema,
	players: z.record(z.string(), playerStartSchema).optional(),
});

export type PlayerStartConfig = z.infer<typeof playerStartSchema>;
export type StartConfig = z.infer<typeof startConfigSchema>;

export const gameConfigSchema = z.object({
	start: startConfigSchema.optional(),
	actions: z.array(actionSchema).optional(),
	buildings: z.array(buildingSchema).optional(),
	developments: z.array(developmentSchema).optional(),
	populations: z.array(populationSchema).optional(),
	winConditions: z.array(winConditionSchema).optional(),
});

export type GameConfig = z.infer<typeof gameConfigSchema>;

export function validateGameConfig(config: unknown): GameConfig {
	return gameConfigSchema.parse(config);
}
