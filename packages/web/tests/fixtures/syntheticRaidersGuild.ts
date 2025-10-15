import { createContentFactory } from '@kingdom-builder/testing';
import type { EffectDef } from '@kingdom-builder/protocol';
import type {
	SessionPlayerId,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { createSessionRegistries } from '../helpers/sessionRegistries';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
	createTestMetadata,
} from '../helpers/sessionFixtures';
import { createTranslationContext } from '../../src/translation/context/createTranslationContext';
import type { TranslationContext } from '../../src/translation/context/types';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import {
	splitSummary,
	describeContent,
	type Summary,
} from '../../src/translation/content';

interface SyntheticIds {
	transferBuilding: string;
	populationBuilding: string;
	developmentBuilding: string;
	raidAction: string;
	ledgerAction: string;
	harvestDevelopment: string;
}

interface SyntheticContextMaps {
	actions: SessionRegistries['actions'];
	buildings: SessionRegistries['buildings'];
	developments: SessionRegistries['developments'];
	populations: SessionRegistries['populations'];
}

export interface RaidersGuildSyntheticContext {
	ctx: SyntheticContextMaps;
	translation: TranslationContext;
	ids: SyntheticIds;
}

const tierResourceKey = 'synthetic:tier';
const syntheticGoldKey = 'gold';

const SYNTHETIC_PHASES: SessionSnapshot['phases'] = [
	{
		id: 'phase:synthetic',
		label: 'Synthetic Phase',
		steps: [
			{
				id: 'phase:synthetic:step',
				title: 'Resolve Synthetic Effects',
			},
		],
	},
];

const buildRuleSnapshot = (): SessionRuleSnapshot => ({
	tieredResourceKey: tierResourceKey,
	tierDefinitions: [],
	winConditions: [],
});

const buildMetadata = (
	registries: SessionRegistries,
	resourceKey: string,
	populationId: string,
	buildingIds: string[],
	developmentId: string,
): SessionSnapshotMetadata => {
	const population = registries.populations.get(populationId);
	const development = registries.developments.get(developmentId);
	return createTestMetadata({
		resources: {
			[resourceKey]: {
				icon: '🪙',
				label: 'Synthetic Gold',
			},
		},
		populations: {
			[populationId]: {
				icon: population.icon,
				label: population.name ?? populationId,
			},
		},
		buildings: Object.fromEntries(
			buildingIds.map((id) => {
				const building = registries.buildings.get(id);
				return [
					id,
					{
						icon: building.icon,
						label: building.name ?? id,
					},
				];
			}),
		),
		developments: {
			[developmentId]: {
				icon: development.icon,
				label: development.name ?? developmentId,
			},
		},
		assets: {
			land: { label: 'Territory', icon: '🗺️' },
			slot: { label: 'Development Slot', icon: '🧩' },
			passive: { label: 'Passive', icon: '♾️' },
		},
	});
};

const createPlayers = () => {
	const active = createSnapshotPlayer({
		id: 'player:synthetic:active' as SessionPlayerId,
		name: 'Raiders Guild Leader',
		resources: { [syntheticGoldKey]: 10 },
	});
	const opponent = createSnapshotPlayer({
		id: 'player:synthetic:opponent' as SessionPlayerId,
		name: 'Ledger Master',
		resources: { [syntheticGoldKey]: 8 },
	});
	return { active, opponent };
};

