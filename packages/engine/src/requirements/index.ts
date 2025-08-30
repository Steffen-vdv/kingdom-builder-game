import { Registry } from '../registry';
import type { EngineContext } from '../context';
import { populationCap } from './population_cap';
import { buildingExists } from './building_exists';
import type { RequirementConfig } from '../config/schema';

export type RequirementDef = RequirementConfig;

export type RequirementHandler = (
  req: RequirementDef,
  ctx: EngineContext,
) => true | string;

export class RequirementRegistry extends Registry<RequirementHandler> {}

export const REQUIREMENTS = new RequirementRegistry();

export function runRequirement(
  req: RequirementDef,
  ctx: EngineContext,
): true | string {
  const handler = REQUIREMENTS.get(`${req.type}:${req.method}`);
  return handler(req, ctx);
}

export function registerCoreRequirements(
  registry: RequirementRegistry = REQUIREMENTS,
) {
  registry.add('population:cap', populationCap);
  registry.add('building:exists', buildingExists);
}

export { populationCap, buildingExists };
