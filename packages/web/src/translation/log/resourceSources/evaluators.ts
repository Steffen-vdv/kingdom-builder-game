import { POPULATION_ROLES, POPULATION_INFO } from '@kingdom-builder/contents';
import { type TranslationDiffContext } from './context';
import { type ResourceSourceEntry } from './types';

export type EvaluatorIconRenderer = (
	evaluatorDefinition: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: TranslationDiffContext,
) => void;

function evaluateCount(
	evaluatorDefinition: { type: string; params?: Record<string, unknown> },
	context: TranslationDiffContext,
): number {
	return context.evaluate(evaluatorDefinition);
}

function renderDevelopmentIcons(
	evaluatorDefinition: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: TranslationDiffContext,
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
	context: TranslationDiffContext,
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
