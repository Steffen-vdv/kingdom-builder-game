import { z } from 'zod';
import { Resource, Stat, PopulationRole } from '../state';
import type { EffectDef } from '../effects';

const requirementSchema = z.object({
  type: z.string(),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
  message: z.string().optional(),
});

export type RequirementConfig = z.infer<typeof requirementSchema>;

// Basic schemas
const costBagSchema = z.record(z.nativeEnum(Resource), z.number());

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
  }),
);

export type EffectConfig = EffectDef;

// Action
export const actionSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  baseCosts: costBagSchema.optional(),
  requirements: z.array(requirementSchema).optional(),
  effects: z.array(effectSchema),
  system: z.boolean().optional(),
});

export type ActionConfig = z.infer<typeof actionSchema>;

// Building
export const buildingSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  costs: costBagSchema,
  onBuild: z.array(effectSchema).optional(),
  onDevelopmentPhase: z.array(effectSchema).optional(),
  onUpkeepPhase: z.array(effectSchema).optional(),
  onAttackResolved: z.array(effectSchema).optional(),
});

export type BuildingConfig = z.infer<typeof buildingSchema>;

// Development
export const developmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  onBuild: z.array(effectSchema).optional(),
  onDevelopmentPhase: z.array(effectSchema).optional(),
  onAttackResolved: z.array(effectSchema).optional(),
  system: z.boolean().optional(),
});

export type DevelopmentConfig = z.infer<typeof developmentSchema>;

// Population
export const populationSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().optional(),
  onAssigned: z.array(effectSchema).optional(),
  onUnassigned: z.array(effectSchema).optional(),
  onDevelopmentPhase: z.array(effectSchema).optional(),
  onUpkeepPhase: z.array(effectSchema).optional(),
});

export type PopulationConfig = z.infer<typeof populationSchema>;

// Game config
const landStartSchema = z.object({
  developments: z.array(z.string()).optional(),
  slotsMax: z.number().optional(),
  slotsUsed: z.number().optional(),
  tilled: z.boolean().optional(),
});

const playerStartSchema = z.object({
  resources: z.record(z.nativeEnum(Resource), z.number()).optional(),
  stats: z.record(z.nativeEnum(Stat), z.number()).optional(),
  population: z.record(z.nativeEnum(PopulationRole), z.number()).optional(),
  lands: z.array(landStartSchema).optional(),
});

export const startConfigSchema = z.object({
  player: playerStartSchema,
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
