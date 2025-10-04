import { EVALUATORS, type EngineContext } from '@kingdom-builder/engine';
import { POPULATION_ROLES, POPULATION_INFO } from '@kingdom-builder/contents';
import { type ResourceSourceEntry } from './types';

export type EvaluatorIconRenderer = (
	evaluatorDefinition: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: EngineContext,
) => void;

function evaluateCount(
	evaluatorDefinition: { type: string; params?: Record<string, unknown> },
	context: EngineContext,
): number {
	const handler = EVALUATORS.get(evaluatorDefinition.type);
	return Number(handler(evaluatorDefinition, context));
}

function renderDevelopmentIcons(
	evaluatorDefinition: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: EngineContext,
): void {
	const count = evaluateCount(evaluatorDefinition, context);
	const params = evaluatorDefinition.params as
		| Record<string, string>
		| undefined;
	const id = params?.['id'];
	const icon = id ? context.developments.get(id)?.icon || '' : '';
	entry.icons += icon.repeat(count);
}

function renderPopulationIcons(
	evaluatorDefinition: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: EngineContext,
): void {
	const count = evaluateCount(evaluatorDefinition, context);
	const params = evaluatorDefinition.params as
		| Record<string, string>
		| undefined;
	const role = params?.['role'] as keyof typeof POPULATION_ROLES | undefined;
	const icon = role
		? POPULATION_ROLES[role]?.icon || role
		: POPULATION_INFO.icon;
	entry.icons += icon.repeat(count);
}

export const EVALUATOR_ICON_RENDERERS: Record<string, EvaluatorIconRenderer> = {
	development: renderDevelopmentIcons,
	population: renderPopulationIcons,
};
