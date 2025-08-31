import { EVALUATORS, type EvaluatorDef } from '../evaluators';
import type { RequirementHandler } from './index';

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
