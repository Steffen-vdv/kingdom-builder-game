import { type TranslationDiffContext } from './context';
import { type ResourceSourceEntry } from './types';

const DEFAULT_POPULATION_ICON = '👥';

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
	const role = params?.['role'];
	const icon = resolvePopulationIcon(role, context);
	entry.icons += icon.repeat(count);
}

export const EVALUATOR_ICON_RENDERERS: Record<string, EvaluatorIconRenderer> = {
	development: renderDevelopmentIcons,
	population: renderPopulationIcons,
};

function resolvePopulationIcon(
	role: string | undefined,
	context: TranslationDiffContext,
): string {
	if (role) {
		try {
			if (context.populations.has(role)) {
				const definition = context.populations.get(role);
				if (definition?.icon) {
					return definition.icon;
				}
			}
		} catch {
			// ignore missing definitions
		}
	}
	return context.resources['population']?.icon ?? DEFAULT_POPULATION_ICON;
}
