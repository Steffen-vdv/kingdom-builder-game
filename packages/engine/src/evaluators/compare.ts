import { EVALUATORS, type EvaluatorDef, type EvaluatorHandler } from './index';

interface CompareParams extends Record<string, unknown> {
	left: EvaluatorDef | number;
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
	engineContext: Parameters<EvaluatorHandler<number, CompareParams>>[1],
) =>
	typeof value === 'number'
		? value
		: Number(EVALUATORS.get(value.type)(value, engineContext));

export const compareEvaluator: EvaluatorHandler<number, CompareParams> = (
	definition,
	engineContext,
) => {
	const params = definition.params as CompareParams;
	const leftVal = getValue(params.left, engineContext);
	const rightVal = getValue(params.right, engineContext);
	return compare(leftVal, rightVal, params.operator) ? 1 : 0;
};
