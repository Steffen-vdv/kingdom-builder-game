import type {
	TranslationActionCategoryRegistry,
	TranslationAssets,
	TranslationContext,
	TranslationPassives,
	TranslationPlayer,
	TranslationRegistry,
	TranslationResourceCatalogV2,
	TranslationResourceV2Metadata,
	TranslationResourceV2MetadataSelectors,
	TranslationSignedResourceGainSelectors,
} from '../../src/translation/context';
import type { SessionRuleSnapshot } from '@kingdom-builder/protocol';

const EMPTY_MODIFIERS = new Map<string, ReadonlyMap<string, unknown>>();

const EMPTY_ASSETS: TranslationAssets = {
	resources: {},
	stats: {},
	populations: {},
	population: {},
	land: {},
	slot: {},
	passive: {},
	transfer: {},
	upkeep: {},
	modifiers: {},
	triggers: {},
	tierSummaries: {},
	formatPassiveRemoval: (description: string) =>
		`Active as long as ${description}`,
};

const EMPTY_PASSIVES: TranslationPassives = {
	list() {
		return [];
	},
	get() {
		return undefined;
	},
	getDefinition() {
		return undefined;
	},
	definitions() {
		return [];
	},
	get evaluationMods() {
		return EMPTY_MODIFIERS;
	},
};

const EMPTY_RESOURCE_CATALOG: TranslationResourceCatalogV2 = Object.freeze({
	resources: Object.freeze({ ordered: [], byId: {} }),
	groups: Object.freeze({ ordered: [], byId: {} }),
});

const EMPTY_RESOURCE_VALUES = Object.freeze(
	{},
) as TranslationPlayer['resourcesV2'];
const EMPTY_RESOURCE_BOUNDS = Object.freeze(
	{},
) as TranslationPlayer['resourceBoundsV2'];

const EMPTY_RESOURCE_METADATA_LIST: readonly TranslationResourceV2Metadata[] =
	Object.freeze([]);

const createEmptyResourceMetadata = (
	id: string,
): TranslationResourceV2Metadata => Object.freeze({ id, label: id });

const EMPTY_RESOURCE_METADATA: TranslationResourceV2MetadataSelectors =
	Object.freeze({
		list: () => EMPTY_RESOURCE_METADATA_LIST,
		get: (id: string) => createEmptyResourceMetadata(id),
		has: () => false,
	});

const EMPTY_GAIN_ARRAY = Object.freeze([] as { key: string; amount: number }[]);

const EMPTY_SIGNED_RESOURCE_GAINS: TranslationSignedResourceGainSelectors =
	Object.freeze({
		list: () => EMPTY_GAIN_ARRAY,
		positives: () => EMPTY_GAIN_ARRAY,
		negatives: () => EMPTY_GAIN_ARRAY,
		forResource: (_id: string) => EMPTY_GAIN_ARRAY,
		sumForResource: () => 0,
	});

const EMPTY_ACTION_CATEGORIES: TranslationActionCategoryRegistry = {
	get(id: string) {
		return Object.freeze({
			id,
			title: id,
			subtitle: id,
			icon: '',
			order: 0,
			layout: 'list',
			hideWhenEmpty: false,
		});
	},
	has() {
		return false;
	},
	list() {
		return [];
	},
};

export function wrapTranslationRegistry<TDefinition>(
	registry: Pick<TranslationRegistry<TDefinition>, 'get' | 'has'>,
): TranslationRegistry<TDefinition> {
	return {
		get(id: string) {
			return registry.get(id);
		},
		has(id: string) {
			return registry.has(id);
		},
	};
}

export function toTranslationPlayer(
	player: Pick<TranslationPlayer, 'id' | 'name'> & {
		resources: Record<string, number>;
		population: Record<string, number>;
		stats?: Record<string, number>;
	},
): TranslationPlayer {
	return {
		id: player.id,
		name: player.name,
		resources: { ...player.resources },
		stats: { ...(player.stats ?? {}) },
		population: { ...player.population },
		resourcesV2: EMPTY_RESOURCE_VALUES,
		resourceBoundsV2: EMPTY_RESOURCE_BOUNDS,
	};
}

export function createTranslationContextStub(
	options: Pick<TranslationContext, 'phases' | 'actionCostResource'> & {
		actions: TranslationRegistry<unknown>;
		actionCategories?: TranslationActionCategoryRegistry;
		buildings: TranslationRegistry<unknown>;
		developments: TranslationRegistry<unknown>;
		populations?: TranslationRegistry<unknown>;
		activePlayer: TranslationPlayer;
		opponent: TranslationPlayer;
		rules?: SessionRuleSnapshot;
	},
): TranslationContext {
	const rules: SessionRuleSnapshot =
		options.rules ??
		({
			tieredResourceKey: 'happiness',
			tierDefinitions: [],
			winConditions: [],
		} as SessionRuleSnapshot);
	return {
		actions: options.actions,
		actionCategories: options.actionCategories ?? EMPTY_ACTION_CATEGORIES,
		buildings: options.buildings,
		developments: options.developments,
		populations: options.populations ?? options.actions,
		passives: EMPTY_PASSIVES,
		phases: options.phases,
		activePlayer: options.activePlayer,
		opponent: options.opponent,
		rules,
		pullEffectLog() {
			return undefined;
		},
		actionCostResource: options.actionCostResource,
		recentResourceGains: [],
		compensations: { A: {}, B: {} },
		assets: EMPTY_ASSETS,
		resourcesV2: EMPTY_RESOURCE_CATALOG,
		resourceMetadataV2: EMPTY_RESOURCE_METADATA,
		resourceGroupMetadataV2: EMPTY_RESOURCE_METADATA,
		signedResourceGains: EMPTY_SIGNED_RESOURCE_GAINS,
	};
}
