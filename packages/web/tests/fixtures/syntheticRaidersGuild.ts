import { createEngine } from '@kingdom-builder/engine';
import type { EffectDef } from '@kingdom-builder/engine';
import type { PhaseDef } from '@kingdom-builder/engine/phases';
import type { StartConfig } from '@kingdom-builder/protocol';
import type { RuleSet } from '@kingdom-builder/engine/services';
import { Resource } from '@kingdom-builder/contents';
import {
	describeContent,
	splitSummary,
	type Summary,
} from '../../src/translation/content';
import { createContentFactory } from '../../../engine/tests/factories/content';

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
	ids: SyntheticIds;
}

const tierResourceKey = 'synthetic:tier';

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
			[Resource.gold]: 0,
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
				params: { key: Resource.gold, amount: 2 },
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
						params: { key: Resource.gold, amount: 1 },
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

	return {
		ctx,
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
	ctx: ReturnType<typeof createEngine>,
	actionId: string,
): Summary {
	const actionSplit = splitSummary(describeContent('action', actionId, ctx));
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
