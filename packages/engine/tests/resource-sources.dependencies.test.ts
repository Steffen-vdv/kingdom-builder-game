import { describe, it, expect } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import { collectEvaluatorDependencies } from '../src/resource_sources.ts';

describe('resource source evaluator dependencies', () => {
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
		// Population roles now use 'resource' evaluator type
		const populationDependencies = collectEvaluatorDependencies({
			type: 'resource',
			params: { resourceId: `  ${population.id}  ` },
		});
		expect(populationDependencies).toEqual([
			{ type: 'resource', id: population.id },
		]);
		const resourceDependencies = collectEvaluatorDependencies({
			type: 'resource',
			params: ['not-an-object'] as unknown as Record<string, unknown>,
		});
		expect(resourceDependencies).toEqual([]);
	});

	it('collects nested compare dependencies and skips numbers', () => {
		const factory = createContentFactory();
		const development = factory.development();
		const population = factory.population();
		// Population roles now use 'resource' evaluator type
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
							type: 'resource',
							params: { resourceId: population.id },
						},
					},
				},
			},
		});
		expect(dependencies).toEqual([
			{ type: 'development', id: development.id },
			{ type: 'resource', id: population.id },
		]);
		const noParams = collectEvaluatorDependencies({
			type: 'compare',
			params: null as unknown as Record<string, unknown>,
		});
		expect(noParams).toEqual([]);
	});
});