export function createRaidersGuildContext(): RaidersGuildSyntheticContext {
	const content = createContentFactory();

	const raidAction = content.action({
		id: 'action:raid',
		name: 'Synthetic Raid',
		icon: '⚔️',
		effects: [
			{
				type: 'resource',
				method: 'add',
				params: { key: syntheticGoldKey, amount: 2 },
			},
		],
	});

	const ledgerAction = content.action({
		id: 'action:levy',
		name: 'Ledger Levy',
		icon: '📜',
	});

	const harvestDevelopment = content.development({
		id: 'development:farm',
		name: 'Hydroponic Farm',
		icon: '🌾',
	});

	const populationRole = content.population({
		id: 'population:ledger',
		name: 'Ledger Keepers',
		icon: '🧾',
	});

	const transferBuilding = content.building({
		id: 'building:transfer-annex',
		name: 'Transfer Annex',
		icon: '🏴',
		onBuild: [
			{
				type: 'result_mod',
				method: 'add',
				params: {
					id: 'modifier:transfer-bonus',
					evaluation: { type: 'transfer_pct', id: raidAction.id },
					adjust: 25,
				},
			},
		],
	});

	const populationBuilding = content.building({
		id: 'building:ledger-market',
		name: 'Ledger Market',
		icon: '🏪',
		onBuild: [
			{
				type: 'result_mod',
				method: 'add',
				params: {
					id: 'modifier:ledger-bonus',
					evaluation: { type: 'population', id: ledgerAction.id },
					amount: 1,
				},
			},
		],
	});

	const developmentBuilding = content.building({
		id: 'building:mill-foundry',
		name: 'Mill Foundry',
		icon: '⚙️',
		onBuild: [
			{
				type: 'result_mod',
				method: 'add',
				params: {
					id: 'modifier:mill-bonus',
					evaluation: { type: 'development', id: harvestDevelopment.id },
				},
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: { key: syntheticGoldKey, amount: 1 },
					},
				],
			},
		],
	});

	const registries = createSessionRegistries();
	registries.resources[syntheticGoldKey] = {
		key: syntheticGoldKey,
		icon: '🪙',
		label: 'Synthetic Gold',
	};
	registries.actions.add(raidAction.id, { ...raidAction });
	registries.actions.add(ledgerAction.id, { ...ledgerAction });
	registries.buildings.add(transferBuilding.id, { ...transferBuilding });
	registries.buildings.add(populationBuilding.id, { ...populationBuilding });
	registries.buildings.add(developmentBuilding.id, { ...developmentBuilding });
	registries.developments.add(harvestDevelopment.id, { ...harvestDevelopment });
	registries.populations.add(populationRole.id, { ...populationRole });

	const { active, opponent } = createPlayers();
	const metadata = buildMetadata(
		registries,
		syntheticGoldKey,
		populationRole.id,
		[transferBuilding.id, populationBuilding.id, developmentBuilding.id],
		harvestDevelopment.id,
	);
	const session = createSessionSnapshot({
		players: [active, opponent],
		activePlayerId: active.id,
		opponentId: opponent.id,
		phases: SYNTHETIC_PHASES,
		actionCostResource: syntheticGoldKey,
		ruleSnapshot: buildRuleSnapshot(),
		metadata,
	});
	const translation = createTranslationContext(
		session,
		registries,
		session.metadata,
		{
			ruleSnapshot: session.rules,
			passiveRecords: session.passiveRecords,
		},
	);

	return {
		ctx: {
			actions: registries.actions,
			buildings: registries.buildings,
			developments: registries.developments,
			populations: registries.populations,
		},
		translation,
		ids: {
			transferBuilding: transferBuilding.id,
			populationBuilding: populationBuilding.id,
			developmentBuilding: developmentBuilding.id,
			raidAction: raidAction.id,
			ledgerAction: ledgerAction.id,
			harvestDevelopment: harvestDevelopment.id,
		},
	};
}

export const SYNTHETIC_RESOURCE_TRANSFER_ICON = '🔁';

export function getModifier(
	ctx: RaidersGuildSyntheticContext['ctx'],
	buildingId: string,
): EffectDef {
	return (ctx.buildings.get(buildingId).onBuild?.[0] ?? {}) as EffectDef;
}

export function getResourceEffect(modifier: EffectDef): EffectDef {
	return (modifier.effects?.[0] ?? {}) as EffectDef;
}

export function getActionSummaryItems(
	translation: TranslationContext,
	actionId: string,
): Summary {
	const actionSplit = splitSummary(
		describeContent('action', actionId, translation),
	);
	return [
		...actionSplit.effects,
		...(actionSplit.description
			? [
					{
						title: 'Description',
						items: actionSplit.description,
					} as Summary[number],
				]
			: []),
	];
}

export function collectText(summary: Summary | undefined): string[] {
	if (!summary) {
		return [];
	}
	const lines: string[] = [];
	const visit = (entries: Summary) => {
		for (const entry of entries) {
			if (typeof entry === 'string') {
				lines.push(entry);
				continue;
			}
			if (Array.isArray(entry.items)) {
				visit(entry.items as Summary);
			}
		}
	};
	visit(summary);
	return lines;
}
