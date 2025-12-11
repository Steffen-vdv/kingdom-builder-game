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
		// Use an arbitrary resource ID for testing dependency collection
		const resourceId = 'resource:test:sample';
		const resourceDependencies = collectEvaluatorDependencies({
			type: 'resource',
			params: { resourceId: `  ${resourceId}  ` },
		});
		expect(resourceDependencies).toEqual([
			{ type: 'resource', id: resourceId },
		]);
		const invalidParams = collectEvaluatorDependencies({
			type: 'resource',
			params: ['not-an-object'] as unknown as Record<string, unknown>,
		});
		expect(invalidParams).toEqual([]);
	});

	it('collects nested compare dependencies and skips numbers', () => {
		const factory = createContentFactory();
		const development = factory.development();
		// Use an arbitrary resource ID for testing dependency collection
		const resourceId = 'resource:test:nested';
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
							params: { resourceId },
						},
					},
				},
			},
		});
		expect(dependencies).toEqual([
			{ type: 'development', id: development.id },
			{ type: 'resource', id: resourceId },
		]);
		const noParams = collectEvaluatorDependencies({
			type: 'compare',
			params: null as unknown as Record<string, unknown>,
		});
		expect(noParams).toEqual([]);
	});
});
