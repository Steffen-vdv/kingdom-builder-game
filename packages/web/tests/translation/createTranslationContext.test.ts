import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import type {
	SessionPlayerId,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { describe, expect, it } from 'vitest';

import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from '../helpers/sessionRegistries';

describe('createTranslationContext', () => {
	it('derives a translation context snapshot', () => {
		const registries = createSessionRegistries();
		const [resourceKey] = Object.keys(registries.resources);
		if (!resourceKey) {
			throw new Error(
				'Expected test registries to expose at least one resource.',
			);
		}
		registries.resources[resourceKey] = {
			...registries.resources[resourceKey],
			label: undefined,
		};
		const statKey = 'maxPopulation';
		const [populationId] = registries.populations.keys();
		const [actionId] = registries.actions.keys();
		const [buildingId] = registries.buildings.keys();
		const [developmentId] = registries.developments.keys();
		const phases: SessionSnapshot['phases'] = [
			{
				id: 'phase.alpha',
				label: 'Alpha',
				icon: '🅰️',
				steps: [
					{
						id: 'phase.alpha.step-0',
						title: 'Open Alpha',
						effects: [],
					},
				],
			},
		];
		const [firstPhase] = phases;
		const firstStep = firstPhase?.steps?.[0]?.id ?? firstPhase?.id ?? 'phase';
		const passiveId = 'passive-a';
		const triggerId = 'trigger.session.signal';
		const metadata = {
			effectLogs: { legacy: [{ note: 'legacy entry' }] },
			passiveEvaluationModifiers: {
				[resourceKey]: ['modifier'],
			},
			resources: {
				[resourceKey]: {
					label: 'Royal Treasury',
					icon: '💰',
					description: 'The royal treasury fuels your ambitions.',
				},
			},
			populations: populationId
				? {
						[populationId]: {
							label: 'Royal Court',
							icon: '🏰',
						},
					}
				: undefined,
			stats: {
				[statKey]: {
					label: 'Population Capacity',
					icon: '🏯',
					description: 'Represents how much population the realm can sustain.',
					displayAsPercent: true,
					format: { prefix: '~', percent: true },
				},
			},
			assets: {
				passive: { icon: '✨', label: 'Passive Aura' },
				slot: {
					icon: '📦',
					label: 'Plot Slot',
					description: 'Designated location for new developments.',
				},
				land: { icon: '🌄', label: 'Territory' },
				population: { icon: '🧑‍🤝‍🧑', label: 'Population' },
				upkeep: { icon: '🪣', label: 'Maintenance' },
			},
			triggers: {
				[triggerId]: {
					icon: '🔔',
					future: 'When the signal sounds',
					past: 'Signal',
					label: 'Signal Trigger',
				},
			},
		} satisfies SessionSnapshot['metadata'];
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
		const players: SessionSnapshot['game']['players'] = [
			makePlayer({
				id: 'A' as SessionPlayerId,
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
				id: 'B' as SessionPlayerId,
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
				currentPhase: firstPhase?.id ?? 'phase',
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
				population: {
					id: populationId,
					has: context.populations.has(populationId),
				},
			},
			assets: {
				passive: context.assets.passive,
				slot: context.assets.slot,
				resource: context.assets.resources[resourceKey],
				stat: context.assets.stats[statKey],
				trigger: context.assets.triggers[triggerId],
				population: context.assets.population,
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
                              "icon": "✨",
                              "label": "Passive Aura",
                            },
                            "population": {
                              "icon": "🧑‍🤝‍🧑",
                              "label": "Population",
                            },
                            "resource": {
                              "description": "The royal treasury fuels your ambitions.",
                              "icon": "💰",
                              "label": "Royal Treasury",
                            },
                            "slot": {
                              "description": "Designated location for new developments.",
                              "icon": "📦",
                              "label": "Plot Slot",
                            },
                            "stat": {
                              "description": "Represents how much population the realm can sustain.",
                              "displayAsPercent": true,
                              "format": {
                                "percent": true,
                                "prefix": "~",
                              },
                              "icon": "🏯",
                              "label": "Population Capacity",
                            },
                            "trigger": {
                              "future": "When the signal sounds",
                              "icon": "🔔",
                              "label": "Signal Trigger",
                              "past": "Signal",
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
                            "phase.alpha",
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
