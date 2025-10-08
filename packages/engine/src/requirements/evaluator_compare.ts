import { EVALUATORS, type EvaluatorDef } from '../evaluators';
import type { RequirementFailure, RequirementHandler } from './index';

interface CompareParams {
	left: EvaluatorDef;
	right: EvaluatorDef | number;
	operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
}

function compare(a: number, b: number, op: CompareParams['operator']) {
	switch (op) {
		case 'lt':
			return a < b;
		case 'lte':
			return a <= b;
		case 'gt':
			return a > b;
		case 'gte':
			return a >= b;
		case 'eq':
			return a === b;
		case 'ne':
			return a !== b;
		default:
			return false;
	}
}

const getValue = (
	value: EvaluatorDef | number,
	ctx: Parameters<RequirementHandler>[1],
) =>
	typeof value === 'number'
		? value
		: (EVALUATORS.get(value.type)(value, ctx) as number);

export const evaluatorCompare: RequirementHandler = (req, ctx) => {
	const params = req.params as unknown as CompareParams;
	const leftHandler = EVALUATORS.get(params.left.type);
	const leftVal = leftHandler(params.left, ctx) as number;
	const rightVal = getValue(params.right, ctx);
	if (compare(leftVal, rightVal, params.operator)) {
		return true;
	}
	const failure: RequirementFailure = {
		requirement: req,
		details: {
			left: leftVal,
			right: rightVal,
		},
	};
	return failure;
};
