import { EVALUATORS, type EvaluatorDef, type EvaluatorHandler } from './index';

export const Operators = {
	LessThan: 'lt',
	LessThanOrEqual: 'lte',
	GreaterThan: 'gt',
	GreaterThanOrEqual: 'gte',
	Equal: 'eq',
	NotEqual: 'ne',
} as const;

export type CompareOperator = (typeof Operators)[keyof typeof Operators];

interface CompareParams extends Record<string, unknown> {
	left: EvaluatorDef | number;
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

export const compareEvaluator: EvaluatorHandler<number, CompareParams> = (
	definition,
	ctx,
) => {
	const params = definition.params as CompareParams;
	const leftVal =
		typeof params.left === 'number'
			? params.left
			: Number(EVALUATORS.get(params.left.type)(params.left, ctx));
	const rightVal =
		typeof params.right === 'number'
			? params.right
			: Number(EVALUATORS.get(params.right.type)(params.right, ctx));
	return compare(leftVal, rightVal, params.operator) ? 1 : 0;
};
