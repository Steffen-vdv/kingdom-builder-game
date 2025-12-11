import { describe, it, expect } from 'vitest';
import { requirement, Resource } from '@kingdom-builder/contents';

describe('RequirementBuilder', () => {
	it('builds requirement configs with params', () => {
		// Use resource evaluator with resourceId for both stats and population
		const req = requirement('evaluator', 'compare')
			.param('left', {
				type: 'resource',
				params: { resourceId: Resource.warWeariness },
			})
			.param('operator', 'lt')
			.param('right', {
				type: 'resource',
				params: { resourceId: Resource.legion },
			})
			.build();

		expect(req).toEqual({
			type: 'evaluator',
			method: 'compare',
			params: {
				left: {
					type: 'resource',
					params: { resourceId: Resource.warWeariness },
				},
				operator: 'lt',
				right: {
					type: 'resource',
					params: { resourceId: Resource.legion },
				},
			},
		});
	});
});
