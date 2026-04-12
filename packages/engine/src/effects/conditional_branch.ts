import type { EffectHandler } from './index';
import { runEffects } from './index';
import type { EffectDef } from '@kingdom-builder/protocol';
import type { EvaluatorDef } from '../evaluators';
import { EVALUATORS } from '../evaluators';

export interface ConditionalBranchParams extends Record<string, unknown> {
	evaluator: EvaluatorDef;
	operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
	threshold: number;
	thenEffects: EffectDef[];
	elseEffects?: EffectDef[];
}

function compare(
	value: number,
	threshold: number,
	operator: ConditionalBranchParams['operator'],
): boolean {
	switch (operator) {
		case 'gt':
			return value > threshold;
		case 'gte':
			return value >= threshold;
		case 'lt':
			return value < threshold;
		case 'lte':
			return value <= threshold;
		case 'eq':
			return value === threshold;
		case 'ne':
			return value !== threshold;
	}
}

/**
 * Conditional branching effect.
 *
 * Evaluates a condition and runs one of two effect lists
 * based on the result. Enables if/then/else logic in
 * phase step effects and action resolution.
 */
export const conditionalBranch: EffectHandler<ConditionalBranchParams> = (
	effect,
	engineContext,
	_mult,
) => {
	const params = effect.params as ConditionalBranchParams;
	if (!params?.evaluator) {
		throw new Error('conditional:branch requires an evaluator');
	}
	if (params.threshold === undefined) {
		throw new Error('conditional:branch requires a threshold');
	}

	const handler = EVALUATORS.get(params.evaluator.type);
	const value = Number(handler(params.evaluator, engineContext));

	if (compare(value, params.threshold, params.operator)) {
		if (params.thenEffects?.length) {
			runEffects(params.thenEffects, engineContext);
		}
	} else if (params.elseEffects?.length) {
		runEffects(params.elseEffects, engineContext);
	}
};
