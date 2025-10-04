import type { EvaluatorDef } from '@kingdom-builder/protocol';
import type { StatSourceLink } from '../state';
import { isPlainObject } from './link_helpers';
import type { EvaluatorDependencyCollector } from './types';

export const evaluatorDependencyCollectorRegistry = new Map<
	EvaluatorDef['type'],
	EvaluatorDependencyCollector
>();

export function registerEvaluatorDependencyCollector(
	type: EvaluatorDef['type'],
	collector: EvaluatorDependencyCollector,
): void {
	evaluatorDependencyCollectorRegistry.set(type, collector);
}

function collectFromEvaluatorDefinition(
	evaluatorDefinition: EvaluatorDef | number | undefined,
): StatSourceLink[] {
	if (!evaluatorDefinition || typeof evaluatorDefinition === 'number') {
		return [];
	}
	const collector = evaluatorDependencyCollectorRegistry.get(
		evaluatorDefinition.type,
	);
	if (!collector) {
		return [];
	}
	return collector(evaluatorDefinition);
}

const populationCollector: EvaluatorDependencyCollector = (evaluator) => {
	const evaluatorParams = isPlainObject(evaluator.params)
		? evaluator.params
		: undefined;
	const roleIdentifier =
		typeof evaluatorParams?.['role'] === 'string'
			? evaluatorParams['role'].trim()
			: '';
	return roleIdentifier ? [{ type: 'population', id: roleIdentifier }] : [];
};

const developmentCollector: EvaluatorDependencyCollector = (evaluator) => {
	const evaluatorParams = isPlainObject(evaluator.params)
		? evaluator.params
		: undefined;
	const developmentIdentifier =
		typeof evaluatorParams?.['id'] === 'string'
			? evaluatorParams['id'].trim()
			: '';
	return developmentIdentifier
		? [{ type: 'development', id: developmentIdentifier }]
		: [];
};

const statCollector: EvaluatorDependencyCollector = (evaluator) => {
	const evaluatorParams = isPlainObject(evaluator.params)
		? evaluator.params
		: undefined;
	const statIdentifier =
		typeof evaluatorParams?.['key'] === 'string'
			? evaluatorParams['key'].trim()
			: '';
	return statIdentifier ? [{ type: 'stat', id: statIdentifier }] : [];
};

const compareCollector: EvaluatorDependencyCollector = (evaluator) => {
	const evaluatorParams = isPlainObject(evaluator.params)
		? evaluator.params
		: undefined;
	if (!evaluatorParams) {
		return [];
	}
	const leftDependencies = collectFromEvaluatorDefinition(
		evaluatorParams['left'] as EvaluatorDef | number,
	);
	const rightDependencies = collectFromEvaluatorDefinition(
		evaluatorParams['right'] as EvaluatorDef | number,
	);
	return [...leftDependencies, ...rightDependencies];
};

registerEvaluatorDependencyCollector('population', populationCollector);
registerEvaluatorDependencyCollector('development', developmentCollector);
registerEvaluatorDependencyCollector('stat', statCollector);
registerEvaluatorDependencyCollector('compare', compareCollector);

export function collectEvaluatorDependencies(
	evaluatorDefinition: EvaluatorDef | undefined,
): StatSourceLink[] {
	if (!evaluatorDefinition) {
		return [];
	}
	return collectFromEvaluatorDefinition(evaluatorDefinition);
}
