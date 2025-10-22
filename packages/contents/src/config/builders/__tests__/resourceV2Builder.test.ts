import { describe, expect, it } from 'vitest';

import {
	ResourceV2TierDefinitionBuilder,
	ResourceV2TierTrackBuilder,
	resourceV2,
	resourceValueDelta,
} from '../resourceV2Builder';

describe('ResourceV2Builder', () => {
	it('guards against duplicate setters such as order()', () => {
		const builder = resourceV2('absorption').name('Absorption').order(1);

		expect(() => builder.order(2)).toThrowErrorMatchingInlineSnapshot(
			'ResourceV2 definition already set order(). Remove the duplicate order() call.',
		);
	});

	it('requires reconciliation when targeting bounded resources', () => {
		const delta = resourceValueDelta('absorption', {
			requiresReconciliation: true,
		}).amount(5);

		expect(() => delta.build()).toThrowErrorMatchingInlineSnapshot(
			'Resource value delta targeting bounded resources must set reconciliation().',
		);
	});

	it('rejects overlapping tier ranges inside a track', () => {
		const track = new ResourceV2TierTrackBuilder('happiness');
		track.tier(new ResourceV2TierDefinitionBuilder('low').range(-5, 0).build());

		expect(() =>
			track.tier(
				new ResourceV2TierDefinitionBuilder('mid').range(-3, 3).build(),
			),
		).toThrowErrorMatchingInlineSnapshot(
			'Tier ranges for track "happiness" overlap. Adjust min/max so tiers are disjoint.',
		);
	});
});
