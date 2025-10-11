import type { EngineSessionSnapshot, PlayerId } from '@kingdom-builder/engine';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import { describe, expect, it } from 'vitest';

import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { deserializeSessionRegistries } from '../../src/state/sessionRegistries';
import { sessionApiRegistriesPayload } from '../fixtures/sessionApiPayload';

describe('createTranslationContext', () => {
	it('derives a translation context snapshot', () => {
		const registries = deserializeSessionRegistries(
			sessionApiRegistriesPayload,
		);
		const [resourceKey] = Object.keys(registries.resources);
		if (!resourceKey) {
			throw new Error('fixtures missing resource definitions');
		}
		const [actionId] = registries.actions.keys();
		const [buildingId] = registries.buildings.keys();
		const [developmentId] = registries.developments.keys();
		const [populationId] = registries.populations.keys();
		if (!actionId || !buildingId || !developmentId || !populationId) {
			throw new Error('fixtures missing registry entries');
		}
		const statKey = 'stat.army';
		const phases: EngineSessionSnapshot['phases'] = [
			{
				id: 'phase-growth',
				label: 'Growth',
				icon: '🌱',
				steps: [
					{
						id: 'phase-growth:start',
						triggers: ['growth:start'],
					},
				],
			},
			{
				id: 'phase-main',
				label: 'Main',
				icon: '🎯',
				action: true,
				steps: [{ id: 'phase-main:start' }],
			},
		];
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
		const actionIcon = registries.actions.get(actionId).icon;
		const buildingIcon = registries.buildings.get(buildingId).icon;
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
						icon: actionIcon,
						meta: {
							source: { icon: buildingIcon },
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
				currentPhase: phases[0]?.id ?? 'phase-growth',
				currentStep: phases[0]?.steps?.[0]?.id ?? 'phase-growth:start',
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
						icon: actionIcon,
						meta: {
							source: { icon: buildingIcon },
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
		const evaluationSnapshot = Array.from(
			context.passives.evaluationMods.entries(),
		).map(([modifierId, modifiers]) => [
			modifierId,
			Array.from(modifiers.keys()),
		]);
		const activeId = players[0]?.id ?? 'A';
		const contextSnapshot = {
			actionCostResource: context.actionCostResource,
			phases: context.phases.map((phase) => ({
				id: phase.id,
				icon: phase.icon,
				label: phase.label,
			})),
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
				resource: {
					key: resourceKey,
					label: context.resources[resourceKey]?.label,
					icon: context.resources[resourceKey]?.icon,
				},
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
                          "actionCostResource": "resource.gold",
                          "compensations": {
                            "A": {
                              "resources": {
                                "resource.gold": 2,
                              },
                            },
                            "B": {
                              "resources": {
                                "resource.gold": 1,
                              },
                            },
                          },
                          "passives": {
                            "definition": {
                              "icon": "🌾",
                              "id": "passive-a",
                              "meta": {
                                "source": {
                                  "icon": "🏭",
                                },
                              },
                              "owner": "A",
                            },
                            "definitions": [
                              "passive-a",
                            ],
                            "descriptor": {
                              "icon": "🌾",
                              "meta": {
                                "source": {
                                  "icon": "🏭",
                                },
                              },
                            },
                            "evaluationMods": [
                              [
                                "resource.gold",
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
                            {
                              "icon": "🌱",
                              "id": "phase-growth",
                              "label": "Growth",
                            },
                            {
                              "icon": "🎯",
                              "id": "phase-main",
                              "label": "Main",
                            },
                          ],
                          "players": {
                            "active": "A",
                            "opponent": "B",
                          },
                          "recentResourceGains": [
                            {
                              "amount": 3,
                              "key": "resource.gold",
                            },
                          ],
                          "registries": {
                            "action": {
                              "has": true,
                              "id": "action.harvest",
                            },
                            "building": {
                              "has": true,
                              "id": "building.mill",
                            },
                            "development": {
                              "has": true,
                              "id": "development.farm",
                            },
                            "population": {
                              "has": true,
                              "id": "population.citizen",
                            },
                            "resource": {
                              "icon": "🪙",
                              "key": "resource.gold",
                              "label": "Gold",
                            },
                          },
                          "rules": {
                            "tierDefinitions": [],
                            "tieredResourceKey": "resource.gold",
                            "winConditions": [],
                          },
                        }
                `);
	});
});
