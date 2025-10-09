import { Registry } from '@kingdom-builder/protocol';
import type { EngineContext } from '../context';
import { evaluatorCompare } from './evaluator_compare';
import type { RequirementConfig } from '@kingdom-builder/protocol';

export type RequirementDef = RequirementConfig;

export interface RequirementFailure {
	requirement: RequirementDef;
	details?: Record<string, unknown>;
	message?: string;
}

export type RequirementHandler = (
	req: RequirementDef,
	engineContext: EngineContext,
) => true | RequirementFailure;

export class RequirementRegistry extends Registry<RequirementHandler> {}

export const REQUIREMENTS = new RequirementRegistry();

export function runRequirement(
	req: RequirementDef,
	engineContext: EngineContext,
): true | RequirementFailure {
	const handler = REQUIREMENTS.get(`${req.type}:${req.method}`);
	return handler(req, engineContext);
}

export function registerCoreRequirements(
	registry: RequirementRegistry = REQUIREMENTS,
) {
	registry.add('evaluator:compare', evaluatorCompare);
}

export { evaluatorCompare };
