import { describe, it, expect } from 'vitest';
import {
	requirementEvaluatorCompare,
	Operators,
} from '@kingdom-builder/contents/config/builders';
import { Stat, PopulationRole } from '@kingdom-builder/contents';

describe('RequirementBuilder', () => {
	it('builds requirement configs with params', () => {
		const req = requirementEvaluatorCompare()
			.left({ type: 'stat', params: { key: Stat.warWeariness } })
			.operator(Operators.LessThan)
			.right({
				type: 'population',
				params: { role: PopulationRole.Legion },
			})
			.message('War weariness must be lower than legions')
			.build();

		expect(req).toEqual({
			type: 'evaluator',
			method: 'compare',
			params: {
				left: { type: 'stat', params: { key: Stat.warWeariness } },
				operator: Operators.LessThan,
				right: {
					type: 'population',
					params: { role: PopulationRole.Legion },
				},
			},
			message: 'War weariness must be lower than legions',
		});
	});
});
