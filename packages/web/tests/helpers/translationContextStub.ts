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
} from '../../src/translation/context';
import type {
	SessionMetadataDescriptor,
	SessionResourceBoundsV2,
	SessionResourceCatalogV2,
	SessionRuleSnapshot,
} from '@kingdom-builder/protocol/session';
import type { SessionRecentResourceGain } from '@kingdom-builder/protocol';
import {
	createResourceV2GroupMetadataSelectors,
	createResourceV2MetadataSelectors,
	createSignedResourceGainSelectors,
} from '../../src/translation/context/resourceV2';

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

const EMPTY_RESOURCE_CATALOG: TranslationResourceCatalogV2 = undefined;

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

const EMPTY_SIGNED_RESOURCE_GAINS = createSignedResourceGainSelectors([]);

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
		resourcesV2?: Record<string, number>;
		resourceBoundsV2?: Record<string, SessionResourceBoundsV2>;
	},
): TranslationPlayer {
	const translationPlayer: TranslationPlayer = {
		id: player.id,
		name: player.name,
		resources: { ...player.resources },
		stats: { ...(player.stats ?? {}) },
		population: { ...player.population },
	};
	if (player.resourcesV2) {
		translationPlayer.resourcesV2 = { ...player.resourcesV2 };
	}
	if (player.resourceBoundsV2) {
		translationPlayer.resourceBoundsV2 = Object.fromEntries(
			Object.entries(player.resourceBoundsV2).map(([id, entry]) => [
				id,
				{
					lowerBound: entry.lowerBound ?? null,
					upperBound: entry.upperBound ?? null,
				},
			]),
		);
	}
	return translationPlayer;
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
		resourceCatalog?: SessionResourceCatalogV2;
		resourceMetadata?: Record<string, SessionMetadataDescriptor>;
		resourceGroupMetadata?: Record<string, SessionMetadataDescriptor>;
		signedResourceGains?: readonly SessionRecentResourceGain[];
	},
): TranslationContext {
	const rules: SessionRuleSnapshot =
		options.rules ??
		({
			tieredResourceKey: 'happiness',
			tierDefinitions: [],
			winConditions: [],
		} as SessionRuleSnapshot);
	const resourceCatalog = options.resourceCatalog;
	const resourceMetadataSelectors = resourceCatalog
		? createResourceV2MetadataSelectors(
				resourceCatalog,
				options.resourceMetadata,
				options.resourceMetadata,
			)
		: EMPTY_RESOURCE_METADATA;
	const resourceGroupMetadataSelectors = resourceCatalog
		? createResourceV2GroupMetadataSelectors(
				resourceCatalog,
				options.resourceGroupMetadata,
				options.resourceGroupMetadata,
			)
		: EMPTY_RESOURCE_METADATA;
	const signedResourceGains = options.signedResourceGains
		? createSignedResourceGainSelectors(options.signedResourceGains)
		: EMPTY_SIGNED_RESOURCE_GAINS;
	const recentResourceGains = options.signedResourceGains
		? Object.freeze([...options.signedResourceGains])
		: EMPTY_GAIN_ARRAY;
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
		recentResourceGains,
		compensations: { A: {}, B: {} },
		assets: EMPTY_ASSETS,
		resourcesV2: resourceCatalog ?? EMPTY_RESOURCE_CATALOG,
		resourceMetadataV2: resourceMetadataSelectors,
		resourceGroupMetadataV2: resourceGroupMetadataSelectors,
		signedResourceGains,
	};
}
