import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	PHASES,
	POPULATIONS,
	RESOURCES,
	RULES,
	STATS,
} from '@kingdom-builder/contents';
import { PassiveManager } from '@kingdom-builder/engine';
import type {
	EngineSessionSnapshot,
	PlayerId,
	ResourceKey,
} from '@kingdom-builder/engine';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import { describe, expect, it } from 'vitest';

import { createTranslationContext } from '../../src/translation/context/createTranslationContext';

describe('createTranslationContext', () => {
	it('derives a translation context snapshot', () => {
		const [resourceKey] = Object.keys(RESOURCES) as ResourceKey[];
		const [statKey] = Object.keys(STATS) as string[];
		const [populationId] = POPULATIONS.keys();
		const [actionId] = ACTIONS.keys();
		const [buildingId] = BUILDINGS.keys();
		const [developmentId] = DEVELOPMENTS.keys();
		const [firstPhase] = PHASES;
		const firstStep = firstPhase?.steps[0]?.id ?? firstPhase?.id ?? 'phase';
		const passiveId = 'passive-a';
		const passiveManager = new PassiveManager();
		passiveManager.registerEvaluationModifier(
			'modifier',
			resourceKey,
			() => ({}),
		);
		const logEntries = new Map<string, unknown[]>([
			['legacy', [{ note: 'legacy entry' }]],
		]);
		const pullEffectLog = <T>(key: string): T | undefined => {
			const existing = logEntries.get(key);
			if (!existing || existing.length === 0) {
				return undefined;
			}
			const [next, ...remaining] = existing;
			if (remaining.length) {
				logEntries.set(key, remaining);
			} else {
				logEntries.delete(key);
			}
			return next as T;
		};
		const compensation = (amount: number): PlayerStartConfig => ({
			resources: { [resourceKey]: amount },
		});
		const makePlayer = (config: {
			id: PlayerId;
			name: string;
			resource: number;
			stat: number;
			population: number;
			buildings?: string[];
			passives?: EngineSessionSnapshot['game']['players'][number]['passives'];
			passiveRecords?: EngineSessionSnapshot['game']['players'][number]['passiveRecords'];
		}): EngineSessionSnapshot['game']['players'][number] => ({
			id: config.id,
			name: config.name,
			resources: { [resourceKey]: config.resource },
			stats: { [statKey]: config.stat },
			statsHistory: {},
			population: { [populationId]: config.population },
			lands: [],
			buildings: config.buildings ?? [],
			actions: [actionId],
			statSources: {},
			skipPhases: {},
			skipSteps: {},
			passives: config.passives ?? [],
			passiveRecords: config.passiveRecords ?? [],
		});
		const players: EngineSessionSnapshot['game']['players'] = [
			makePlayer({
				id: 'A' as PlayerId,
				name: 'Player A',
				resource: 7,
				stat: 3,
				population: 2,
				buildings: [buildingId],
				passives: [
					{
						id: passiveId,
						icon: ACTIONS.get(actionId).icon,
						meta: {
							source: { icon: BUILDINGS.get(buildingId).icon },
						},
					},
				],
				passiveRecords: [
					{
						id: passiveId,
						owner: 'A' as PlayerId,
						effects: [],
					},
				],
			}),
			makePlayer({
				id: 'B' as PlayerId,
				name: 'Player B',
				resource: 5,
				stat: 1,
				population: 1,
			}),
		];
		const session: EngineSessionSnapshot = {
			game: {
				turn: 4,
				currentPlayerIndex: 0,
				currentPhase: firstPhase?.id ?? 'phase',
				currentStep: firstStep,
				phaseIndex: 0,
				stepIndex: 0,
				devMode: false,
				players,
				activePlayerId: 'A',
				opponentId: 'B',
			},
			phases: PHASES,
			actionCostResource: resourceKey,
			recentResourceGains: [{ key: resourceKey, amount: 3 }],
			compensations: {
				A: compensation(2),
				B: compensation(1),
			},
			rules: RULES,
		};
		const passiveRecords = new Map(
			players.map((player) => [player.id, player.passiveRecords]),
		);
		const context = createTranslationContext(
			session,
			{
				actions: ACTIONS,
				buildings: BUILDINGS,
				developments: DEVELOPMENTS,
			},
			{
				pullEffectLog,
				evaluationMods: passiveManager.evaluationMods,
			},
			{
				rules: RULES,
				passiveRecords,
			},
		);
		expect(context.pullEffectLog<{ note: string }>('legacy')).toEqual({
			note: 'legacy entry',
		});
		const evaluationSnapshot = Array.from(
			context.passives.evaluationMods.entries(),
		).map(([modifierId, modifiers]) => [
			modifierId,
			Array.from(modifiers.keys()),
		]);
		const activeId = players[0]?.id ?? 'A';
		const contextSnapshot = {
			actionCostResource: context.actionCostResource,
			phases: context.phases.map((phase) => phase.id),
			players: {
				active: context.activePlayer.id,
				opponent: context.opponent.id,
			},
			recentResourceGains: context.recentResourceGains,
			compensations: context.compensations,
			registries: {
				action: { id: actionId, has: context.actions.has(actionId) },
				building: { id: buildingId, has: context.buildings.has(buildingId) },
				development: {
					id: developmentId,
					has: context.developments.has(developmentId),
				},
			},
			passives: {
				list: context.passives.list().map(({ id }) => id),
				owned: context.passives.list(activeId).map(({ id }) => id),
				descriptor: context.passives.get(passiveId, activeId),
				evaluationMods: evaluationSnapshot,
				records: context.passives
					.records(activeId)
					.map(({ id, owner }) => ({ id, owner })),
				definitionOwner: context.passives.getRecord(passiveId, activeId)?.owner,
			},
			rules: {
				tieredResourceKey: context.rules.tieredResourceKey,
				tierCount: context.rules.tierDefinitions.length,
			},
		};
		expect(contextSnapshot).toMatchInlineSnapshot(`
			{
			  "actionCostResource": "gold",
			  "compensations": {
			    "A": {
			      "resources": {
			        "gold": 2,
			      },
			    },
			    "B": {
			      "resources": {
			        "gold": 1,
			      },
			    },
			  },
			  "passives": {
			    "definitionOwner": "A",
			    "descriptor": {
			      "icon": "🌱",
			      "meta": {
			        "source": {
			          "icon": "🏘️",
			        },
			      },
			    },
			    "evaluationMods": [
			      [
			        "gold",
			        [
			          "modifier",
			        ],
			      ],
			    ],
			    "list": [
			      "passive-a",
			    ],
			    "owned": [
			      "passive-a",
			    ],
			    "records": [
			      {
			        "id": "passive-a",
			        "owner": "A",
			      },
			    ],
			  },
			  "phases": [
			    "growth",
			    "upkeep",
			    "main",
			  ],
			  "players": {
			    "active": "A",
			    "opponent": "B",
			  },
			  "recentResourceGains": [
			    {
			      "amount": 3,
			      "key": "gold",
			    },
			  ],
			  "registries": {
			    "action": {
			      "has": true,
			      "id": "expand",
			    },
			    "building": {
			      "has": true,
			      "id": "town_charter",
			    },
			    "development": {
			      "has": true,
			      "id": "farm",
			    },
			  },
			  "rules": {
			    "tierCount": 9,
			    "tieredResourceKey": "happiness",
			  },
			}
		`);
	});
});
