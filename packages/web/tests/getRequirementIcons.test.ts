import { describe, expect, it } from 'vitest';
import {
	getRequirementIcons,
	registerRequirementIconGetter,
} from '../src/utils/getRequirementIcons';
import type {
	TranslationAssets,
	TranslationContext,
} from '../src/translation/context';
import { createDefaultTranslationAssets } from './helpers/translationAssets';

const EMPTY_REGISTRY = {
	get: (_id: string) => ({}),
	has: () => false,
} as TranslationContext['actions'];

const createTranslationContext = (
	requirements: unknown[],
	assetOverrides: Partial<TranslationAssets> = {},
): TranslationContext => {
	const baseAssets = createDefaultTranslationAssets();
	const mergedAssets: TranslationAssets = {
		...baseAssets,
		...assetOverrides,
		resources: {
			...baseAssets.resources,
			...(assetOverrides.resources ?? {}),
		},
		stats: {
			...baseAssets.stats,
			...(assetOverrides.stats ?? {}),
		},
		populations: {
			...baseAssets.populations,
			...(assetOverrides.populations ?? {}),
		},
		population: {
			...baseAssets.population,
			...(assetOverrides.population ?? {}),
		},
		land: {
			...baseAssets.land,
			...(assetOverrides.land ?? {}),
		},
		slot: {
			...baseAssets.slot,
			...(assetOverrides.slot ?? {}),
		},
		passive: {
			...baseAssets.passive,
			...(assetOverrides.passive ?? {}),
		},
		transfer: {
			...baseAssets.transfer,
			...(assetOverrides.transfer ?? {}),
		},
		upkeep: {
			...baseAssets.upkeep,
			...(assetOverrides.upkeep ?? {}),
		},
		modifiers: {
			...baseAssets.modifiers,
			...(assetOverrides.modifiers ?? {}),
		},
		triggers: {
			...baseAssets.triggers,
			...(assetOverrides.triggers ?? {}),
		},
		tierSummaries: {
			...baseAssets.tierSummaries,
			...(assetOverrides.tierSummaries ?? {}),
		},
		formatPassiveRemoval:
			assetOverrides.formatPassiveRemoval ??
			((description: string) => baseAssets.formatPassiveRemoval(description)),
	};
	return {
		actions: new Map([
			[
				'test-action',
				{
					requirements,
				},
			],
		]) as TranslationContext['actions'],
		buildings: EMPTY_REGISTRY,
		developments: EMPTY_REGISTRY,
		populations: EMPTY_REGISTRY,
		passives: {
			list: () => [],
			get: () => undefined,
			getDefinition: () => undefined,
			definitions: () => [],
			get evaluationMods() {
				return new Map();
			},
		},
		phases: [],
		activePlayer: {
			id: 'A',
			name: 'Player A',
			resources: {},
			stats: {},
			population: {},
		},
		opponent: {
			id: 'B',
			name: 'Player B',
			resources: {},
			stats: {},
			population: {},
		},
		rules: {
			tierDefinitions: [],
			tieredResourceKey: undefined,
			winConditions: [],
		},
		pullEffectLog: () => undefined,
		actionCostResource: undefined,
		recentResourceGains: [],
		compensations: { A: {}, B: {} },
		assets: mergedAssets,
	} satisfies TranslationContext;
};

describe('getRequirementIcons', () => {
	it('includes icons derived from evaluator compare requirements', () => {
		const statKey = 'mock-stat';
		const populationId = 'mock-role';
		const iconAssets: Partial<TranslationAssets> = {
			stats: {
				[statKey]: { icon: '📊' },
			},
			populations: {
				[populationId]: { icon: '👥' },
			},
			population: {},
		};

		const translationContext = createTranslationContext(
			[
				{
					type: 'evaluator',
					method: 'compare',
					params: {
						left: {
							type: 'stat',
							params: { key: statKey },
						},
						right: {
							type: 'population',
							params: { role: populationId },
						},
					},
				},
			],
			iconAssets,
		);

		const icons = getRequirementIcons('test-action', translationContext);
		expect(icons).toContain('📊');
		expect(icons).toContain('👥');
	});

	it('allows registering custom requirement icon handlers', () => {
		const unregister = registerRequirementIconGetter('mock', 'handler', () => [
			'🧪',
		]);
		const translationContext = createTranslationContext(
			[
				{
					type: 'mock',
					method: 'handler',
					params: {},
				},
			],
			{},
		);

		const icons = getRequirementIcons('test-action', translationContext);
		expect(icons).toContain('🧪');

		unregister();
	});

	it('returns default population icon when specific metadata is missing', () => {
		const translationContext = createTranslationContext(
			[
				{
					type: 'evaluator',
					method: 'compare',
					params: {
						left: {
							type: 'population',
							params: { role: 'unknown-role' },
						},
					},
				},
			],
			{
				population: {
					icon: '👤',
				},
			},
		);

		const icons = getRequirementIcons('test-action', translationContext);
		expect(icons).toEqual(['👤']);
	});

	it('uses generic population icon when role is unspecified', () => {
		const translationContext = createTranslationContext(
			[
				{
					type: 'evaluator',
					method: 'compare',
					params: {
						left: {
							type: 'population',
						},
					},
				},
			],
			{
				population: {
					icon: '🧑',
				},
			},
		);

		const icons = getRequirementIcons('test-action', translationContext);
		expect(icons).toContain('🧑');
	});

	it('handles unknown actions without throwing', () => {
		const translationContext = createTranslationContext([], {});
		const icons = getRequirementIcons('missing-action', translationContext);
		expect(icons).toEqual([]);
	});
});
