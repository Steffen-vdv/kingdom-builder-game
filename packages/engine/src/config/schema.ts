import { z } from 'zod';
import { Resource } from '../state';
import type { EffectDef } from '../effects';
import { EngineContext } from '../context';

export type RequirementFn = (ctx: EngineContext) => true | string;

const requirementSchema: z.ZodType<RequirementFn> = z
  .function()
  .args(z.instanceof(EngineContext))
  .returns(z.union([z.literal(true), z.string()]));

// Basic schemas
const costBagSchema = z.record(z.nativeEnum(Resource), z.number());

const evaluatorSchema = z.object({
  type: z.string(),
  params: z.record(z.unknown()).optional(),
});

// Effect
export const effectSchema = z.lazy(() =>
  z.object({
    type: z.string().optional(),
    method: z.string().optional(),
    params: z.record(z.unknown()).optional(),
    effects: z.array(effectSchema).optional(),
    evaluator: evaluatorSchema.optional(),
    round: z.enum(['up', 'down']).optional(),
  }),
) as z.ZodType<EffectDef<Record<string, unknown>>>;

export type EffectConfig = EffectDef;

// Action
export const actionSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseCosts: costBagSchema.optional(),
  requirements: z.array(requirementSchema).optional(),
  effects: z.array(effectSchema),
});

export type ActionConfig = z.infer<typeof actionSchema>;

// Building
export const buildingSchema = z.object({
  id: z.string(),
  name: z.string(),
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
  onBuild: z.array(effectSchema).optional(),
  onDevelopmentPhase: z.array(effectSchema).optional(),
  onAttackResolved: z.array(effectSchema).optional(),
});

export type DevelopmentConfig = z.infer<typeof developmentSchema>;

// Population
export const populationSchema = z.object({
  id: z.string(),
  name: z.string(),
  onDevelopmentPhase: z.array(effectSchema).optional(),
  onUpkeepPhase: z.array(effectSchema).optional(),
});

export type PopulationConfig = z.infer<typeof populationSchema>;

// Game config
export const gameConfigSchema = z.object({
  actions: z.array(actionSchema).optional(),
  buildings: z.array(buildingSchema).optional(),
  developments: z.array(developmentSchema).optional(),
  populations: z.array(populationSchema).optional(),
});

export type GameConfig = z.infer<typeof gameConfigSchema>;

export function validateGameConfig(config: unknown): GameConfig {
  return gameConfigSchema.parse(config);
}
