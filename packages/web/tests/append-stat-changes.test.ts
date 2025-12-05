import { describe, expect, it } from 'vitest';
import { appendStatChanges } from '../src/translation/log/diffSections';
import { type PlayerSnapshot } from '../src/translation/log';
import { type StepEffects } from '../src/translation/log/statBreakdown';
import { formatPercentBreakdown } from '../src/translation/log/diffFormatting';
import { formatStatValue } from '../src/utils/stats';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createTranslationContext } from '../src/translation/context';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import {
	selectPopulationDescriptor,
	selectStatDescriptor,
} from '../src/translation/effects/registrySelectors';
import { getResourceIdForLegacy } from '../src/translation/resourceV2/legacyMapping';

function createTranslationSetup() {
	const scaffold = createTestSessionScaffold();
	const activePlayer = createSnapshotPlayer({
		id: 'player-1',
		name: 'Player One',
	});
	const opponent = createSnapshotPlayer({
		id: 'player-2',
		name: 'Player Two',
	});
	const session = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases: scaffold.phases,
		actionCostResource: scaffold.ruleSnapshot.tieredResourceKey,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata: scaffold.metadata,
	});
	const translationContext = createTranslationContext(
		session,
		scaffold.registries,
		session.metadata,
		{
			ruleSnapshot: scaffold.ruleSnapshot,
			passiveRecords: session.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		scaffold.registries,
		session.metadata,
	);
	const [primaryStat, secondaryStat] = metadataSelectors.statMetadata.list;
	if (!primaryStat || !secondaryStat) {
		throw new Error(
			'Expected at least two stats for append stat change tests.',
		);
	}
	const populationDescriptor =
		metadataSelectors.populationMetadata.list.find((descriptor) => {
			return Boolean(descriptor.icon);
		}) ?? metadataSelectors.populationMetadata.list[0];
	if (!populationDescriptor) {
		throw new Error(
			'Expected at least one population descriptor for stat changes.',
		);
	}
	return {
		translationContext,
		primaryStatId: primaryStat.id,
		secondaryStatId: secondaryStat.id,
		populationId: populationDescriptor.id,
	};
}

