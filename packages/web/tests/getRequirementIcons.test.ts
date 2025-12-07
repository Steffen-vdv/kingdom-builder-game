import { describe, expect, it } from 'vitest';
import {
	getRequirementIcons,
	registerRequirementIconGetter,
} from '../src/utils/getRequirementIcons';
import type {
	TranslationAssets,
	TranslationContext,
	TranslationResourceMetadata,
	TranslationResourceMetadataSelectors,
	TranslationSignedResourceGainSelectors,
} from '../src/translation/context';
import { createDefaultTranslationAssets } from './helpers/translationAssets';

const EMPTY_REGISTRY = {
	get: (_id: string) => ({}),
	has: () => false,
} as TranslationContext['actions'];

const EMPTY_RESOURCE_METADATA_LIST: readonly TranslationResourceMetadata[] =
	Object.freeze([]);

const EMPTY_RESOURCE_CATALOG = Object.freeze({
	resources: { byId: {}, ordered: [] },
	groups: { byId: {}, ordered: [] },
});

const EMPTY_SIGNED_RESOURCE_GAINS: TranslationSignedResourceGainSelectors = {
	list: () => Object.freeze([] as { resourceId: string; amount: number }[]),
	positives: () =>
		Object.freeze([] as { resourceId: string; amount: number }[]),
	negatives: () =>
		Object.freeze([] as { resourceId: string; amount: number }[]),
	forResource: (_id: string) =>
		Object.freeze([] as { resourceId: string; amount: number }[]),
	sumForResource: () => 0,
};

// Resource IDs for test fixtures
const RESOURCE_IDS = {
	warWeariness: 'resource:stat:war-weariness',
	legion: 'resource:population:role:legion',
} as const;

const createTranslationContext = (
	requirements: unknown[],
	resourceOverrides: Record<string, { icon?: string; label: string }> = {},
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

	const resourceMetadata: TranslationResourceMetadataSelectors = {
		list: () => EMPTY_RESOURCE_METADATA_LIST,
		get: (id: string) => {
			const override = resourceOverrides[id];
			if (override) {
				return { id, ...override };
			}
			return { id, label: id };
		},
		has: (id: string) => id in resourceOverrides,
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
		resources: EMPTY_RESOURCE_CATALOG,
		resourceMetadata,
		resourceGroupMetadata: {
			list: () => EMPTY_RESOURCE_METADATA_LIST,
			get: (id: string) => ({ id, label: id }),
			has: () => false,
		},
		signedResourceGains: EMPTY_SIGNED_RESOURCE_GAINS,
	} satisfies TranslationContext;
};

describe('getRequirementIcons', () => {
	it('includes icons derived from evaluator compare requirements', () => {
		const resourceMetadata = {
			[RESOURCE_IDS.warWeariness]: { icon: '📊', label: 'War Weariness' },
			[RESOURCE_IDS.legion]: { icon: '👥', label: 'Legion' },
		};

		const translationContext = createTranslationContext(
			[
				{
					type: 'evaluator',
					method: 'compare',
					params: {
						left: {
							type: 'resource',
							params: { resourceId: RESOURCE_IDS.warWeariness },
						},
						right: {
							type: 'resource',
							params: { resourceId: RESOURCE_IDS.legion },
						},
					},
				},
			],
			resourceMetadata,
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

	it('returns empty array when resourceId is missing', () => {
		const translationContext = createTranslationContext(
			[
				{
					type: 'evaluator',
					method: 'compare',
					params: {
						left: {
							type: 'resource',
							params: {},
						},
					},
				},
			],
			{},
		);

		const icons = getRequirementIcons('test-action', translationContext);
		expect(icons).toEqual([]);
	});

	it('returns empty array when evaluator type is unknown', () => {
		const translationContext = createTranslationContext(
			[
				{
					type: 'evaluator',
					method: 'compare',
					params: {
						left: {
							type: 'unknown',
							params: { resourceId: 'some-id' },
						},
					},
				},
			],
			{},
		);

		const icons = getRequirementIcons('test-action', translationContext);
		expect(icons).toEqual([]);
	});

	it('handles unknown actions without throwing', () => {
		const translationContext = createTranslationContext([], {});
		const icons = getRequirementIcons('missing-action', translationContext);
		expect(icons).toEqual([]);
	});
});
