import type { EngineSessionSnapshot, PlayerId } from '@kingdom-builder/engine';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import { describe, expect, it } from 'vitest';

import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import type { SessionResourceKey } from '../../src/state/sessionTypes';

describe('createTranslationContext', () => {
	it('derives a translation context snapshot', () => {
		const registries = createSessionRegistries();
		const resourceKeys = Object.keys(
			registries.resources,
		) as SessionResourceKey[];
		if (resourceKeys.length === 0) {
			throw new Error('Expected session registries to expose resources.');
		}
		const [resourceKey] = resourceKeys;
		const statKey = 'maxPopulation';
		const [populationId] = registries.populations.keys();
		const [actionId] = registries.actions.keys();
		const [buildingId] = registries.buildings.keys();
		const [developmentId] = registries.developments.keys();
		registries.resources[resourceKey] = { key: resourceKey };
		const phases: EngineSessionSnapshot['phases'] = [
			{
				id: 'phase.opening',
				label: 'Opening',
				icon: '🔰',
				steps: [
					{
						id: 'step.setup',
						title: 'Set Up',
						triggers: ['start'],
					},
				],
			},
			{
				id: 'phase.ending',
				label: 'Ending',
				steps: [],
			},
		];
		const firstStep = phases[0]?.steps?.[0]?.id ?? 'step.setup';
		const passiveId = 'passive-a';
		const metadata = {
			effectLogs: { legacy: [{ note: 'legacy entry' }] },
			passiveEvaluationModifiers: {
				[resourceKey]: ['modifier'],
			},
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
						icon: registries.actions.get(actionId).icon,
						meta: {
							source: { icon: registries.buildings.get(buildingId).icon },
						},
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
				currentPhase: phases[0]?.id ?? 'phase',
				currentStep: firstStep,
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
						id: passiveId,
						owner: 'A',
						icon: registries.actions.get(actionId).icon,
						meta: {
							source: {
								icon: registries.buildings.get(buildingId).icon,
							},
						},
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
		expect(context.pullEffectLog('legacy')).toBeUndefined();
		const evaluationSnapshot = Array.from(
			context.passives.evaluationMods.entries(),
		).map(([modifierId, modifiers]) => [
			modifierId,
			Array.from(modifiers.keys()),
		]);
		const activeId = players[0]?.id ?? 'A';
		expect(context.assets.resources[resourceKey]?.label).toBe(resourceKey);
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
				population: {
					id: populationId,
					has: context.populations.has(populationId),
				},
			},
			assets: {
				passive: context.assets.passive,
				slot: context.assets.slot,
				resource: context.assets.resources[resourceKey],
			},
			rules: context.rules,
			passives: {
				list: context.passives.list().map(({ id }) => id),
				owned: context.passives.list(activeId).map(({ id }) => id),
				descriptor: context.passives.get(passiveId, activeId),
				definition: context.passives.getDefinition(passiveId, activeId),
				definitions: context.passives.definitions(activeId).map(({ id }) => id),
				evaluationMods: evaluationSnapshot,
			},
		};
		expect(contextSnapshot).toMatchInlineSnapshot(`
                        {
                          "actionCostResource": "gold",
                          "assets": {
                            "passive": {
                              "icon": "♾️",
                              "label": "Passive",
                            },
                            "resource": {
                              "label": "gold",
                            },
                            "slot": {
                              "icon": "🧩",
                              "label": "Development Slot",
                            },
                          },
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
                                  "icon": "🏘️",
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
                          },
                          "phases": [
                            "phase.opening",
                            "phase.ending",
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
                            "population": {
                              "has": true,
                              "id": "council",
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
