import type { EvaluatorDef } from '../evaluators';
import type { StatSourceLink } from '../state';
import { isPlainObject } from './link_helpers';

function collectFromEvaluatorDefinition(
	evaluatorDefinition: EvaluatorDef | number | undefined,
): StatSourceLink[] {
	if (!evaluatorDefinition || typeof evaluatorDefinition === 'number') {
		return [];
	}
	if (evaluatorDefinition.type === 'population') {
		const evaluatorParams = isPlainObject(evaluatorDefinition.params)
			? evaluatorDefinition.params
			: undefined;
		const roleIdentifier =
			typeof evaluatorParams?.['role'] === 'string'
				? evaluatorParams['role'].trim()
				: '';
		if (roleIdentifier) {
			return [{ type: 'population', id: roleIdentifier }];
		}
	}
	if (evaluatorDefinition.type === 'development') {
		const evaluatorParams = isPlainObject(evaluatorDefinition.params)
			? evaluatorDefinition.params
			: undefined;
		const developmentIdentifier =
			typeof evaluatorParams?.['id'] === 'string'
				? evaluatorParams['id'].trim()
				: '';
		if (developmentIdentifier) {
			return [{ type: 'development', id: developmentIdentifier }];
		}
	}
	if (evaluatorDefinition.type === 'stat') {
		const evaluatorParams = isPlainObject(evaluatorDefinition.params)
			? evaluatorDefinition.params
			: undefined;
		const statIdentifier =
			typeof evaluatorParams?.['key'] === 'string'
				? evaluatorParams['key'].trim()
				: '';
		if (statIdentifier) {
			return [{ type: 'stat', id: statIdentifier }];
		}
	}
	if (evaluatorDefinition.type === 'compare') {
		const evaluatorParams = isPlainObject(evaluatorDefinition.params)
			? evaluatorDefinition.params
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
	}
	return [];
}

export function collectEvaluatorDependencies(
	evaluatorDefinition: EvaluatorDef | undefined,
): StatSourceLink[] {
	if (!evaluatorDefinition) {
		return [];
	}
	return collectFromEvaluatorDefinition(evaluatorDefinition);
}
