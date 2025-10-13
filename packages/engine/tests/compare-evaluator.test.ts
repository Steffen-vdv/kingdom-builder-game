import { describe, it, expect } from 'vitest';
import { compareEvaluator } from '../src/evaluators/compare.ts';
import type { EvaluatorDef } from '@kingdom-builder/protocol';
import { createTestEngine } from './helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { Stat } from '@kingdom-builder/contents';

describe('compare evaluator', () => {
	it('supports numeric and nested evaluator comparisons across all operators', () => {
		const engineContext = createTestEngine(createContentFactory());
		const definition: EvaluatorDef = {
			type: 'compare',
			params: {
				left: 2,
				right: 5,
				operator: 'lt',
			},
		};
		expect(compareEvaluator(definition, engineContext)).toBe(1);

		definition.params = {
			left: 5,
			right: 5,
			operator: 'lte',
		};
		expect(compareEvaluator(definition, engineContext)).toBe(1);

		definition.params = {
			left: 7,
			right: 5,
			operator: 'gt',
		};
		expect(compareEvaluator(definition, engineContext)).toBe(1);

		definition.params = {
			left: 7,
			right: 7,
			operator: 'gte',
		};
		expect(compareEvaluator(definition, engineContext)).toBe(1);

		definition.params = {
			left: 9,
			right: 9,
			operator: 'eq',
		};
		expect(compareEvaluator(definition, engineContext)).toBe(1);

		definition.params = {
			left: 9,
			right: 3,
			operator: 'ne',
		};
		expect(compareEvaluator(definition, engineContext)).toBe(1);

		const nestedDefinition: EvaluatorDef = {
			type: 'compare',
			params: {
				left: { type: 'stat', params: { key: Stat.growth } },
				right: { type: 'stat', params: { key: Stat.maxPopulation } },
				operator: 'lt',
			},
		};
		engineContext.activePlayer.stats[Stat.growth] = 3;
		engineContext.activePlayer.stats[Stat.maxPopulation] = 4;
		expect(compareEvaluator(nestedDefinition, engineContext)).toBe(1);

		nestedDefinition.params = {
			left: { type: 'stat', params: { key: Stat.maxPopulation } },
			right: { type: 'stat', params: { key: Stat.growth } },
			operator: 'gte',
		};
		expect(compareEvaluator(nestedDefinition, engineContext)).toBe(1);

		nestedDefinition.params = {
			left: { type: 'stat', params: { key: Stat.growth } },
			right: { type: 'stat', params: { key: Stat.maxPopulation } },
			operator: 'gte',
		};
		expect(compareEvaluator(nestedDefinition, engineContext)).toBe(0);
	});
});
