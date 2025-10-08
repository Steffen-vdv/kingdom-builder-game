import { type PlayerId } from '@kingdom-builder/engine';
import { type EvaluatorDef } from '@kingdom-builder/protocol';
import type {
	TranslationContext,
	TranslationPassiveModifierMap,
} from '../../context';
import { type PlayerSnapshot } from '../snapshots';
import { type PassiveDescriptor, type PassiveModifierMap } from './types';

export interface TranslationDiffPassives {
	evaluationMods: PassiveModifierMap;
	get?: (id: string, owner: PlayerId) => PassiveDescriptor | undefined;
}

export interface TranslationDiffContext {
	readonly activePlayer: { id: PlayerId };
	readonly buildings: TranslationContext['buildings'];
	readonly developments: TranslationContext['developments'];
	readonly passives: TranslationDiffPassives;
	evaluate(evaluator: {
		type: string;
		params?: Record<string, unknown>;
	}): number;
}

interface CompareEvaluatorParams {
	left?: EvaluatorDef | number;
	right?: EvaluatorDef | number;
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
}

function countDevelopments(player: PlayerSnapshot, id: string): number {
	return player.lands.reduce((total, land) => {
		return (
			total +
			land.developments.filter((development) => development === id).length
		);
	}, 0);
}

function evaluatePopulation(
	player: PlayerSnapshot,
	params: Record<string, unknown> | undefined,
): number {
	const role = params?.['role'];
	if (typeof role === 'string') {
		return Number(player.population[role] ?? 0);
	}
	return Object.values(player.population).reduce((total, count) => {
		const value = Number(count ?? 0);
		return Number.isFinite(value) ? total + value : total;
	}, 0);
}

function evaluateStat(
	player: PlayerSnapshot,
	params: Record<string, unknown> | undefined,
): number {
	const key = params?.['key'];
	if (typeof key !== 'string') {
		return 0;
	}
	return Number(player.stats[key] ?? 0);
}

function evaluateDefinition(
	definition: EvaluatorDef,
	player: PlayerSnapshot,
): number {
	switch (definition.type) {
		case 'development': {
			const id = definition.params?.['id'];
			if (typeof id !== 'string') {
				return 0;
			}
			return countDevelopments(player, id);
		}
		case 'population':
			return evaluatePopulation(player, definition.params);
		case 'stat':
			return evaluateStat(player, definition.params);
		case 'compare':
			return evaluateCompare(definition, player);
		default:
			return 0;
	}
}

function toEvaluatorDefinition(value: unknown): EvaluatorDef | undefined {
	if (!value || typeof value !== 'object') {
		return undefined;
	}
	if (!('type' in value)) {
		return undefined;
	}
	const type = (value as { type?: unknown }).type;
	if (typeof type !== 'string') {
		return undefined;
	}
	return value as EvaluatorDef;
}

function resolveComparableValue(
	value: EvaluatorDef | number | undefined,
	player: PlayerSnapshot,
): number {
	if (typeof value === 'number') {
		return value;
	}
	const definition = toEvaluatorDefinition(value);
	if (!definition) {
		return 0;
	}
	return evaluateDefinition(definition, player);
}

function evaluateCompare(
	definition: EvaluatorDef,
	player: PlayerSnapshot,
): number {
	const params = definition.params as CompareEvaluatorParams | undefined;
	if (!params) {
		return 0;
	}
	const left = resolveComparableValue(params.left, player);
	const right = resolveComparableValue(params.right, player);
	switch (params.operator) {
		case 'lt':
			return left < right ? 1 : 0;
		case 'lte':
			return left <= right ? 1 : 0;
		case 'gt':
			return left > right ? 1 : 0;
		case 'gte':
			return left >= right ? 1 : 0;
		case 'eq':
			return left === right ? 1 : 0;
		case 'ne':
			return left !== right ? 1 : 0;
		default:
			return 0;
	}
}

function mapPassiveDescriptors(
	players: ReadonlyArray<{
		id: PlayerId;
		passives: PlayerSnapshot['passives'];
	}>,
): ReadonlyMap<PlayerId, Map<string, PassiveDescriptor>> {
	return new Map(
		players.map(({ id, passives }) => [
			id,
			new Map(
				passives.map((passive) => {
					const descriptor: PassiveDescriptor = {};
					if (passive.icon !== undefined) {
						descriptor.icon = passive.icon;
					}
					const sourceIcon = passive.meta?.source?.icon;
					if (sourceIcon !== undefined) {
						descriptor.meta = Object.freeze({
							source: Object.freeze({ icon: sourceIcon }),
						});
					}
					return [passive.id, Object.freeze(descriptor)] as const;
				}),
			),
		]),
	);
}

function cloneEvaluationModifiers(
	mods: TranslationPassiveModifierMap | PassiveModifierMap | undefined,
): PassiveModifierMap {
	if (!mods) {
		return new Map();
	}
	return new Map(
		Array.from(mods.entries()).map(([modifierId, entries]) => [
			modifierId,
			new Map(entries),
		]),
	);
}

export function createTranslationDiffContext(
	translation: Pick<
		TranslationContext,
		'buildings' | 'developments' | 'passives'
	>,
	activePlayerId: PlayerId,
	activePlayer: PlayerSnapshot,
	players: ReadonlyArray<{
		id: PlayerId;
		passives: PlayerSnapshot['passives'];
	}> = [{ id: activePlayerId, passives: activePlayer.passives }],
): TranslationDiffContext {
	const descriptors = mapPassiveDescriptors(players);
	const evaluationMods = cloneEvaluationModifiers(
		translation.passives.evaluationMods,
	);
	const passives: TranslationDiffPassives = { evaluationMods };
	passives.get = (id, owner) => {
		const ownerDescriptors = descriptors.get(owner);
		return ownerDescriptors?.get(id);
	};
	return {
		activePlayer: { id: activePlayerId },
		buildings: translation.buildings,
		developments: translation.developments,
		passives,
		evaluate(evaluator) {
			return evaluateDefinition(evaluator as EvaluatorDef, activePlayer);
		},
	};
}
