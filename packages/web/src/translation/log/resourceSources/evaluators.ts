import { EVALUATORS, type EngineContext } from '@kingdom-builder/engine';
import { POPULATION_ROLES, POPULATION_INFO } from '@kingdom-builder/contents';
import { type ResourceSourceEntry } from './types';

export type EvaluatorIconRenderer = (
	ev: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: EngineContext,
) => void;

function evaluateCount(
	ev: { type: string; params?: Record<string, unknown> },
	context: EngineContext,
): number {
	const handler = EVALUATORS.get(ev.type);
	return Number(handler(ev, context));
}

function renderDevelopmentIcons(
	ev: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: EngineContext,
): void {
	const count = evaluateCount(ev, context);
	const params = ev.params as Record<string, string> | undefined;
	const id = params?.['id'];
	const icon = id ? context.developments.get(id)?.icon || '' : '';
	entry.icons += icon.repeat(count);
}

function renderPopulationIcons(
	ev: { type: string; params?: Record<string, unknown> },
	entry: ResourceSourceEntry,
	context: EngineContext,
): void {
	const count = evaluateCount(ev, context);
	const params = ev.params as Record<string, string> | undefined;
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
