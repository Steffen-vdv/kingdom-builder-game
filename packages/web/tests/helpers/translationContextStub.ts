import type {
	TranslationAssets,
	TranslationContext,
	TranslationPassives,
	TranslationPlayer,
	TranslationRegistry,
} from '../../src/translation/context';
import type { RuleSnapshot } from '@kingdom-builder/engine';

const EMPTY_MODIFIERS = new Map<string, ReadonlyMap<string, unknown>>();

const EMPTY_ASSETS: TranslationAssets = {
	resources: {},
	stats: {},
	populations: {},
	population: {},
	land: {},
	slot: {},
	passive: {},
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
	};
}

function mergeAssets(
	overrides?: Partial<TranslationAssets>,
): TranslationAssets {
	if (!overrides) {
		return EMPTY_ASSETS;
	}
	const formatFallback = (description: string) =>
		EMPTY_ASSETS.formatPassiveRemoval(description);
	return {
		resources: {
			...EMPTY_ASSETS.resources,
			...(overrides.resources ?? {}),
		},
		stats: {
			...EMPTY_ASSETS.stats,
			...(overrides.stats ?? {}),
		},
		populations: {
			...EMPTY_ASSETS.populations,
			...(overrides.populations ?? {}),
		},
		population: {
			...EMPTY_ASSETS.population,
			...(overrides.population ?? {}),
		},
		land: {
			...EMPTY_ASSETS.land,
			...(overrides.land ?? {}),
		},
		slot: {
			...EMPTY_ASSETS.slot,
			...(overrides.slot ?? {}),
		},
		passive: {
			...EMPTY_ASSETS.passive,
			...(overrides.passive ?? {}),
		},
		upkeep: {
			...EMPTY_ASSETS.upkeep,
			...(overrides.upkeep ?? {}),
		},
		modifiers: {
			...EMPTY_ASSETS.modifiers,
			...(overrides.modifiers ?? {}),
		},
		triggers: {
			...EMPTY_ASSETS.triggers,
			...(overrides.triggers ?? {}),
		},
		tierSummaries: {
			...EMPTY_ASSETS.tierSummaries,
			...(overrides.tierSummaries ?? {}),
		},
		formatPassiveRemoval: overrides.formatPassiveRemoval ?? formatFallback,
	} satisfies TranslationAssets;
}

export function createTranslationContextStub(
	options: Pick<TranslationContext, 'phases' | 'actionCostResource'> & {
		actions: TranslationRegistry<unknown>;
		buildings: TranslationRegistry<unknown>;
		developments: TranslationRegistry<unknown>;
		populations?: TranslationRegistry<unknown>;
		activePlayer: TranslationPlayer;
		opponent: TranslationPlayer;
		rules?: RuleSnapshot;
		assets?: Partial<TranslationAssets>;
	},
): TranslationContext {
	const rules: RuleSnapshot =
		options.rules ??
		({
			tieredResourceKey: 'happiness',
			tierDefinitions: [],
			winConditions: [],
		} as RuleSnapshot);
	return {
		actions: options.actions,
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
		assets: mergeAssets(options.assets),
	};
}
