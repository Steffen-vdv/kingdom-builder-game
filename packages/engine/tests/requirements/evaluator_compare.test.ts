import { describe, it, expect } from 'vitest';
import { evaluatorCompare } from '../../src/requirements/evaluator_compare';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { advance } from '../../src';
import { Stat, PhaseId } from '@kingdom-builder/contents';

describe('evaluator:compare requirement', () => {
	it('compares stat values', () => {
		const engineContext = createTestEngine(createContentFactory());
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		// Stat values ARE Resource IDs - access via resourceValues
		engineContext.activePlayer.resourceValues[Stat.populationMax] = 2;
		// Use resource evaluator for stats (everything is a resource)
		const requirement = {
			params: {
				left: { type: 'resource', params: { resourceId: Stat.populationMax } },
				right: 1,
				operator: 'gt',
			},
		} as unknown as Parameters<typeof evaluatorCompare>[0];
		expect(evaluatorCompare(requirement, engineContext)).toBe(true);
		requirement.params.operator = 'lte';
		expect(evaluatorCompare(requirement, engineContext)).toEqual({
			requirement,
			details: { left: 2, right: 1 },
		});
		requirement.params.operator = 'eq';
		requirement.params.right = 2;
		expect(evaluatorCompare(requirement, engineContext)).toBe(true);
		requirement.params.operator = 'ne';
		expect(evaluatorCompare(requirement, engineContext)).toEqual({
			requirement,
			details: { left: 2, right: 2 },
		});
	});
});
