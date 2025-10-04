import { z } from 'zod';
import type { EffectDef } from '../effects';

const requirementSchema = z.object({
	type: z.string(),
	method: z.string(),
	params: z.record(z.unknown()).optional(),
	message: z.string().optional(),
});

export type RequirementConfig = z.infer<typeof requirementSchema>;

// Basic schemas
const costBagSchema = z.record(z.string(), z.number());

const evaluatorSchema = z.object({
	type: z.string(),
	params: z.record(z.unknown()).optional(),
});

// Effect
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

export interface ActionEffectGroupOptionConfig {
	id: string;
	label?: string | undefined;
	effects: ActionEffectConfig[];
	meta?: Record<string, unknown> | undefined;
}

export interface ActionEffectGroupConfig {
	group: string;
	label?: string | undefined;
	required?: boolean | undefined;
	options: ActionEffectGroupOptionConfig[];
	meta?: Record<string, unknown> | undefined;
}

export type ActionEffectConfig = EffectConfig | ActionEffectGroupConfig;

const actionEffectSchema: z.ZodType<ActionEffectConfig> = z.lazy(() =>
	z.union([effectGroupSchema, effectSchema]),
);

const effectGroupSchema: z.ZodType<ActionEffectGroupConfig> = z.lazy(() =>
	z.object({
		group: z.string(),
		label: z.string().optional(),
		required: z.boolean().optional(),
		options: z.array(
			z.object({
				id: z.string(),
				label: z.string().optional(),
				effects: z.array(actionEffectSchema),
				meta: z.record(z.unknown()).optional(),
			}),
		),
		meta: z.record(z.unknown()).optional(),
	}),
);

export type ActionEffectGroup = ActionEffectGroupConfig;
export type ActionEffect = ActionEffectConfig;
export type ActionEffectGroupOption = ActionEffectGroupOptionConfig;

// Action
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

// Building
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

// Development
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

// Population
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

// Game config
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
});

export type GameConfig = z.infer<typeof gameConfigSchema>;

export function validateGameConfig(config: unknown): GameConfig {
	return gameConfigSchema.parse(config);
}
