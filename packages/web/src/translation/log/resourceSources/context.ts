import {
	EVALUATORS,
	type EngineContext,
	type PassiveSummary,
	type PlayerId,
} from '@kingdom-builder/engine';
import { type TranslationContext } from '../../context/types';
import type { PlayerSnapshot } from '../snapshots';
import { type PassiveDescriptor, type PassiveModifierMap } from './types';

interface PassiveLookup {
	evaluationMods?: PassiveModifierMap;
	get?: (id: string, owner: PlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffPassives {
	evaluationMods: PassiveModifierMap;
	get?: (id: string, owner: PlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffActivePlayer {
	readonly id: PlayerId;
	readonly lands: ReadonlyArray<{
		readonly id: string;
		readonly developments: readonly string[];
	}>;
	readonly population: Record<string, number>;
}

export interface TranslationDiffContext {
	readonly activePlayer: TranslationDiffActivePlayer;
	readonly buildings: EngineContext['buildings'];
	readonly developments: EngineContext['developments'];
	readonly passives: TranslationDiffPassives;
	evaluate(evaluator: {
		type: string;
		params?: Record<string, unknown>;
	}): number;
}

function cloneModifierMap(
	source?: ReadonlyMap<string, ReadonlyMap<string, unknown>>,
): PassiveModifierMap {
	const entries: Array<[string, Map<string, unknown>]> = [];
	if (!source) {
		return new Map(entries);
	}
	for (const [target, modifiers] of source.entries()) {
		entries.push([target, new Map(modifiers)]);
	}
	return new Map(entries);
}

function toPassiveDescriptor(summary: PassiveSummary): PassiveDescriptor {
	const descriptor: PassiveDescriptor = {};
	if (summary.icon !== undefined) {
		descriptor.icon = summary.icon;
	}
	const sourceIcon = summary.meta?.source?.icon;
	if (sourceIcon !== undefined) {
		descriptor.meta = { source: { icon: sourceIcon } };
	}
	return descriptor;
}

function createDiffContext(options: {
	activePlayer: TranslationDiffActivePlayer;
	buildings: EngineContext['buildings'];
	developments: EngineContext['developments'];
	evaluationMods?: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
	passiveSummaries?: readonly PassiveSummary[];
	passiveLookup?: (
		id: string,
		owner: PlayerId,
	) => PassiveDescriptor | undefined;
	evaluate: (evaluator: {
		type: string;
		params?: Record<string, unknown>;
	}) => number;
}): TranslationDiffContext {
	const evaluationMods = cloneModifierMap(
		options.evaluationMods ?? new Map<string, ReadonlyMap<string, unknown>>(),
	);
	const passives: TranslationDiffPassives = { evaluationMods };
	if (options.passiveLookup) {
		passives.get = options.passiveLookup;
	} else {
		const summaries = options.passiveSummaries ?? [];
		const descriptors = new Map(
			summaries.map((summary) => [summary.id, toPassiveDescriptor(summary)]),
		);
		passives.get = (id, owner) => {
			if (owner !== options.activePlayer.id) {
				return undefined;
			}
			return descriptors.get(id);
		};
	}
	return {
		activePlayer: options.activePlayer,
		buildings: options.buildings,
		developments: options.developments,
		passives,
		evaluate: options.evaluate,
	};
}

export function createTranslationDiffContext(
	context: EngineContext,
): TranslationDiffContext {
	const rawPassives = context.passives as unknown;
	const passiveLookup = rawPassives as PassiveLookup | undefined;
	const evaluationMods = passiveLookup?.evaluationMods;
	const passiveLookupFn = passiveLookup?.get
		? passiveLookup.get.bind(passiveLookup)
		: undefined;
	return createDiffContext({
		activePlayer: context.activePlayer,
		buildings: context.buildings,
		developments: context.developments,
		...(evaluationMods ? { evaluationMods } : {}),
		...(passiveLookupFn ? { passiveLookup: passiveLookupFn } : {}),
		evaluate(evaluator) {
			const handler = EVALUATORS.get(evaluator.type);
			if (!handler) {
				throw new Error(`Unknown evaluator handler for ${evaluator.type}`);
			}
			return Number(handler(evaluator, context));
		},
	});
}

export interface SnapshotDiffPlayer
	extends Pick<TranslationDiffActivePlayer, 'id' | 'lands' | 'population'> {
	readonly passives?: readonly PassiveSummary[];
}

export interface SnapshotDiffContextOptions {
	readonly player: SnapshotDiffPlayer;
	readonly translation: Pick<
		TranslationContext,
		'buildings' | 'developments'
	> & {
		readonly passives: Pick<TranslationContext['passives'], 'evaluationMods'>;
	};
	readonly evaluationMods?: ReadonlyMap<string, ReadonlyMap<string, unknown>>;
}

export function createSnapshotTranslationDiffContext({
	player,
	translation,
	evaluationMods,
}: SnapshotDiffContextOptions): TranslationDiffContext {
	return createDiffContext({
		activePlayer: player,
		buildings: translation.buildings as EngineContext['buildings'],
		developments: translation.developments as EngineContext['developments'],
		evaluationMods: evaluationMods ?? translation.passives.evaluationMods,
		passiveSummaries: player.passives ?? [],
		evaluate(evaluator) {
			if (evaluator.type === 'development') {
				const id = evaluator.params?.['id'];
				if (typeof id !== 'string') {
					return 0;
				}
				let total = 0;
				for (const land of player.lands) {
					total += land.developments.filter((item) => item === id).length;
				}
				return total;
			}
			if (evaluator.type === 'population') {
				const role = evaluator.params?.['role'];
				if (typeof role === 'string') {
					return Number(player.population[role] ?? 0);
				}
				return Object.values(player.population).reduce<number>(
					(total, amount) => {
						return total + Number(amount ?? 0);
					},
					0,
				);
			}
			throw new Error(`Unsupported evaluator handler for ${evaluator.type}`);
		},
	});
}

interface SnapshotDiffPlayerInput {
	id: PlayerId;
	lands: PlayerSnapshot['lands'];
	population: PlayerSnapshot['population'];
	passives?: readonly PassiveSummary[];
}

export function createSnapshotDiffPlayer({
	id,
	lands,
	population,
	passives,
}: SnapshotDiffPlayerInput): SnapshotDiffPlayer {
	return {
		id,
		lands: lands.map((land) => ({
			id: land.id,
			developments: [...land.developments],
		})),
		population: { ...population },
		passives: passives ?? [],
	};
}
