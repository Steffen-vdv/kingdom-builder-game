import { describe, expect, it } from 'vitest';
import type { ResourceForecastBreakdown } from '@boardsmith/protocol';
import type { TranslationContext } from '../src/translation/context';
import { getForecastBreakdownSummary } from '../src/utils/forecastBreakdown';

/**
 * Create a minimal TranslationContext for testing.
 */
function createMockContext(
	overrides: Partial<TranslationContext> = {},
): TranslationContext {
	const buildingsMap = new Map<string, { name: string; icon?: string }>();
	buildingsMap.set('building:core:farm', { name: 'Farm', icon: '🌾' });
	buildingsMap.set('building:core:mine', { name: 'Mine' });

	const developmentsMap = new Map<string, { name: string; icon?: string }>();
	developmentsMap.set('development:core:irrigation', {
		name: 'Irrigation',
		icon: '💧',
	});

	return {
		buildings: {
			has: (id: string) => buildingsMap.has(id),
			get: (id: string) => buildingsMap.get(id)!,
		},
		developments: {
			has: (id: string) => developmentsMap.has(id),
			get: (id: string) => developmentsMap.get(id)!,
		},
		phases: [
			{ id: 'growth', label: 'Growth Phase', icon: '🌱' },
			{ id: 'upkeep', label: 'Upkeep Phase' },
		],
		assets: {
			resources: {
				'resource:core:gold': { label: 'Gold', icon: '🪙' },
				'resource:core:food': { label: 'Food' },
			},
		},
		...overrides,
	} as unknown as TranslationContext;
}

describe('getForecastBreakdownSummary', () => {
	it('returns empty array when no contributors', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [],
			losses: [],
			net: 0,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result).toEqual([]);
	});

	it('creates Gains section for positive contributions', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 5,
					sourceKey: 'farm-income',
					kind: 'building',
					id: 'building:core:farm',
				},
			],
			losses: [],
			net: 5,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result).toHaveLength(2); // Gains + Net
		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['🪙 +5 from 🌾 Farm'],
		});
		expect(result[1]).toEqual({
			title: 'Net',
			items: ['🪙 +5 net'],
		});
	});

	it('creates Losses section for negative contributions', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [],
			losses: [
				{
					amount: -3,
					sourceKey: 'upkeep-cost',
					kind: 'phase',
					id: 'upkeep',
				},
			],
			net: -3,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result).toHaveLength(2); // Losses + Net
		expect(result[0]).toEqual({
			title: 'Losses',
			items: ['🪙 -3 from Upkeep Phase'],
		});
		expect(result[1]).toEqual({
			title: 'Net',
			items: ['🪙 -3 net'],
		});
	});

	it('creates both Gains and Losses sections when both exist', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 10,
					sourceKey: 'farm-income',
					kind: 'building',
					id: 'building:core:farm',
				},
			],
			losses: [
				{
					amount: -4,
					sourceKey: 'upkeep-cost',
					kind: 'phase',
					id: 'upkeep',
				},
			],
			net: 6,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result).toHaveLength(3); // Gains + Losses + Net
		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['🪙 +10 from 🌾 Farm'],
		});
		expect(result[1]).toEqual({
			title: 'Losses',
			items: ['🪙 -4 from Upkeep Phase'],
		});
		expect(result[2]).toEqual({
			title: 'Net',
			items: ['🪙 +6 net'],
		});
	});

	it('handles zero net with contributors', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 5,
					sourceKey: 'farm-income',
					kind: 'building',
					id: 'building:core:farm',
				},
			],
			losses: [
				{
					amount: -5,
					sourceKey: 'upkeep-cost',
					kind: 'phase',
					id: 'upkeep',
				},
			],
			net: 0,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result).toHaveLength(3);
		expect(result[2]).toEqual({
			title: 'Net',
			items: ['🪙 0 net'],
		});
	});

	it('resolves development labels with icons', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 3,
					sourceKey: 'irrigation-bonus',
					kind: 'development',
					id: 'development:core:irrigation',
				},
			],
			losses: [],
			net: 3,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['🪙 +3 from 💧 Irrigation'],
		});
	});

	it('resolves resource/passive labels', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 2,
					sourceKey: 'gold-passive',
					kind: 'resource',
					id: 'resource:core:gold',
				},
			],
			losses: [],
			net: 2,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['🪙 +2 from 🪙 Gold'],
		});
	});

	it('resolves phase labels with and without icons', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 4,
					sourceKey: 'growth-bonus',
					kind: 'phase',
					id: 'growth',
				},
			],
			losses: [],
			net: 4,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['🪙 +4 from 🌱 Growth Phase'],
		});
	});

	it('falls back to sourceKey when id is missing', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 7,
					sourceKey: 'unknown-source',
				},
			],
			losses: [],
			net: 7,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['🪙 +7 from unknown-source'],
		});
	});

	it('formats unknown IDs as readable labels', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 1,
					sourceKey: 'test-source',
					kind: 'building',
					id: 'building:expansion:gold-mine',
				},
			],
			losses: [],
			net: 1,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		// Should format "gold-mine" as "Gold Mine"
		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['🪙 +1 from Gold Mine'],
		});
	});

	it('handles resources without icons', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 5,
					sourceKey: 'food-gain',
					kind: 'building',
					id: 'building:core:farm',
				},
			],
			losses: [],
			net: 5,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:food',
			breakdown,
			context,
		);

		// No icon prefix since food has no icon
		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['+5 from 🌾 Farm'],
		});
		expect(result[1]).toEqual({
			title: 'Net',
			items: ['+5 net'],
		});
	});

	it('handles buildings without icons', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 8,
					sourceKey: 'mine-income',
					kind: 'building',
					id: 'building:core:mine',
				},
			],
			losses: [],
			net: 8,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['🪙 +8 from Mine'],
		});
	});

	it('handles multiple gains from different sources', () => {
		const context = createMockContext();
		const breakdown: ResourceForecastBreakdown = {
			gains: [
				{
					amount: 5,
					sourceKey: 'farm-income',
					kind: 'building',
					id: 'building:core:farm',
				},
				{
					amount: 3,
					sourceKey: 'mine-income',
					kind: 'building',
					id: 'building:core:mine',
				},
			],
			losses: [],
			net: 8,
		};

		const result = getForecastBreakdownSummary(
			'resource:core:gold',
			breakdown,
			context,
		);

		expect(result[0]).toEqual({
			title: 'Gains',
			items: ['🪙 +5 from 🌾 Farm', '🪙 +3 from Mine'],
		});
	});
});
