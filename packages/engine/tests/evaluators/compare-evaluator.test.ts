import { beforeAll, describe, expect, it } from 'vitest';
import type { EvaluatorDef } from '../../src/evaluators';
import { EVALUATORS, compareEvaluator } from '../../src/evaluators';
import type { EngineContext } from '../../src/context';

describe('compareEvaluator', () => {
	const context = {} as EngineContext;

	beforeAll(() => {
		EVALUATORS.add('branch-test', () => 7);
	});

	it('evaluates all comparison operators', () => {
		const evaluatorRef: EvaluatorDef = {
			type: 'branch-test',
			params: {},
		};

		const cases: Array<
			[
				operator: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne',
				left: EvaluatorDef | number,
				right: EvaluatorDef | number,
				expected: number,
			]
		> = [
			['lt', 1, 3, 1],
			['lte', 3, 3, 1],
			['gt', 5, 2, 1],
			['gte', 5, 5, 1],
			['eq', evaluatorRef, 7, 1],
			['ne', evaluatorRef, 6, 1],
		];

		for (const [operator, left, right, expected] of cases) {
			const result = compareEvaluator(
				{
					params: { left, right, operator },
				} as EvaluatorDef,
				context,
			);

			expect(result).toBe(expected);
		}
	});

	it('returns zero for an unsupported operator', () => {
		const result = compareEvaluator(
			{
				params: {
					left: 5,
					right: 5,
					operator: 'invalid' as unknown as 'lt',
				},
			} as EvaluatorDef,
			context,
		);

		expect(result).toBe(0);
	});
});
