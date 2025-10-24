import type { PlayerStartConfig } from '@kingdom-builder/protocol';
import type {
	SessionPlayerId,
	SessionRuleSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol/session';
import { describe, expect, it } from 'vitest';

import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import { getResourceIdForLegacy } from '../../src/translation/resourceV2';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import { createTestResourceCatalogV2 } from '../helpers/resourceV2Catalog';

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
		const {
			catalog: resourceCatalogV2,
			metadata: baseResourceMetadataV2,
			groupMetadata: baseResourceGroupMetadataV2,
		} = createTestResourceCatalogV2();
		const resourceV2Id =
			getResourceIdForLegacy('resources', resourceKey) ??
			resourceCatalogV2.resources.ordered[0]?.id ??
			'resource:test';
		const resourceDefinitionV2 = resourceCatalogV2.resources.byId[resourceV2Id];
		if (!resourceDefinitionV2) {
			throw new Error(
				'Expected ResourceV2 definition for the primary resource.',
			);
		}
		const resourceGroupV2Id =
			resourceDefinitionV2.groupId ??
			resourceCatalogV2.groups.ordered[0]?.id ??
			'resource-group:test';
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
		const metadataResourcesV2 = structuredClone(baseResourceMetadataV2);
		metadataResourcesV2[resourceV2Id] = {
			...metadataResourcesV2[resourceV2Id],
			label: 'V2 Treasury',
			icon: '🏦',
			description: 'Translation metadata for ResourceV2.',
			displayAsPercent: true,
			format: { prefix: '+', percent: true },
		};
		const metadataResourceGroupsV2 = structuredClone(
			baseResourceGroupMetadataV2,
		);
		metadataResourceGroupsV2[resourceGroupV2Id] = {
			...metadataResourceGroupsV2[resourceGroupV2Id],
			label: 'Economic Overview',
			icon: '📊',
		};
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
			resourcesV2: metadataResourcesV2,
			resourceGroupsV2: metadataResourceGroupsV2,
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
			buildings?: string[];
			passives?: SessionSnapshot['game']['players'][number]['passives'];
		}): SessionSnapshot['game']['players'][number] => ({
			id: config.id,
			name: config.name,
			resources: { [resourceKey]: config.resource },
			valuesV2: { [resourceV2Id]: config.resource },
			stats: { [statKey]: config.stat },
			statsHistory: {},
			population: { [populationId]: config.population },
			resourceBoundsV2: {
				[resourceV2Id]: { lowerBound: 0, upperBound: 20 },
			},
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
				passives: [],
			}),
		];
		const ruleSnapshot: SessionRuleSnapshot = {
			tieredResourceKey: resourceKey,
			tierDefinitions: [],
			winConditions: [],
		};
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
				resourceCatalogV2,
			},
			phases,
			actionCostResource: resourceKey,
			recentResourceGains: [
				{ key: resourceKey, amount: 3 },
				{ key: resourceV2Id, amount: -2 },
			],
			compensations: {
				A: compensation(2),
				B: compensation(1),
			},
			rules: ruleSnapshot,
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
			resourceMetadataV2: {
				[resourceV2Id]: {
					label: 'Catalog Gold',
					icon: '🥇',
					description: 'Catalog-provided metadata.',
				},
			},
			resourceGroupMetadataV2: {
				[resourceGroupV2Id]: {
					label: 'Catalog Economy',
					icon: '💼',
				},
			},
		};
		const context = createTranslationContext(session, registries, metadata, {
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		});
		expect(context.pullEffectLog<{ note: string }>('legacy')).toEqual({
			note: 'legacy entry',
		});
		expect(context.resourcesV2?.resources.byId[resourceV2Id]).toMatchObject({
			id: resourceV2Id,
			label: resourceDefinitionV2.label,
			groupId: resourceGroupV2Id,
		});
		expect(context.resourceMetadataV2.list()).toHaveLength(
			resourceCatalogV2.resources.ordered.length,
		);
		expect(context.resourceMetadataV2.get(resourceV2Id)).toMatchObject({
			id: resourceV2Id,
			label: 'Catalog Gold',
			icon: '🥇',
		});
		expect(
			context.resourceGroupMetadataV2.get(resourceGroupV2Id),
		).toMatchObject({
			id: resourceGroupV2Id,
			label: 'Catalog Economy',
			icon: '💼',
		});
		expect(context.resourceMetadataV2.has(resourceV2Id)).toBe(true);
		expect(context.resourceMetadataV2.get('resource:missing').label).toBe(
			'resource:missing',
		);
		expect(context.signedResourceGains.list()).toEqual(
			expect.arrayContaining([
				{ key: resourceKey, amount: 3 },
				{ key: resourceV2Id, amount: -2 },
			]),
		);
		expect(context.signedResourceGains.sumForResource(resourceKey)).toBe(3);
		expect(context.compensations).toEqual({
			A: { resources: { [resourceKey]: 2 } },
			B: { resources: { [resourceKey]: 1 } },
		});
		expect(context.actions.has(actionId)).toBe(true);
		expect(context.buildings.has(buildingId)).toBe(true);
		expect(context.developments.has(developmentId)).toBe(true);
		if (populationId) {
			expect(context.populations.has(populationId)).toBe(true);
		}
	});
});
