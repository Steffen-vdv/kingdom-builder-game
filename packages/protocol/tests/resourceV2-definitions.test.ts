import { describe, expect, it } from 'vitest';

import {
	resourceV2DefinitionSchema,
	resourceV2GroupDefinitionSchema,
	resourceV2LimitedParentFlagSetSchema,
	resourceV2TierTrackSchema,
} from '../src/resourceV2/definitions';

describe('ResourceV2 definition schemas', () => {
	it('parses a complete definition with tier track and group metadata', () => {
		const definition = {
			id: 'absorption',
			display: {
				icon: 'resources/absorption.png',
				label: 'Absorption',
				description: 'Pilot track for the ResourceV2 migration tests.',
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
				steps: [
					{
						id: 'tier-1',
						min: 0,
						max: 9,
						enterEffects: ['effect:absorption:tier1-enter'],
						exitEffects: ['effect:absorption:tier1-exit'],
						passives: ['passive:absorption:tier1'],
						display: {
							label: 'Tier 1',
							summaryToken: 'absorption.tier1.summary',
						},
					},
					{
						id: 'tier-2',
						min: 10,
						display: {
							label: 'Tier 2',
						},
					},
				],
				display: {
					title: 'Absorption Tiers',
					summaryToken: 'absorption.tiers.summary',
				},
			},
			group: {
				groupId: 'economy',
				order: 2,
				parent: {
					id: 'economy-parent',
					icon: 'resources/economy.png',
					label: 'Economy',
					description: 'Aggregated economy parent resource.',
					order: 1,
					limited: true,
				},
			},
			globalActionCost: {
				amount: 1,
			},
		};

		expect(resourceV2DefinitionSchema.parse(definition)).toEqual(definition);
	});

	it('rejects tier tracks with duplicate step ids', () => {
		expect(() =>
			resourceV2TierTrackSchema.parse({
				id: 'duplicate-track',
				steps: [
					{ id: 'tier-1', min: 0 },
					{ id: 'tier-1', min: 10 },
				],
			}),
		).toThrowError('duplicate id');
	});

	it('rejects unsupported reconciliation strategies in the limited parent flag set', () => {
		expect(() =>
			resourceV2LimitedParentFlagSetSchema.parse(['reject']),
		).toThrowError('clamp');
	});

	it('rejects group definitions that attempt to make parents mutable', () => {
		expect(() =>
			resourceV2GroupDefinitionSchema.parse({
				id: 'economy',
				parent: {
					id: 'economy-parent',
					icon: 'resources/economy.png',
					label: 'Economy',
					description: 'Aggregated economy parent resource.',
					order: 1,
					limited: false,
				},
			}),
		).toThrowError('limited');
	});
});
