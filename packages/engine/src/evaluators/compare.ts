import { EVALUATORS, type EvaluatorDef, type EvaluatorHandler } from './index';

interface CompareParams extends Record<string, unknown> {
	left: EvaluatorDef | number;
	right: EvaluatorDef | number;
	operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
}

function compare(
	leftValue: number,
	rightValue: number,
	op: CompareParams['operator'],
) {
	switch (op) {
		case 'lt':
			return leftValue < rightValue;
		case 'lte':
			return leftValue <= rightValue;
		case 'gt':
			return leftValue > rightValue;
		case 'gte':
			return leftValue >= rightValue;
		case 'eq':
			return leftValue === rightValue;
		case 'ne':
			return leftValue !== rightValue;
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
