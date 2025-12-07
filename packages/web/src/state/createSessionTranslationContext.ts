import type {
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import {
	createTranslationContext,
	type TranslationContext,
} from '../translation/context';
import { type TranslationDiffContext } from '../translation';
import type { SessionRegistries } from './sessionTypes';

type PlayerSnapshot = SessionSnapshot['game']['players'][number];

interface DiffPlayer {
	id: PlayerSnapshot['id'];
	name: PlayerSnapshot['name'];
	lands: PlayerSnapshot['lands'];
	buildings: Set<string>;
	valuesV2: PlayerSnapshot['valuesV2'];
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
		valuesV2: { ...player.valuesV2 },
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

/**
 * Reads a resource value by V2 ID. Works for all resources including
 * currencies, stats, and population counts.
 */
function readResourceV2(player: DiffPlayer, resourceId: unknown): number {
	if (!player || typeof resourceId !== 'string' || resourceId.length === 0) {
		return 0;
	}
	return Number(player.valuesV2[resourceId] ?? 0);
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
		case 'resource': {
			const resourceId = definition.params?.['resourceId'];
			return readResourceV2(player, resourceId);
		}
		case 'population': {
			// Legacy evaluator - uses role param as V2 resource ID
			const resourceId = definition.params?.['resourceId'];
			return readResourceV2(player, resourceId);
		}
		case 'stat': {
			// Legacy evaluator - uses resourceId param
			const resourceId = definition.params?.['resourceId'];
			return readResourceV2(player, resourceId);
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

interface SessionTranslationContextInput {
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	passiveRecords: SessionSnapshot['passiveRecords'];
	registries: Pick<
		SessionRegistries,
		| 'actions'
		| 'actionCategories'
		| 'buildings'
		| 'developments'
		| 'populations'
		| 'resources'
	>;
}

export function createSessionTranslationDiffContext(
	snapshot: SessionSnapshot,
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
			translationContext.buildings as unknown as TranslationDiffContext['buildings'],
		developments:
			translationContext.developments as unknown as TranslationDiffContext['developments'],
		actionCategories:
			translationContext.actionCategories as unknown as TranslationDiffContext['actionCategories'],
		passives,
		assets: translationContext.assets,
		resourceMetadataV2:
			translationContext.resourceMetadataV2 as unknown as TranslationDiffContext['resourceMetadataV2'],
		evaluate,
	};
}

export interface SessionTranslationContextData {
	translationContext: TranslationContext;
	diffContext: TranslationDiffContext;
}

export function createSessionTranslationContext({
	snapshot,
	ruleSnapshot,
	passiveRecords,
	registries,
}: SessionTranslationContextInput): SessionTranslationContextData {
	const translationContext = createTranslationContext(
		snapshot,
		registries,
		snapshot.metadata ?? { passiveEvaluationModifiers: {} },
		{
			ruleSnapshot,
			passiveRecords,
		},
	);
	const diffContext = createSessionTranslationDiffContext(
		snapshot,
		translationContext,
	);
	return { translationContext, diffContext };
}
