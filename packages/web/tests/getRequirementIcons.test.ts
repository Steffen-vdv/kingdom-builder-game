import { describe, expect, it } from 'vitest';
import {
	getRequirementIcons,
	registerRequirementIconGetter,
} from '../src/utils/getRequirementIcons';
import type {
	TranslationContext,
	TranslationAssets,
} from '../src/translation/context';

const EMPTY_REGISTRY = {
	get: (_id: string) => ({}),
	has: () => false,
} as TranslationContext['actions'];

const DEFAULT_ASSETS: TranslationAssets = {
	resources: {},
	stats: {},
	populations: {},
	population: {},
	land: {},
	slot: {},
	passive: {},
	modifiers: {},
	triggers: {},
	tierSummaries: {},
	formatPassiveRemoval: (description: string) =>
		`Active as long as ${description}`,
};

const createTranslationContext = (
	requirements: unknown[],
	assets: Partial<TranslationAssets>,
): TranslationContext => {
	const mergedAssets: TranslationAssets = {
		...DEFAULT_ASSETS,
		...assets,
	} as TranslationAssets;
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

	it('resolves resource evaluator icons from translation assets', () => {
		const resourceKey = 'mock-resource';
		const translationContext = createTranslationContext(
			[
				{
					type: 'evaluator',
					method: 'compare',
					params: {
						left: {
							type: 'resource',
							params: { key: resourceKey },
						},
					},
				},
			],
			{
				resources: {
					[resourceKey]: { icon: '🪙' },
				},
			},
		);

		const icons = getRequirementIcons('test-action', translationContext);
		expect(icons).toEqual(['🪙']);
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
				population: { icon: '👤' },
			},
		);

		const icons = getRequirementIcons('test-action', translationContext);
		expect(icons).toEqual(['👤']);
	});

	it('handles unknown actions without throwing', () => {
		const translationContext = createTranslationContext([], {});
		const icons = getRequirementIcons('missing-action', translationContext);
		expect(icons).toEqual([]);
	});
});