describe('appendStatChanges', () => {
	it('uses the provided player snapshot for percent breakdowns', () => {
		const { translationContext, primaryStatId, secondaryStatId, populationId } =
			createTranslationSetup();
		const before: PlayerSnapshot = {
			resources: {},
			stats: {
				[primaryStatId]: 4,
				[secondaryStatId]: 20,
			},
			population: {},
			buildings: [],
			lands: [],
			passives: [],
			valuesV2: {
				[primaryStatId]: 4,
				[secondaryStatId]: 20,
			},
			resourceBoundsV2: {},
		};
		const after: PlayerSnapshot = {
			resources: {},
			stats: {
				[primaryStatId]: 5,
				[secondaryStatId]: 20,
			},
			population: {},
			buildings: [],
			lands: [],
			passives: [],
			valuesV2: {
				[primaryStatId]: 5,
				[secondaryStatId]: 20,
			},
			resourceBoundsV2: {},
		};
		const player: PlayerSnapshot = {
			resources: {},
			stats: {
				[primaryStatId]: 5,
				[secondaryStatId]: 25,
			},
			population: {
				[populationId]: 2,
			},
			buildings: [],
			lands: [],
			passives: [],
			valuesV2: {
				[primaryStatId]: 5,
				[secondaryStatId]: 25,
				[populationId]: 2,
			},
			resourceBoundsV2: {},
		};
		const raiseStrengthEffects: StepEffects = {
			effects: [
				{
					evaluator: {
						type: 'population',
						params: { role: populationId },
					},
					effects: [
						{
							type: 'stat',
							method: 'add_pct',
							params: {
								key: primaryStatId,
								percentStat: secondaryStatId,
							},
						},
					],
				},
			],
		};
		const assets = translationContext.assets;
		const changes: string[] = [];
		appendStatChanges(
			changes,
			before,
			after,
			player,
			raiseStrengthEffects,
			assets,
			translationContext.resourceMetadataV2,
		);
		const statDescriptor = selectStatDescriptor(
			translationContext,
			primaryStatId,
		);
		const label = statDescriptor.label ?? primaryStatId;
		const line = changes.find((entry) => entry.includes(label));
		expect(line).toBeDefined();
		const populationDescriptor = selectPopulationDescriptor(
			translationContext,
			populationId,
		);
		const secondaryStatDescriptor = selectStatDescriptor(
			translationContext,
			secondaryStatId,
		);
		const legionIcon = populationDescriptor.icon ?? '';
		const growthIcon = secondaryStatDescriptor.icon ?? '';
		const armyIcon = statDescriptor.icon ?? '';
		const breakdown = formatPercentBreakdown(
			armyIcon || '',
			formatStatValue(primaryStatId, before.stats[primaryStatId], assets),
			legionIcon,
			player.population[populationId] ?? 0,
			growthIcon,
			formatStatValue(secondaryStatId, player.stats[secondaryStatId], assets),
			formatStatValue(primaryStatId, after.stats[primaryStatId], assets),
		);
		expect(line?.endsWith(breakdown)).toBe(true);
	});

	it('falls back to raw identifiers when stat metadata is missing', () => {
		const { translationContext, primaryStatId, secondaryStatId, populationId } =
			createTranslationSetup();
		const baseAssets = translationContext.assets;
		const before: PlayerSnapshot = {
			resources: {},
			stats: { [primaryStatId]: 1 },
			population: {},
			buildings: [],
			lands: [],
			passives: [],
			valuesV2: { [primaryStatId]: 1 },
			resourceBoundsV2: {},
		};
		const after: PlayerSnapshot = {
			resources: {},
			stats: { [primaryStatId]: 3 },
			population: {},
			buildings: [],
			lands: [],
			passives: [],
			valuesV2: { [primaryStatId]: 3 },
			resourceBoundsV2: {},
		};
		const player: PlayerSnapshot = {
			resources: {},
			stats: { [primaryStatId]: 3, [secondaryStatId]: 4 },
			population: { [populationId]: 1 },
			buildings: [],
			lands: [],
			passives: [],
			valuesV2: {
				[primaryStatId]: 3,
				[secondaryStatId]: 4,
				[populationId]: 1,
			},
			resourceBoundsV2: {},
		};
		const step: StepEffects = {
			effects: [
				{
					evaluator: { type: 'population', params: { role: populationId } },
					effects: [
						{
							type: 'stat',
							method: 'add_pct',
							params: {
								key: primaryStatId,
								percentStat: secondaryStatId,
							},
						},
					],
				},
			],
		};
		const fallbackAssets = {
			...baseAssets,
			stats: Object.fromEntries(
				Object.entries(baseAssets.stats ?? {}).filter(([key]) => {
					return key !== primaryStatId;
				}),
			),
		};
		// Create a metadata selector that returns the raw ID as label for
		// primaryStatId to test fallback behavior
		const baseMetadata = translationContext.resourceMetadataV2;
		// Convert legacy stat key to V2 ID for comparison
		const primaryStatV2Id =
			getResourceIdForLegacy('stats', primaryStatId) ?? primaryStatId;
		const fallbackMetadata = {
			get(id: string) {
				if (id === primaryStatV2Id) {
					// Return minimal metadata with ID as label and no icon
					return { id, label: id };
				}
				return baseMetadata.get(id);
			},
			list() {
				return baseMetadata.list();
			},
			has(id: string) {
				return baseMetadata.has(id);
			},
		};
		const changes: string[] = [];
		appendStatChanges(
			changes,
			before,
			after,
			player,
			step,
			fallbackAssets,
			fallbackMetadata,
		);
		// Output should contain the V2 ID since we use it as the fallback label
		const entry = changes.find((line) => line.includes(primaryStatV2Id));
		expect(entry).toBeDefined();
		expect(entry?.includes(primaryStatV2Id)).toBe(true);
	});
});
