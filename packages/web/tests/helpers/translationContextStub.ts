import type {
	TranslationContext,
	TranslationPassives,
	TranslationPlayer,
	TranslationRegistry,
} from '../../src/translation/context';
import type { RuleSnapshot } from '@kingdom-builder/engine';

const EMPTY_MODIFIERS = new Map<string, ReadonlyMap<string, unknown>>();

const EMPTY_PASSIVES: TranslationPassives = {
	list() {
		return [];
	},
	get() {
		return undefined;
	},
	values() {
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
		activePlayer: TranslationPlayer;
		opponent: TranslationPlayer;
		ruleSnapshot?: RuleSnapshot;
	},
): TranslationContext {
	const ruleSnapshot: RuleSnapshot =
		options.ruleSnapshot ??
		({
			tieredResourceKey: '' as RuleSnapshot['tieredResourceKey'],
			tierDefinitions: [],
		} as RuleSnapshot);
	return {
		actions: options.actions,
		buildings: options.buildings,
		developments: options.developments,
		passives: EMPTY_PASSIVES,
		phases: options.phases,
		activePlayer: options.activePlayer,
		opponent: options.opponent,
		pullEffectLog() {
			return undefined;
		},
		actionCostResource: options.actionCostResource,
		recentResourceGains: [],
		compensations: { A: {}, B: {} },
		ruleSnapshot,
	};
}
