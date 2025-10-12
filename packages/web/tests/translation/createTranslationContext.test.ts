import type {
	EngineSessionSnapshot,
	PlayerId,
	ResourceKey,
} from '@kingdom-builder/engine';
import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import { describe, expect, it } from 'vitest';

import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from '../helpers/sessionRegistries';

const PHASES_FIXTURE: EngineSessionSnapshot['phases'] = [
	{
		id: 'growth',
		label: 'Growth',
		icon: '🌱',
		steps: [
			{ id: 'income', title: 'Collect income' },
			{ id: 'resolve', title: 'Resolve effects' },
		],
	},
	{
		id: 'upkeep',
		label: 'Upkeep',
		icon: '🧹',
		steps: [{ id: 'cleanup', title: 'Refresh upkeep' }],
	},
	{
		id: 'main',
		label: 'Main',
		icon: '⚔️',
		steps: [{ id: 'actions', title: 'Perform actions' }],
	},
];

describe('createTranslationContext', () => {
	it('derives a translation context snapshot', () => {
		const registries = createSessionRegistries();
		const [resourceKey] = Object.keys(registries.resources) as ResourceKey[];
		registries.resources[resourceKey] = { key: resourceKey };
		const statKey = 'maxPopulation';
		const [populationId] = registries.populations.keys();
		const [actionId] = registries.actions.keys();
		const [buildingId] = registries.buildings.keys();
		const [developmentId] = registries.developments.keys();
		const [firstPhase] = PHASES_FIXTURE;
		const firstStep = firstPhase?.steps?.[0]?.id ?? firstPhase?.id ?? 'phase';
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
				currentPhase: firstPhase?.id ?? 'phase',
				currentStep: firstStep,
				phaseIndex: 0,
				stepIndex: 0,
				devMode: false,
				players,
				activePlayerId: 'A',
				opponentId: 'B',
			},
			phases: PHASES_FIXTURE,
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
		expect(context.actionCostResource).toBe(resourceKey);
		expect(context.phases.map((phase) => phase.id)).toEqual(
			PHASES_FIXTURE.map((phase) => phase.id),
		);
		expect(context.activePlayer.id).toBe(players[0]?.id);
		expect(context.opponent.id).toBe(players[1]?.id);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceKey, amount: 3 },
		]);
		expect(context.compensations).toEqual(session.compensations);
		expect(context.actions.has(actionId)).toBe(true);
		expect(context.buildings.has(buildingId)).toBe(true);
		expect(context.developments.has(developmentId)).toBe(true);
		expect(context.populations.has(populationId)).toBe(true);
		const resourceAsset = context.assets.resources[resourceKey];
		expect(resourceAsset).toEqual({ label: resourceKey });
		const passiveDescriptor = context.passives.get(passiveId, activeId);
		expect(passiveDescriptor?.icon).toBe(registries.actions.get(actionId).icon);
		const passiveDefinition = context.passives.getDefinition(
			passiveId,
			activeId,
		);
		expect(passiveDefinition?.meta?.source?.icon).toBe(
			registries.buildings.get(buildingId).icon,
		);
		expect(context.passives.definitions(activeId).map(({ id }) => id)).toEqual([
			passiveId,
		]);
		expect(context.passives.list().map(({ id }) => id)).toEqual([passiveId]);
		expect(context.passives.list(activeId).map(({ id }) => id)).toEqual([
			passiveId,
		]);
		expect(evaluationSnapshot).toEqual([[resourceKey, ['modifier']]]);
		expect(context.rules).toEqual(session.rules);
		expect(context.rules).not.toBe(session.rules);
		const firstList = context.passives.list();
		const secondList = context.passives.list();
		expect(secondList).toEqual(firstList);
		expect(secondList).not.toBe(firstList);
	});
});
