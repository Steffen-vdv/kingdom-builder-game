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
import {
	selectPopulationDescriptor,
	selectStatDescriptor,
} from '../src/translation/effects/registrySelectors';

// V2 stat keys for testing - these match the resource:stat: prefix format
const V2_STAT_KEYS = {
	armyStrength: 'resource:stat:army-strength',
	growth: 'resource:stat:growth',
} as const;

// V2 population key for testing
const V2_POPULATION_KEY = 'resource:population:role:legion';

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
	// Use V2 stat keys directly instead of legacy stat metadata
	return {
		translationContext,
		primaryStatId: V2_STAT_KEYS.armyStrength,
		secondaryStatId: V2_STAT_KEYS.growth,
		populationId: V2_POPULATION_KEY,
	};
}

describe('appendStatChanges', () => {
	it('uses the provided player snapshot for percent breakdowns', () => {
		const { translationContext, primaryStatId, secondaryStatId, populationId } =
			createTranslationSetup();
		const before: PlayerSnapshot = {
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
			formatStatValue(primaryStatId, before.valuesV2[primaryStatId], assets),
			legionIcon,
			player.valuesV2[populationId] ?? 0,
			growthIcon,
			formatStatValue(
				secondaryStatId,
				player.valuesV2[secondaryStatId],
				assets,
			),
			formatStatValue(primaryStatId, after.valuesV2[primaryStatId], assets),
		);
		expect(line?.endsWith(breakdown)).toBe(true);
	});

	it('falls back to raw identifiers when stat metadata is missing', () => {
		const { translationContext, primaryStatId, secondaryStatId, populationId } =
			createTranslationSetup();
		const baseAssets = translationContext.assets;
		const before: PlayerSnapshot = {
			buildings: [],
			lands: [],
			passives: [],
			valuesV2: { [primaryStatId]: 1 },
			resourceBoundsV2: {},
		};
		const after: PlayerSnapshot = {
			buildings: [],
			lands: [],
			passives: [],
			valuesV2: { [primaryStatId]: 3 },
			resourceBoundsV2: {},
		};
		const player: PlayerSnapshot = {
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
		// primaryStatId to test fallback behavior - primaryStatId is already V2
		const baseMetadata = translationContext.resourceMetadataV2;
		const fallbackMetadata = {
			get(id: string) {
				if (id === primaryStatId) {
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
		const entry = changes.find((line) => line.includes(primaryStatId));
		expect(entry).toBeDefined();
		expect(entry?.includes(primaryStatId)).toBe(true);
	});
});
