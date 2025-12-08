import { describe, expect, it } from 'vitest';
import { appendPercentBreakdownChanges } from '../src/translation/log/diffSections';
import { type PlayerSnapshot } from '../src/translation/log';
import { type StepEffects } from '../src/translation/log/resourceBreakdown';
import { formatPercentBreakdown } from '../src/translation/log/diffFormatting';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createTranslationContext } from '../src/translation/context';
import type { TranslationContext } from '../src/translation/context';
import {
	selectPopulationDescriptor,
	selectStatDescriptor,
} from '../src/translation/effects/registrySelectors';

// Format value using metadata like describePercentBreakdown does
function formatValue(
	id: string,
	value: number,
	context: TranslationContext,
): string {
	const meta = context.resourceMetadata.get(id);
	return meta?.displayAsPercent ? `${value * 100}%` : String(value);
}

// stat keys for testing - these match the resource:core: prefix format
const STAT_KEYS = {
	armyStrength: 'resource:core:army-strength',
	growth: 'resource:core:growth',
} as const;

// population key for testing
const POPULATION_KEY = 'resource:core:legion';

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
	// Use stat keys directly instead of legacy stat metadata
	return {
		translationContext,
		primaryStatId: STAT_KEYS.armyStrength,
		secondaryStatId: STAT_KEYS.growth,
		populationId: POPULATION_KEY,
	};
}

describe('appendPercentBreakdownChanges', () => {
	it('uses the provided player snapshot for percent breakdowns', () => {
		const { translationContext, primaryStatId, secondaryStatId, populationId } =
			createTranslationSetup();
		const before: PlayerSnapshot = {
			buildings: [],
			lands: [],
			passives: [],
			values: {
				[primaryStatId]: 4,
				[secondaryStatId]: 20,
			},
			resourceBounds: {},
		};
		const after: PlayerSnapshot = {
			buildings: [],
			lands: [],
			passives: [],
			values: {
				[primaryStatId]: 5,
				[secondaryStatId]: 20,
			},
			resourceBounds: {},
		};
		const player: PlayerSnapshot = {
			buildings: [],
			lands: [],
			passives: [],
			values: {
				[primaryStatId]: 5,
				[secondaryStatId]: 25,
				[populationId]: 2,
			},
			resourceBounds: {},
		};
		const raiseStrengthEffects: StepEffects = {
			effects: [
				{
					evaluator: {
						type: 'resource',
						params: { resourceId: populationId },
					},
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: {
								resourceId: primaryStatId,
								change: {
									type: 'percentFromResource',
									sourceResourceId: secondaryStatId,
								},
							},
						},
					],
				},
			],
		};
		const assets = translationContext.assets;
		const changes: string[] = [];
		appendPercentBreakdownChanges(
			changes,
			before,
			after,
			player,
			raiseStrengthEffects,
			assets,
			translationContext.resourceMetadata,
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
		// Use resource-aware formatting to match describeStatBreakdown behavior
		const breakdown = formatPercentBreakdown(
			armyIcon || '',
			formatValue(
				primaryStatId,
				before.values[primaryStatId],
				translationContext,
			),
			legionIcon,
			player.values[populationId] ?? 0,
			growthIcon,
			formatValue(
				secondaryStatId,
				player.values[secondaryStatId],
				translationContext,
			),
			formatValue(
				primaryStatId,
				after.values[primaryStatId],
				translationContext,
			),
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
			values: { [primaryStatId]: 1 },
			resourceBounds: {},
		};
		const after: PlayerSnapshot = {
			buildings: [],
			lands: [],
			passives: [],
			values: { [primaryStatId]: 3 },
			resourceBounds: {},
		};
		const player: PlayerSnapshot = {
			buildings: [],
			lands: [],
			passives: [],
			values: {
				[primaryStatId]: 3,
				[secondaryStatId]: 4,
				[populationId]: 1,
			},
			resourceBounds: {},
		};
		const step: StepEffects = {
			effects: [
				{
					evaluator: { type: 'resource', params: { resourceId: populationId } },
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: {
								resourceId: primaryStatId,
								change: {
									type: 'percentFromResource',
									sourceResourceId: secondaryStatId,
								},
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
		// primaryStatId to test fallback behavior - primaryStatId is already resource
		const baseMetadata = translationContext.resourceMetadata;
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
		appendPercentBreakdownChanges(
			changes,
			before,
			after,
			player,
			step,
			fallbackAssets,
			fallbackMetadata,
		);
		// Output should contain the ID since we use it as the fallback label
		const entry = changes.find((line) => line.includes(primaryStatId));
		expect(entry).toBeDefined();
		expect(entry?.includes(primaryStatId)).toBe(true);
	});
});
