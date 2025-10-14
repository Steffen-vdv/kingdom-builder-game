import { createContentFactory } from '@kingdom-builder/testing';
import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	EffectDef,
} from '@kingdom-builder/protocol';
import type { TranslationContext } from '../../src/translation/context/types';
import {
	describeContent,
	splitSummary,
	type Summary,
} from '../../src/translation/content';
import { buildSyntheticTranslationContext } from '../helpers/createSyntheticTranslationContext';
import type { SessionRegistries } from '../../src/state/sessionRegistries';
import type { SessionSnapshot } from '@kingdom-builder/protocol/session';

interface SyntheticIds {
	transferBuilding: string;
	populationBuilding: string;
	developmentBuilding: string;
	raidAction: string;
	ledgerAction: string;
	harvestDevelopment: string;
}

interface SyntheticContextMaps {
	actions: { get(id: string): ActionConfig };
	buildings: { get(id: string): BuildingConfig };
	developments: { get(id: string): DevelopmentConfig };
}

export interface RaidersGuildSyntheticContext {
	ctx: SyntheticContextMaps;
	translation: TranslationContext;
	registries: SessionRegistries;
	session: SessionSnapshot;
	ids: SyntheticIds;
}

const syntheticGoldKey = 'gold';

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

	const ledgerRole = content.population({
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

	const synthetic = buildSyntheticTranslationContext(
		({ session, registries, metadata }) => {
			registries.actions.add(raidAction.id, structuredClone(raidAction));
			registries.actions.add(ledgerAction.id, structuredClone(ledgerAction));
			registries.buildings.add(
				transferBuilding.id,
				structuredClone(transferBuilding),
			);
			registries.buildings.add(
				populationBuilding.id,
				structuredClone(populationBuilding),
			);
			registries.buildings.add(
				developmentBuilding.id,
				structuredClone(developmentBuilding),
			);
			registries.developments.add(
				harvestDevelopment.id,
				structuredClone(harvestDevelopment),
			);
			registries.populations.add(ledgerRole.id, structuredClone(ledgerRole));
			registries.resources[syntheticGoldKey] = {
				key: syntheticGoldKey,
				icon: '🪙',
				label: 'Synthetic Gold',
			};

			metadata.resources = {
				...(metadata.resources ?? {}),
				[syntheticGoldKey]: {
					icon: '🪙',
					label: 'Synthetic Gold',
				},
			};
			metadata.buildings = {
				...(metadata.buildings ?? {}),
				[transferBuilding.id]: {
					icon: transferBuilding.icon,
					label: transferBuilding.name,
				},
				[populationBuilding.id]: {
					icon: populationBuilding.icon,
					label: populationBuilding.name,
				},
				[developmentBuilding.id]: {
					icon: developmentBuilding.icon,
					label: developmentBuilding.name,
				},
			};
			metadata.developments = {
				...(metadata.developments ?? {}),
				[harvestDevelopment.id]: {
					icon: harvestDevelopment.icon,
					label: harvestDevelopment.name,
				},
			};
			metadata.populations = {
				...(metadata.populations ?? {}),
				[ledgerRole.id]: {
					icon: ledgerRole.icon,
					label: ledgerRole.name,
				},
			};

			const [active, opponent] = session.game.players;
			if (active) {
				active.actions = [raidAction.id, ledgerAction.id];
				active.buildings = [transferBuilding.id, populationBuilding.id];
				active.lands = [
					{
						id: 'land:synthetic:home',
						slotsMax: 1,
						slotsUsed: 0,
						developments: [harvestDevelopment.id],
					},
				];
			}
			if (opponent) {
				opponent.actions = [];
			}
		},
	);

	const ctx: SyntheticContextMaps = {
		actions: {
			get(id: string) {
				return synthetic.registries.actions.get(id);
			},
		},
		buildings: {
			get(id: string) {
				return synthetic.registries.buildings.get(id);
			},
		},
		developments: {
			get(id: string) {
				return synthetic.registries.developments.get(id);
			},
		},
	};

	return {
		ctx,
		translation: synthetic.translationContext,
		registries: synthetic.registries,
		session: synthetic.session,
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
	ctx: SyntheticContextMaps,
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
