import { describe, it, expect } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { collectEvaluatorDependencies } from '../src/stat_sources.ts';

describe('stat source evaluator dependencies', () => {
	it('returns [] when the evaluator is missing or unhandled', () => {
		expect(collectEvaluatorDependencies(undefined)).toEqual([]);
		const missingCollector = collectEvaluatorDependencies({
			type: 'land',
			params: { id: 'example' },
		});
		expect(missingCollector).toEqual([]);
		const unknownType = collectEvaluatorDependencies({
			type: 'unknown',
			params: {},
		});
		expect(unknownType).toEqual([]);
	});

	it('trims identifiers and ignores non-object parameters', () => {
		const factory = createContentFactory();
		const population = factory.population();
		const populationDependencies = collectEvaluatorDependencies({
			type: 'population',
			params: { role: `  ${population.id}  ` },
		});
		expect(populationDependencies).toEqual([
			{ type: 'population', id: population.id },
		]);
		const statDependencies = collectEvaluatorDependencies({
			type: 'stat',
			params: ['not-an-object'] as unknown as Record<string, unknown>,
		});
		expect(statDependencies).toEqual([]);
	});

	it('collects nested compare dependencies and skips numbers', () => {
		const factory = createContentFactory();
		const development = factory.development();
		const population = factory.population();
		const dependencies = collectEvaluatorDependencies({
			type: 'compare',
			params: {
				left: 5,
				right: {
					type: 'compare',
					params: {
						left: {
							type: 'development',
							params: { id: ` ${development.id} ` },
						},
						right: {
							type: 'population',
							params: { role: population.id },
						},
					},
				},
			},
		});
		expect(dependencies).toEqual([
			{ type: 'development', id: development.id },
			{ type: 'population', id: population.id },
		]);
		const noParams = collectEvaluatorDependencies({
			type: 'compare',
			params: null as unknown as Record<string, unknown>,
		});
		expect(noParams).toEqual([]);
	});
});
