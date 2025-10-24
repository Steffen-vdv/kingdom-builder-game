import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import type {
	SessionPlayerId,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { describe, expect, it } from 'vitest';

import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import { createResourceV2TestScenario } from '../helpers/resourceV2Scenario';

describe('createTranslationContext', () => {
	it('derives a translation context snapshot', () => {
		const registries = createSessionRegistries();
		const [resourceKey] = Object.keys(registries.resources);
		if (!resourceKey) {
			throw new Error(
				'Expected test registries to expose at least one resource.',
			);
		}
		const resourceScenario = createResourceV2TestScenario();
		const [primaryResource] = resourceScenario.resourceDefinitions;
		const resourceV2Id = primaryResource?.id;
		const resourceGroupV2Id = resourceScenario.groupDefinition.id;
		if (!resourceV2Id) {
			throw new Error('Expected ResourceV2 definitions to be available.');
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
			resourcesV2: resourceScenario.resourceMetadata,
			resourceGroupsV2: resourceScenario.resourceGroupMetadata,
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
					description: 'Represents how many specialists can serve the realm.',
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
			valuesV2: Record<string, number>;
			boundsV2: Record<
				string,
				{ lowerBound: number | null; upperBound: number | null }
			>;
			buildings?: string[];
			passives?: SessionSnapshot['game']['players'][number]['passives'];
		}): SessionSnapshot['game']['players'][number] => ({
			id: config.id,
			name: config.name,
			resources: { [resourceKey]: config.resource },
			valuesV2: { ...config.valuesV2 },
			stats: { [statKey]: config.stat },
			statsHistory: {},
			population: { [populationId]: config.population },
			resourceBoundsV2: Object.fromEntries(
				Object.entries(config.boundsV2).map(([id, entry]) => [
					id,
					{
						lowerBound: entry.lowerBound ?? null,
						upperBound: entry.upperBound ?? null,
					},
				]),
			),
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
				valuesV2: resourceScenario.playerValues,
				boundsV2: resourceScenario.playerBounds,
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
				valuesV2: resourceScenario.opponentValues,
				boundsV2: resourceScenario.playerBounds,
				passives: [],
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
				resourceCatalogV2: {
					resources: {
						ordered: [resourceDefinitionV2],
						byId: { [resourceV2Id]: resourceDefinitionV2 },
					},
					groups: {
						ordered: [resourceGroupDefinitionV2],
						byId: { [resourceGroupV2Id]: resourceGroupDefinitionV2 },
					},
				},
			},
			phases,
			actionCostResource: resourceKey,
			recentResourceGains: [
				{ key: resourceKey, amount: 3 },
				...resourceScenario.recentGains,
			],
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
			resourceMetadataV2: resourceScenario.resourceMetadata,
			resourceGroupMetadataV2: resourceScenario.resourceGroupMetadata,
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
		const resourceMetadata = context.resourceMetadataV2.get(resourceV2Id);
		const groupMetadata =
			context.resourceGroupMetadataV2.get(resourceGroupV2Id);
		const expectedResourceGain = resourceScenario.recentGains
			.filter((gain) => gain.key === resourceV2Id)
			.reduce((sum, gain) => sum + gain.amount, 0);
		expect(context.actionCostResource).toBe(resourceKey);
		expect(context.resourcesV2?.resources.byId[resourceV2Id]?.id).toBe(
			resourceV2Id,
		);
		expect(context.resourcesV2?.groups.byId[resourceGroupV2Id]?.id).toBe(
			resourceGroupV2Id,
		);
		expect(resourceMetadata.label).toBe(
			resourceScenario.resourceMetadata[resourceV2Id].label,
		);
		expect(groupMetadata.label).toBe(
			resourceScenario.resourceGroupMetadata[resourceGroupV2Id].label,
		);
		expect(context.resourceMetadataV2.has(resourceV2Id)).toBe(true);
		expect(context.resourceMetadataV2.get('resource:missing').label).toBe(
			'resource:missing',
		);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceKey, amount: 3 },
			...resourceScenario.recentGains,
		]);
		expect(context.signedResourceGains.sumForResource(resourceKey)).toBe(3);
		expect(
			context.signedResourceGains.sumForResource(resourceV2Id),
		).toBeCloseTo(expectedResourceGain);
		expect(context.activePlayer.resourcesV2?.[resourceV2Id]).toBe(
			resourceScenario.playerValues[resourceV2Id],
		);
		expect(context.activePlayer.resourceBoundsV2?.[resourceV2Id]).toEqual({
			lowerBound: resourceScenario.playerBounds[resourceV2Id].lowerBound,
			upperBound: resourceScenario.playerBounds[resourceV2Id].upperBound,
		});
		expect(context.assets.resources[resourceKey].label).toBe('Royal Treasury');
		expect(context.compensations.A?.resources?.[resourceKey]).toBe(2);
		expect(context.actions.has(actionId)).toBe(true);
		expect(context.buildings.has(buildingId)).toBe(true);
		expect(context.developments.has(developmentId)).toBe(true);
		expect(context.populations.has(populationId)).toBe(true);
		expect(context.activePlayer.id).toBe('A');
		expect(context.opponent.id).toBe('B');
		expect(context.phases.map((phase) => phase.id)).toContain(
			firstPhase?.id ?? 'phase',
		);
		expect(context.passives.list().map(({ id }) => id)).toContain(passiveId);
		expect(context.passives.get(passiveId, activeId)).toBeDefined();
		expect(context.passives.getDefinition(passiveId, activeId)?.id).toBe(
			passiveId,
		);
		expect(evaluationSnapshot).toEqual([[resourceKey, ['modifier']]]);
	});
});
