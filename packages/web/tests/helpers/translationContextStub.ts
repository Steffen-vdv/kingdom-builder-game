import type {
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
	modifiers: { cost: {}, result: {} },
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

export function createTranslationContextStub(
	options: Pick<TranslationContext, 'phases' | 'actionCostResource'> & {
		actions: TranslationRegistry<unknown>;
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
	};
}
