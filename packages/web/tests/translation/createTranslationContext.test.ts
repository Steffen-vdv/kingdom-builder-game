import type {
	SessionPlayerId,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol';
import type { PlayerStartConfig } from '@kingdom-builder/protocol/config/schema';
import { describe, expect, it } from 'vitest';

import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { deserializeSessionRegistries } from '../../src/state/sessionRegistries';
import { TRANSLATION_REGISTRIES_PAYLOAD } from '../fixtures/translationRegistriesPayload';

describe('createTranslationContext', () => {
	it('derives a translation context snapshot', () => {
		const registries = deserializeSessionRegistries(
			TRANSLATION_REGISTRIES_PAYLOAD,
		);
		const [resourceKey] = Object.keys(
			TRANSLATION_REGISTRIES_PAYLOAD.resources,
		);
		const [populationId] = registries.populations.keys();
		const [actionId] = registries.actions.keys();
		const [buildingId] = registries.buildings.keys();
		const [developmentId] = registries.developments.keys();
		const phases = [
			{
				id: 'growth',
				label: 'Growth',
				steps: [
					{ id: 'growth:income', triggers: ['growth'] },
					{ id: 'growth:upkeep' },
				],
			},
			{
				id: 'upkeep',
				label: 'Upkeep',
				steps: [{ id: 'upkeep:costs' }],
			},
			{
				id: 'main',
				action: true,
				label: 'Main',
				steps: [{ id: 'main:action' }],
			},
		];
		const action = registries.actions.get(actionId);
		const building = registries.buildings.get(buildingId);
		const passiveId = 'passive-a';
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {
				[resourceKey]: ['modifier'],
			},
			effectLogs: { legacy: [{ note: 'legacy entry' }] },
		};
		const compensation = (amount: number): PlayerStartConfig => ({
			resources: { [resourceKey]: amount },
		});
		const makePlayer = (config: {
			id: SessionPlayerId;
			name: string;
			resource: number;
			stat: number;
			population: number;
			buildings?: string[];
			passives?: SessionSnapshot['game']['players'][number]['passives'];
		}): SessionSnapshot['game']['players'][number] => ({
			id: config.id,
			name: config.name,
			resources: { [resourceKey]: config.resource },
			stats: { armyStrength: config.stat },
			statsHistory: {},
			population: { [populationId]: config.population },
			lands: [
				{ id: 'land-a', slotsMax: 1, slotsUsed: 0, tilled: false, developments: [] },
			],
			buildings: config.buildings ?? [],
			actions: [actionId],
			statSources: {},
			skipPhases: {},
			skipSteps: {},
			passives: config.passives ?? [],
		});
		const players: SessionSnapshot['game']['players'] = [
			makePlayer({
				id: 'A',
				name: 'Player A',
				resource: 7,
				stat: 3,
				population: 2,
				buildings: [buildingId],
				passives: [
					{
						id: passiveId,
						icon: action.icon,
						meta: { source: { icon: building.icon } },
					},
				],
			}),
			makePlayer({
				id: 'B',
				name: 'Player B',
				resource: 5,
				stat: 1,
				population: 1,
			}),
		];
		const session: SessionSnapshot = {
			game: {
				turn: 4,
				currentPlayerIndex: 0,
				currentPhase: phases[0]?.id ?? 'growth',
				currentStep: phases[0]?.steps?.[0]?.id ?? 'growth:income',
				phaseIndex: 0,
				stepIndex: 0,
				devMode: false,
				players,
				activePlayerId: 'A',
				opponentId: 'B',
			},
			phases,
			actionCostResource: resourceKey,
			recentResourceGains: [{ key: resourceKey, amount: 3 }],
			compensations: {
				A: compensation(2),
				B: compensation(1),
			},
			rules: {
				tieredResourceKey: resourceKey,
				tierDefinitions: [],
				winConditions: [],
			},
			passiveRecords: {
				A: [
					{
						...players[0]?.passives?.[0],
						owner: 'A',
					},
				],
				B: [],
			},
			metadata,
		};
		const context = createTranslationContext(session, registries, metadata, {
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		});
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
			rules: context.rules,
			passives: {
				list: context.passives.list().map(({ id }) => id),
				owned: context.passives.list(activeId).map(({ id }) => id),
				descriptor: context.passives.get(passiveId, activeId),
				definition: context.passives.getDefinition(passiveId, activeId),
				definitions: context.passives
					.definitions(activeId)
					.map(({ id }) => id),
				evaluationMods: evaluationSnapshot,
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
			    "definition": {
			      "icon": "🌱",
			      "id": "passive-a",
			      "meta": {
			        "source": {
			          "icon": "🏛️",
			        },
			      },
			      "owner": "A",
			    },
			    "definitions": [
			      "passive-a",
			    ],
			    "descriptor": {
			      "icon": "🌱",
			      "meta": {
			        "source": {
			          "icon": "🏛️",
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
			      "id": "town_hall",
			    },
			    "development": {
			      "has": true,
			      "id": "farm",
			    },
			  },
			  "rules": {
			    "tierDefinitions": [],
			    "tieredResourceKey": "gold",
			    "winConditions": [],
			  },
			}
		`);
	});
});
