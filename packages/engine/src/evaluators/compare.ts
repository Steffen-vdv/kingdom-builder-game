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
