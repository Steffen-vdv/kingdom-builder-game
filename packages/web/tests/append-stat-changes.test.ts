import { describe, expect, it } from 'vitest';
import { appendStatChanges } from '../src/translation/log/diffSections';
import { type PlayerSnapshot } from '../src/translation/log';
import { type StepEffects } from '../src/translation/log/statBreakdown';
import { formatPercentBreakdown } from '../src/translation/log/diffFormatting';
import { formatStatValue } from '../src/utils/stats';
import { createSessionRegistries } from './helpers/sessionRegistries';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { createTranslationContext } from '../src/translation/context/createTranslationContext';
import {
	selectPopulationRoleDisplay,
	selectStatDisplay,
} from '../src/translation/context/assetSelectors';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import type { PhaseConfig, RuleSet } from '@kingdom-builder/protocol';

function createTranslationAssets() {
	const registries = createSessionRegistries();
	const resourceKeys = Object.keys(registries.resources);
	const tieredResourceKey = resourceKeys[0] ?? 'resource:primary';
	const phases: PhaseConfig[] = [
		{ id: 'phase:action', steps: [{ id: 'phase:action:start' }], action: true },
	];
	const ruleSnapshot: RuleSet = {
		defaultActionAPCost: 1,
		absorptionCapPct: 1,
		absorptionRounding: 'nearest',
		tieredResourceKey,
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 1,
		winConditions: [],
	};
	const players = [
		createSnapshotPlayer({
			id: 'player:A',
			resources: { [tieredResourceKey]: 0 },
		}),
		createSnapshotPlayer({ id: 'player:B' }),
	];
	const session = createSessionSnapshot({
		players,
		activePlayerId: players[0]!.id,
		opponentId: players[1]!.id,
		phases,
		actionCostResource: tieredResourceKey,
		ruleSnapshot,
	});
	const translationContext = createTranslationContext(
		session,
		registries,
		session.metadata,
		{
			ruleSnapshot,
			passiveRecords: session.passiveRecords,
		},
	);
	const metadataSelectors = createTestRegistryMetadata(
		{
			resources: registries.resources,
			populations: registries.populations,
			buildings: registries.buildings,
			developments: registries.developments,
		},
		session.metadata,
	);
	return { translationContext, metadataSelectors };
}

describe('appendStatChanges', () => {
	it('uses the provided player snapshot for percent breakdowns', () => {
		const { translationContext, metadataSelectors } = createTranslationAssets();
		const assetEntries = Object.entries(translationContext.assets.stats);
		const armyEntry =
			assetEntries.find(([, entry]) =>
				entry.label?.toLowerCase().includes('army'),
			) ?? assetEntries[0];
		const growthEntry =
			assetEntries.find(([, entry]) =>
				entry.label?.toLowerCase().includes('growth'),
			) ?? assetEntries.at(-1);
		expect(armyEntry).toBeDefined();
		expect(growthEntry).toBeDefined();
		if (!armyEntry || !growthEntry) {
			throw new Error('Expected stat entries for breakdown test');
		}
		const [armyStatKey] = armyEntry;
		const [growthStatKey] = growthEntry;
		const populationEntry = Object.entries(
			translationContext.assets.populations,
		).find(([, info]) => info.icon !== undefined);
		const roleId = populationEntry?.[0];
		const before: PlayerSnapshot = {
			resources: {},
			stats: {
				[armyStatKey]: 4,
				[growthStatKey]: 20,
			},
			population: {},
			buildings: [],
			lands: [],
			passives: [],
		};
		const after: PlayerSnapshot = {
			resources: {},
			stats: {
				[armyStatKey]: 5,
				[growthStatKey]: 20,
			},
			population: {},
			buildings: [],
			lands: [],
			passives: [],
		};
		const player: PlayerSnapshot = {
			resources: {},
			stats: {
				[armyStatKey]: 5,
				[growthStatKey]: 25,
			},
			population: {
				...(roleId ? { [roleId]: 2 } : {}),
			},
			buildings: [],
			lands: [],
			passives: [],
		};
		const raiseStrengthEffects: StepEffects = {
			effects: [
				{
					evaluator: {
						type: 'population',
						params: roleId ? { role: roleId } : {},
					},
					effects: [
						{
							type: 'stat',
							method: 'add_pct',
							params: {
								key: armyStatKey,
								percentStat: growthStatKey,
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
		);
		const statDescriptor = metadataSelectors.statMetadata.byId[armyStatKey];
		const statDisplay = selectStatDisplay(assets, armyStatKey);
		const label = statDescriptor?.label ?? statDisplay.label ?? armyStatKey;
		const line = changes.find((entry) => entry.includes(label));
		expect(line).toBeDefined();
		const roleDisplay = selectPopulationRoleDisplay(assets, roleId);
		const growthDisplay = selectStatDisplay(assets, growthStatKey);
		const armyIcon = statDisplay.icon ?? '';
		const breakdown = formatPercentBreakdown(
			armyIcon || '',
			formatStatValue(armyStatKey, before.stats[armyStatKey], assets),
			roleDisplay.icon ?? '',
			roleId ? (player.population[roleId] ?? 0) : 0,
			growthDisplay.icon ?? '',
			formatStatValue(growthStatKey, player.stats[growthStatKey], assets),
			formatStatValue(armyStatKey, after.stats[armyStatKey], assets),
		);
		expect(line?.endsWith(breakdown)).toBe(true);
	});

	it('falls back to stat identifiers when metadata is missing', () => {
		const { translationContext, metadataSelectors } = createTranslationAssets();
		const missingStatKey = 'synthetic:unknown-stat';
		const before: PlayerSnapshot = {
			resources: {},
			stats: {},
			population: {},
			buildings: [],
			lands: [],
			passives: [],
		};
		const after: PlayerSnapshot = {
			resources: {},
			stats: { [missingStatKey]: 3 },
			population: {},
			buildings: [],
			lands: [],
			passives: [],
		};
		const player: PlayerSnapshot = {
			resources: {},
			stats: {},
			population: {},
			buildings: [],
			lands: [],
			passives: [],
		};
		const step: StepEffects = { effects: [] };
		const changes: string[] = [];
		appendStatChanges(
			changes,
			before,
			after,
			player,
			step,
			translationContext.assets,
		);
		expect(metadataSelectors.statMetadata.byId[missingStatKey]).toBeUndefined();
		expect(changes).toContain(`${missingStatKey} +3 (0→3)`);
	});
});
