import { createEngine } from '@kingdom-builder/engine';
import type { EffectDef } from '@kingdom-builder/engine';
import type { PhaseDef, RuleSet, StartConfig } from '@kingdom-builder/protocol';
import {
	describeContent,
	splitSummary,
	type Summary,
} from '../../src/translation/content';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTranslationContextForEngine } from '../helpers/createTranslationContextForEngine';
import type { TranslationContext } from '../../src/translation/context/types';

interface SyntheticIds {
	transferBuilding: string;
	populationBuilding: string;
	developmentBuilding: string;
	raidAction: string;
	ledgerAction: string;
	harvestDevelopment: string;
}

export interface RaidersGuildSyntheticContext {
	ctx: ReturnType<typeof createEngine>;
	translation: TranslationContext;
	ids: SyntheticIds;
}

const tierResourceKey = 'synthetic:tier';
const syntheticGoldKey = 'gold';

const phases: PhaseDef[] = [
	{
		id: 'phase:synthetic',
		label: 'Synthetic',
		icon: '🧪',
		steps: [{ id: 'phase:synthetic:step' }],
	},
];

const start: StartConfig = {
	player: {
		resources: {
			[tierResourceKey]: 0,
			[syntheticGoldKey]: 0,
		},
		stats: {},
		population: {},
		lands: [],
	},
};

const rules: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: tierResourceKey,
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 1,
	winConditions: [],
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

	content.population({
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

	const ctx = createEngine({
		actions: content.actions,
		buildings: content.buildings,
		developments: content.developments,
		populations: content.populations,
		phases,
		start,
		rules,
	});

	const translation = createTranslationContextForEngine(ctx, (registries) => {
		const raid = ctx.actions.get(raidAction.id);
		const ledger = ctx.actions.get(ledgerAction.id);
		const transfer = ctx.buildings.get(transferBuilding.id);
		const population = ctx.buildings.get(populationBuilding.id);
		const development = ctx.buildings.get(developmentBuilding.id);
		const harvest = ctx.developments.get(harvestDevelopment.id);
		const ledgerRole = ctx.populations.get('population:ledger');
		registries.resources[syntheticGoldKey] = {
			key: syntheticGoldKey,
			icon: '🪙',
			label: 'Synthetic Gold',
		};
		if (raid) {
			registries.actions.add(raid.id, { ...raid });
		}
		if (ledger) {
			registries.actions.add(ledger.id, { ...ledger });
		}
		if (transfer) {
			registries.buildings.add(transfer.id, { ...transfer });
		}
		if (population) {
			registries.buildings.add(population.id, { ...population });
		}
		if (development) {
			registries.buildings.add(development.id, { ...development });
		}
		if (harvest) {
			registries.developments.add(harvest.id, { ...harvest });
		}
		if (ledgerRole) {
			registries.populations.add(ledgerRole.id, { ...ledgerRole });
		}
	});

	return {
		ctx,
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
	ctx: ReturnType<typeof createEngine>,
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
