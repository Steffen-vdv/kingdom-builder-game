import type { EvaluatorDef } from '../evaluators';
import type { ResourceSourceLink } from '../state';
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
): ResourceSourceLink[] {
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

const resourceCollector: EvaluatorDependencyCollector = (evaluator) => {
	const evaluatorParams = isPlainObject(evaluator.params)
		? evaluator.params
		: undefined;
	const resourceId =
		typeof evaluatorParams?.['resourceId'] === 'string'
			? evaluatorParams['resourceId'].trim()
			: '';
	return resourceId ? [{ type: 'resource', id: resourceId }] : [];
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

registerEvaluatorDependencyCollector('development', developmentCollector);
registerEvaluatorDependencyCollector('resource', resourceCollector);
registerEvaluatorDependencyCollector('compare', compareCollector);

export function collectEvaluatorDependencies(
	evaluatorDefinition: EvaluatorDef | undefined,
): ResourceSourceLink[] {
	if (!evaluatorDefinition) {
		return [];
	}
	return collectFromEvaluatorDefinition(evaluatorDefinition);
}
