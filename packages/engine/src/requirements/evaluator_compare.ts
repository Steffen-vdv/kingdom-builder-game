import { EVALUATORS, type EvaluatorDef } from '../evaluators';
import { Operators, type CompareOperator } from '../evaluators/compare';
import type { RequirementHandler } from './index';

interface CompareParams {
	left: EvaluatorDef;
	right: EvaluatorDef | number;
	operator: CompareOperator;
}

function compare(a: number, b: number, op: CompareOperator) {
	switch (op) {
		case Operators.LessThan:
			return a < b;
		case Operators.LessThanOrEqual:
			return a <= b;
		case Operators.GreaterThan:
			return a > b;
		case Operators.GreaterThanOrEqual:
			return a >= b;
		case Operators.Equal:
			return a === b;
		case Operators.NotEqual:
			return a !== b;
		default:
			return false;
	}
}

export const evaluatorCompare: RequirementHandler = (req, ctx) => {
	const params = req.params as unknown as CompareParams;
	const leftHandler = EVALUATORS.get(params.left.type);
	const leftVal = leftHandler(params.left, ctx) as number;
	const rightVal =
		typeof params.right === 'number'
			? params.right
			: (EVALUATORS.get(params.right.type)(params.right, ctx) as number);
	return compare(leftVal, rightVal, params.operator)
		? true
		: req.message || 'Requirement failed';
};
