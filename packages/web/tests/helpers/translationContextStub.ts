import type {
	TranslationActionCategoryRegistry,
	TranslationAssets,
	TranslationContext,
	TranslationPassives,
	TranslationPlayer,
	TranslationRegistry,
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
		valuesV2?: Readonly<Record<string, number>>;
		resourceBoundsV2?: TranslationPlayer['resourceBoundsV2'];
	},
): TranslationPlayer {
	return {
		id: player.id,
		name: player.name,
		resources: { ...player.resources },
		stats: { ...(player.stats ?? {}) },
		population: { ...player.population },
		...(player.valuesV2 ? { valuesV2: { ...player.valuesV2 } } : {}),
		...(player.resourceBoundsV2
			? {
					resourceBoundsV2: Object.fromEntries(
						Object.entries(player.resourceBoundsV2).map(([id, entry]) => [
							id,
							{ ...entry },
						]),
					),
				}
			: {}),
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
		resourceV2: {
			catalog: null,
			metadata: {
				get() {
					return undefined;
				},
				list() {
					return Object.freeze([]);
				},
			},
			signedGains: {
				fromSnapshot() {
					return [];
				},
			},
		},
	};
}
