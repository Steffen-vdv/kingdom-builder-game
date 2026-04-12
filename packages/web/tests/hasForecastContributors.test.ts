import { describe, expect, it } from 'vitest';
import type { ForecastBreakdownMap } from '@boardsmith/protocol';
import { hasForecastContributors } from '../src/components/player/resourceSnapshots';

describe('hasForecastContributors', () => {
	it('returns false when breakdown is undefined', () => {
		expect(hasForecastContributors(undefined, 'resource:test')).toBe(false);
	});

	it('returns false when resource has no breakdown entry', () => {
		const breakdown: ForecastBreakdownMap = {};
		expect(hasForecastContributors(breakdown, 'resource:test')).toBe(false);
	});

	it('returns false when gains and losses are both empty', () => {
		const breakdown: ForecastBreakdownMap = {
			'resource:test': { gains: [], losses: [], net: 0 },
		};
		expect(hasForecastContributors(breakdown, 'resource:test')).toBe(false);
	});

	it('returns true when only gains are present', () => {
		const breakdown: ForecastBreakdownMap = {
			'resource:test': {
				gains: [{ amount: 5, sourceKey: 'building-1' }],
				losses: [],
				net: 5,
			},
		};
		expect(hasForecastContributors(breakdown, 'resource:test')).toBe(true);
	});

	it('returns true when only losses are present', () => {
		const breakdown: ForecastBreakdownMap = {
			'resource:test': {
				gains: [],
				losses: [{ amount: -3, sourceKey: 'upkeep-1' }],
				net: -3,
			},
		};
		expect(hasForecastContributors(breakdown, 'resource:test')).toBe(true);
	});

	it('returns true when both gains and losses are present (net zero)', () => {
		const breakdown: ForecastBreakdownMap = {
			'resource:test': {
				gains: [{ amount: 5, sourceKey: 'building-1' }],
				losses: [{ amount: -5, sourceKey: 'upkeep-1' }],
				net: 0,
			},
		};
		expect(hasForecastContributors(breakdown, 'resource:test')).toBe(true);
	});

	it('returns true when both gains and losses are present (positive net)', () => {
		const breakdown: ForecastBreakdownMap = {
			'resource:test': {
				gains: [{ amount: 10, sourceKey: 'building-1' }],
				losses: [{ amount: -3, sourceKey: 'upkeep-1' }],
				net: 7,
			},
		};
		expect(hasForecastContributors(breakdown, 'resource:test')).toBe(true);
	});
});
