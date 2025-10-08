import { ACTIONS, BUILDINGS, DEVELOPMENTS } from '@kingdom-builder/contents';
import type {
	EngineContext,
	EngineSession,
	EngineSessionSnapshot,
} from '@kingdom-builder/engine';
import {
	createTranslationContext,
	type TranslationContext,
} from '../translation/context';
import { type TranslationDiffContext } from '../translation';

type PlayerSnapshot = EngineSessionSnapshot['game']['players'][number];

interface DiffPlayer {
	id: PlayerSnapshot['id'];
	name: PlayerSnapshot['name'];
	lands: PlayerSnapshot['lands'];
	buildings: Set<string>;
	resources: PlayerSnapshot['resources'];
	stats: PlayerSnapshot['stats'];
	population: PlayerSnapshot['population'];
}

interface CompareEvaluatorParams {
	left?: number | { type: string; params?: Record<string, unknown> };
	right?: number | { type: string; params?: Record<string, unknown> };
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
}

function cloneLands(lands: PlayerSnapshot['lands']): PlayerSnapshot['lands'] {
	return lands.map((land) => ({
		...land,
		developments: [...land.developments],
	}));
}

function clonePlayer(player: PlayerSnapshot): DiffPlayer {
	return {
		id: player.id,
		name: player.name,
		lands: cloneLands(player.lands),
		buildings: new Set(player.buildings),
		resources: { ...player.resources },
		stats: { ...player.stats },
		population: { ...player.population },
	};
}

function countDevelopments(player: DiffPlayer, id: unknown): number {
	if (!player || typeof id !== 'string') {
		return 0;
	}
	return player.lands.reduce((total, land) => {
		return (
			total +
			land.developments.filter((development) => development === id).length
		);
	}, 0);
}

function countPopulation(player: DiffPlayer, role: unknown): number {
	if (!player) {
		return 0;
	}
	if (typeof role === 'string' && role.length > 0) {
		return Number(player.population[role] ?? 0);
	}
	return Object.values(player.population).reduce((total, value) => {
		return total + Number(value ?? 0);
	}, 0);
}

function readStat(player: DiffPlayer, key: unknown): number {
	if (!player || typeof key !== 'string' || key.length === 0) {
		return 0;
	}
	return Number(player.stats[key] ?? 0);
}

function compareValues(
	left: number,
	right: number,
	operator: string | undefined,
) {
	switch (operator) {
		case 'lt':
			return left < right;
		case 'lte':
			return left <= right;
		case 'gt':
			return left > right;
		case 'gte':
			return left >= right;
		case 'ne':
			return left !== right;
		case 'eq':
		default:
			return left === right;
	}
}

function cloneEvaluationMods(
	source: TranslationContext['passives']['evaluationMods'],
): TranslationDiffContext['passives']['evaluationMods'] {
	const cloned: TranslationDiffContext['passives']['evaluationMods'] =
		new Map();
	for (const [modifierId, entries] of source) {
		cloned.set(modifierId, new Map(entries));
	}
	return cloned;
}

function evaluateDefinition(
	definition: { type: string; params?: Record<string, unknown> },
	player: DiffPlayer | undefined,
	evaluate: (definition: {
		type: string;
		params?: Record<string, unknown>;
	}) => number,
): number {
	if (!player) {
		return 0;
	}
	switch (definition.type) {
		case 'development': {
			const id = definition.params?.['id'];
			return countDevelopments(player, id);
		}
		case 'population': {
			const role = definition.params?.['role'];
			return countPopulation(player, role);
		}
		case 'stat': {
			const key = definition.params?.['key'];
			return readStat(player, key);
		}
		case 'compare': {
			const params = definition.params as CompareEvaluatorParams | undefined;
			if (!params) {
				return 0;
			}
			const left =
				typeof params.left === 'number'
					? params.left
					: params.left
						? Number(evaluate(params.left))
						: 0;
			const right =
				typeof params.right === 'number'
					? params.right
					: params.right
						? Number(evaluate(params.right))
						: 0;
			return compareValues(left, right, params.operator) ? 1 : 0;
		}
		default:
			return 0;
	}
}

function createDiffContext(
	snapshot: EngineSessionSnapshot,
	translationContext: TranslationContext,
): TranslationDiffContext {
	const players = new Map<PlayerSnapshot['id'], DiffPlayer>();
	for (const player of snapshot.game.players) {
		players.set(player.id, clonePlayer(player));
	}
	const activePlayer = players.get(snapshot.game.activePlayerId);
	const evaluate = (definition: {
		type: string;
		params?: Record<string, unknown>;
	}) => evaluateDefinition(definition, activePlayer, evaluate);
	const passives: TranslationDiffContext['passives'] = {
		evaluationMods: cloneEvaluationMods(
			translationContext.passives.evaluationMods,
		),
	};
	if (translationContext.passives.get) {
		passives.get = translationContext.passives.get.bind(
			translationContext.passives,
		);
	}
	return {
		activePlayer:
			activePlayer as unknown as TranslationDiffContext['activePlayer'],
		buildings:
			translationContext.buildings as unknown as EngineContext['buildings'],
		developments:
			translationContext.developments as unknown as EngineContext['developments'],
		passives,
		evaluate,
	};
}

export interface LegacySessionContextData {
	translationContext: TranslationContext;
	diffContext: TranslationDiffContext;
}

export function getLegacySessionContext(
	session: EngineSession,
	snapshot: EngineSessionSnapshot,
): LegacySessionContextData {
	const passiveRecords = new Map(
		snapshot.game.players.map((player) => [player.id, player.passiveRecords]),
	);
	const ruleSnapshot = session.getRuleSnapshot();
	const translationContext = createTranslationContext(
		snapshot,
		{
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
		},
		{
			pullEffectLog: <T>(key: string) => session.pullEffectLog<T>(key),
			evaluationMods: session.getPassiveEvaluationMods(),
		},
		{
			rules: ruleSnapshot,
			passiveRecords,
		},
	);
	const diffContext = createDiffContext(snapshot, translationContext);
	return { translationContext, diffContext };
}
