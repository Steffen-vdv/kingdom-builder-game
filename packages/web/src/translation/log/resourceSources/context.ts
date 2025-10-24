import type {
	BuildingConfig,
	DevelopmentConfig,
	SessionPlayerId,
	SessionRecentResourceGain,
} from '@kingdom-builder/protocol';
import type {
	TranslationActionCategoryRegistry,
	TranslationAssets,
	TranslationResourceCatalogV2,
	TranslationResourceV2Metadata,
	TranslationResourceV2MetadataSelectors,
	TranslationSignedResourceGainSelectors,
} from '../../context';
import { type PassiveDescriptor, type PassiveModifierMap } from './types';

interface PassiveLookup {
	evaluationMods?: PassiveModifierMap;
	get?: (id: string, owner: SessionPlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffPassives {
	evaluationMods: PassiveModifierMap;
	get?: (id: string, owner: SessionPlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffContext {
	readonly activePlayer: {
		id: SessionPlayerId;
		population: Record<string, number>;
		lands: ReadonlyArray<{
			developments: ReadonlyArray<string>;
		}>;
	};
	readonly buildings: {
		get(id: string): BuildingConfig;
		has(id: string): boolean;
	};
	readonly developments: {
		get(id: string): DevelopmentConfig;
		has(id: string): boolean;
	};
	readonly actionCategories: TranslationActionCategoryRegistry;
	readonly passives: TranslationDiffPassives;
	readonly assets: TranslationAssets;
	readonly resourcesV2: TranslationResourceCatalogV2;
	readonly resourceMetadataV2: TranslationResourceV2MetadataSelectors;
	readonly resourceGroupMetadataV2: TranslationResourceV2MetadataSelectors;
	readonly signedResourceGains: TranslationSignedResourceGainSelectors;
	evaluate(evaluator: {
		type: string;
		params?: Record<string, unknown>;
	}): number;
}

const EMPTY_METADATA_SELECTORS: TranslationResourceV2MetadataSelectors = {
	list(): TranslationResourceV2Metadata[] {
		return [];
	},
	get(id: string): TranslationResourceV2Metadata {
		return { id, label: id };
	},
	has(): boolean {
		return false;
	},
};

const EMPTY_SIGNED_GAINS: TranslationSignedResourceGainSelectors = {
	list(): SessionRecentResourceGain[] {
		return [];
	},
	positives(): SessionRecentResourceGain[] {
		return [];
	},
	negatives(): SessionRecentResourceGain[] {
		return [];
	},
	forResource(): SessionRecentResourceGain[] {
		return [];
	},
	sumForResource(): number {
		return 0;
	},
};

function evaluateDevelopment(
	definition: { params?: Record<string, unknown> },
	context: TranslationDiffContext,
): number {
	const id = definition.params?.['id'];
	if (typeof id !== 'string') {
		return 0;
	}
	return context.activePlayer.lands.reduce((total, land) => {
		return (
			total +
			land.developments.filter((development) => development === id).length
		);
	}, 0);
}

function evaluatePopulation(
	definition: { params?: Record<string, unknown> },
	context: TranslationDiffContext,
): number {
	const role = definition.params?.['role'];
	if (typeof role === 'string') {
		return Number(context.activePlayer.population[role] ?? 0);
	}
	return Object.values(context.activePlayer.population).reduce(
		(total, count) => {
			return total + Number(count ?? 0);
		},
		0,
	);
}

function evaluateDefinition(
	definition: { type: string; params?: Record<string, unknown> },
	context: TranslationDiffContext,
): number {
	switch (definition.type) {
		case 'development':
			return evaluateDevelopment(definition, context);
		case 'population':
			return evaluatePopulation(definition, context);
		default:
			throw new Error(`Unknown evaluator handler for ${definition.type}`);
	}
}

export function createTranslationDiffContext(context: {
	activePlayer: TranslationDiffContext['activePlayer'];
	buildings: {
		get(id: string): BuildingConfig;
		has?(id: string): boolean;
	};
	developments: {
		get(id: string): DevelopmentConfig;
		has?(id: string): boolean;
	};
	actionCategories: TranslationDiffContext['actionCategories'];
	passives: unknown;
	assets: TranslationAssets;
	resourcesV2?: TranslationResourceCatalogV2;
	resourceMetadataV2?: TranslationResourceV2MetadataSelectors;
	resourceGroupMetadataV2?: TranslationResourceV2MetadataSelectors;
	signedResourceGains?: TranslationSignedResourceGainSelectors;
}): TranslationDiffContext {
	const rawPassives = context.passives as PassiveLookup | undefined;
	const evaluationMods = (rawPassives?.evaluationMods ??
		new Map()) as PassiveModifierMap;
	const getPassive = rawPassives?.get
		? rawPassives.get.bind(rawPassives)
		: undefined;
	const passives: TranslationDiffPassives = { evaluationMods };
	if (getPassive) {
		passives.get = getPassive;
	}
	return {
		activePlayer: context.activePlayer,
		buildings: {
			get: context.buildings.get.bind(context.buildings),
			has: context.buildings.has
				? context.buildings.has.bind(context.buildings)
				: (id: string) => context.buildings.get(id) !== undefined,
		},
		developments: {
			get: context.developments.get.bind(context.developments),
			has: context.developments.has
				? context.developments.has.bind(context.developments)
				: (id: string) => context.developments.get(id) !== undefined,
		},
		actionCategories: context.actionCategories,
		passives,
		assets: context.assets,
		resourcesV2: context.resourcesV2,
		resourceMetadataV2: context.resourceMetadataV2 ?? EMPTY_METADATA_SELECTORS,
		resourceGroupMetadataV2:
			context.resourceGroupMetadataV2 ?? EMPTY_METADATA_SELECTORS,
		signedResourceGains: context.signedResourceGains ?? EMPTY_SIGNED_GAINS,
		evaluate(evaluator) {
			return Number(evaluateDefinition(evaluator, this));
		},
	};
}
