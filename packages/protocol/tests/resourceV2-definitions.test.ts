import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';

import {
	resourceV2ConfigSchema,
	resourceV2DefinitionSchema,
	resourceV2GroupDefinitionSchema,
	resourceV2ReconciliationStrategySchema,
} from '../src';
import type {
	ResourceV2Config,
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
	ResourceV2ReconciliationStrategy,
} from '../src';

describe('ResourceV2 definitions schema', () => {
	it('matches exported config types', () => {
		expectTypeOf<ResourceV2DefinitionConfig>().toEqualTypeOf<
			ZodInfer<typeof resourceV2DefinitionSchema>
		>();
		expectTypeOf<ResourceV2GroupDefinitionConfig>().toEqualTypeOf<
			ZodInfer<typeof resourceV2GroupDefinitionSchema>
		>();
		expectTypeOf<ResourceV2Config>().toEqualTypeOf<
			ZodInfer<typeof resourceV2ConfigSchema>
		>();
		expectTypeOf<ResourceV2ReconciliationStrategy>().toEqualTypeOf<
			ZodInfer<typeof resourceV2ReconciliationStrategySchema>
		>();
	});

	it('accepts valid ResourceV2 definitions with tier tracks and groups', () => {
		const parent = {
			id: 'absorption-total',
			icon: 'icon-resource-absorption-total',
			label: 'Absorption Total',
			description: 'Aggregated absorption across all sources.',
			order: 0,
			percent: true,
			limited: true as const,
		};

		const definition: ResourceV2DefinitionConfig = {
			id: 'absorption',
			display: {
				icon: 'icon-resource-absorption',
				label: 'Absorption',
				description: 'Pilot track for ResourceV2 migration.',
				order: 1,
				percent: true,
			},
			bounds: {
				lowerBound: 0,
				upperBound: 100,
			},
			trackValueBreakdown: true,
			trackBoundBreakdown: false,
			tierTrack: {
				id: 'absorption-track',
				display: {
					title: 'Absorption Momentum',
					summaryToken: 'absorption-tier-summary',
				},
				steps: [
					{
						id: 'absorption-tier-1',
						min: 0,
						max: 49,
						display: { label: 'Stable' },
						enterEffects: ['effect:absorption:enter-stable'],
						passives: ['passive:absorption:stable'],
					},
					{
						id: 'absorption-tier-2',
						min: 50,
						display: { label: 'Surged' },
						exitEffects: ['effect:absorption:exit-surged'],
					},
				],
			},
			group: {
				groupId: 'absorption-core',
				order: 1,
				parent,
			},
			globalActionCost: { amount: 2 },
		};

		const config: ResourceV2Config = {
			definitions: [definition],
			groups: [
				{
					id: 'absorption-core',
					parent,
				},
			],
		};

		const parsed = resourceV2ConfigSchema.parse(config);

		expect(parsed).toEqual(config);
	});

	it('rejects duplicate tier identifiers', () => {
		expect(() =>
			resourceV2DefinitionSchema.parse({
				id: 'absorption',
				display: {
					icon: 'icon-resource-absorption',
					label: 'Absorption',
					description: 'Pilot track for ResourceV2 migration.',
					order: 1,
				},
				tierTrack: {
					id: 'absorption-track',
					steps: [
						{ id: 'tier-1', min: 0 },
						{ id: 'tier-1', min: 50 },
					],
				},
			}),
		).toThrowError(/duplicate step ids/);
	});

	it('rejects unsupported reconciliation strategies', () => {
		expect(() =>
			resourceV2ReconciliationStrategySchema.parse('reject'),
		).toThrowError(/clamp reconciliation/);
	});

	it('enforces limited ResourceV2 group parents', () => {
		expect(() =>
			resourceV2GroupDefinitionSchema.parse({
				id: 'absorption-core',
				parent: {
					id: 'absorption-total',
					icon: 'icon-resource-absorption-total',
					label: 'Absorption Total',
					description: 'Aggregated absorption across all sources.',
					order: 0,
					percent: true,
					limited: false as unknown as true,
				},
			}),
		).toThrowError(/true/);
	});
});
