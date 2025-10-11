import type {
	TranslationAssets,
	TranslationContext,
	TranslationPassives,
	TranslationPlayer,
	TranslationRegistry,
} from '../../src/translation/context';
import type { SessionRuleSnapshot } from '@kingdom-builder/protocol';

const EMPTY_MODIFIERS = new Map<string, ReadonlyMap<string, unknown>>();

const EMPTY_ASSETS: TranslationAssets = Object.freeze({
	resources: Object.freeze({}),
	stats: Object.freeze({}),
	populations: Object.freeze({}),
	population: Object.freeze({}),
	land: Object.freeze({}),
	slot: Object.freeze({}),
	passive: Object.freeze({}),
	modifiers: Object.freeze({}),
	triggers: Object.freeze({}),
	misc: Object.freeze({}),
	tierSummaries: Object.freeze(new Map()),
	formatPassiveRemoval: (description: string) =>
		`Active as long as ${description}`,
}) as TranslationAssets;

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
		actions?: TranslationRegistry<unknown>;
		buildings?: TranslationRegistry<unknown>;
		developments?: TranslationRegistry<unknown>;
		populations?: TranslationRegistry<unknown>;
		activePlayer: TranslationPlayer;
		opponent: TranslationPlayer;
		rules?: SessionRuleSnapshot;
		assets?: TranslationAssets;
	},
): TranslationContext {
	const emptyRegistry: TranslationRegistry<unknown> = {
		get(id: string) {
			throw new Error(`Missing translation registry entry for ${id}`);
		},
		has() {
			return false;
		},
	};
	const rules: SessionRuleSnapshot =
		options.rules ??
		({
			tieredResourceKey: 'happiness',
			tierDefinitions: [],
			winConditions: [],
		} as SessionRuleSnapshot);
	return {
		actions: options.actions ?? emptyRegistry,
		buildings: options.buildings ?? emptyRegistry,
		developments: options.developments ?? emptyRegistry,
		populations: options.populations ?? options.actions ?? emptyRegistry,
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
		compensations: {} as TranslationContext['compensations'],
		assets: options.assets ?? EMPTY_ASSETS,
	};
}
