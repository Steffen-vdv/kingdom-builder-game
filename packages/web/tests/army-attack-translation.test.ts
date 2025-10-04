/* eslint-disable max-lines */
import { describe, it, expect, vi } from 'vitest';
import type { SummaryEntry } from '../src/translation/content';
import {
	summarizeContent,
	describeContent,
	logContent,
} from '../src/translation/content';
import {
	createEngine,
	performAction,
	Resource,
	Stat,
	type EffectDef,
} from '@kingdom-builder/engine';
import {
	RESOURCES,
	STATS,
	BUILDINGS,
	Resource as ContentResource,
	Stat as ContentStat,
} from '@kingdom-builder/contents';
import {
	effect,
	Types,
	ResourceMethods,
	ActionMethods,
	StatMethods,
	attackParams,
	resourceParams,
	transferParams,
	statParams,
} from '@kingdom-builder/contents/config/builders';
import { createContentFactory } from '../../engine/tests/factories/content';
import type { PhaseDef } from '@kingdom-builder/engine/phases';
import type { StartConfig } from '@kingdom-builder/engine/config/schema';
import type { RuleSet } from '@kingdom-builder/engine/services';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const SYNTH_ATTACK_ID = 'synthetic:army_attack';
const SYNTH_ATTACK_NAME = 'Synthetic Assault';
const SYNTH_ATTACK_ICON = '🛡️';
const SYNTH_PLUNDER_ID = 'synthetic:plunder';
const SYNTH_PLUNDER_NAME = 'Synthetic Plunder';
const SYNTH_PLUNDER_ICON = '💰';
const SYNTH_BUILDING_ID = 'synthetic:stronghold';
const SYNTH_BUILDING_NAME = 'Training Stronghold';
const SYNTH_BUILDING_ICON = '🏯';
const SYNTH_BUILDING_ATTACK_ID = 'synthetic:building_attack';
const SYNTH_BUILDING_ATTACK_NAME = 'Raze Stronghold';
const SYNTH_BUILDING_ATTACK_ICON = '🔥';

const ATTACKER_HAPPINESS_GAIN = 2;
const DEFENDER_HAPPINESS_LOSS = 3;
const WAR_WEARINESS_GAIN = 4;
const BUILDING_REWARD_GOLD = 6;
const PLUNDER_PERCENT = 40;

const TIER_RESOURCE_KEY = 'synthetic:tier';

const PHASES: PhaseDef[] = [
	{
		id: 'phase:action',
		label: 'Action',
		icon: '🎲',
		steps: [{ id: 'phase:action:step', label: 'Resolve' }],
	},
];

const START: StartConfig = {
	player: {
		resources: {
			[ContentResource.ap]: 0,
			[ContentResource.gold]: 0,
			[ContentResource.happiness]: 0,
			[ContentResource.castleHP]: 12,
		},
		stats: {
			[ContentStat.armyStrength]: 0,
			[ContentStat.absorption]: 0,
			[ContentStat.fortificationStrength]: 0,
			[ContentStat.warWeariness]: 0,
		},
		population: {},
		lands: [],
	},
};

const RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'down',
	tieredResourceKey: TIER_RESOURCE_KEY,
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 1,
};

function createSyntheticCtx() {
	const factory = createContentFactory();
	const building = factory.building({
		id: SYNTH_BUILDING_ID,
		name: SYNTH_BUILDING_NAME,
		icon: SYNTH_BUILDING_ICON,
	});
	BUILDINGS.add(building.id, building);
	const plunder = factory.action({
		id: SYNTH_PLUNDER_ID,
		name: SYNTH_PLUNDER_NAME,
		icon: SYNTH_PLUNDER_ICON,
		system: true,
		effects: [
			effect(Types.Resource, ResourceMethods.TRANSFER)
				.params(
					transferParams().key(ContentResource.gold).percent(PLUNDER_PERCENT),
				)
				.build(),
		],
	});
	const attack = factory.action({
		id: SYNTH_ATTACK_ID,
		name: SYNTH_ATTACK_NAME,
		icon: SYNTH_ATTACK_ICON,
		baseCosts: { [ContentResource.ap]: 1 },
		effects: [
			effect('attack', 'perform')
				.params(
					attackParams()
						.targetResource(ContentResource.castleHP)
						.onDamageAttacker(
							effect(Types.Resource, ResourceMethods.ADD)
								.params(
									resourceParams()
										.key(ContentResource.happiness)
										.amount(ATTACKER_HAPPINESS_GAIN),
								)
								.build(),
							effect(Types.Action, ActionMethods.PERFORM)
								.param('id', SYNTH_PLUNDER_ID)
								.build(),
						)
						.onDamageDefender(
							effect(Types.Resource, ResourceMethods.REMOVE)
								.params(
									resourceParams()
										.key(ContentResource.happiness)
										.amount(DEFENDER_HAPPINESS_LOSS),
								)
								.build(),
						)
						.build(),
				)
				.build(),
			effect(Types.Stat, StatMethods.ADD)
				.params(
					statParams().key(ContentStat.warWeariness).amount(WAR_WEARINESS_GAIN),
				)
				.build(),
		],
	});
	const buildingAttack = factory.action({
		id: SYNTH_BUILDING_ATTACK_ID,
		name: SYNTH_BUILDING_ATTACK_NAME,
		icon: SYNTH_BUILDING_ATTACK_ICON,
		baseCosts: { [ContentResource.ap]: 1 },
		effects: [
			effect('attack', 'perform')
				.params(
					attackParams()
						.targetBuilding(SYNTH_BUILDING_ID)
						.onDamageAttacker(
							effect(Types.Resource, ResourceMethods.ADD)
								.params(
									resourceParams()
										.key(ContentResource.gold)
										.amount(BUILDING_REWARD_GOLD),
								)
								.build(),
						)
						.build(),
				)
				.build(),
		],
	});

	const ctx = createEngine({
		actions: factory.actions,
		buildings: factory.buildings,
		developments: factory.developments,
		populations: factory.populations,
		phases: PHASES,
		start: START,
		rules: RULES,
	});

	return { ctx, attack, plunder, building, buildingAttack } as const;
}

function iconLabel(
	icon: string | undefined,
	label: string | undefined,
	fallback: string,
) {
	const resolved = label ?? fallback;
	return icon ? `${icon} ${resolved}` : resolved;
}

describe('army attack translation', () => {
	it('summarizes attack action with on-damage effects', () => {
		const { ctx, attack, plunder } = createSyntheticCtx();
		const castle = RESOURCES[Resource.castleHP];
		const army = STATS[Stat.armyStrength];
		const fort = STATS[Stat.fortificationStrength];
		const happiness = RESOURCES[Resource.happiness];
		const warWeariness = STATS[Stat.warWeariness];
		const attackEffect = attack.effects.find(
			(e: EffectDef) => e.type === 'attack',
		);
		const onDamage = (attackEffect?.params?.['onDamage'] ?? {}) as {
			attacker?: EffectDef[];
			defender?: EffectDef[];
		};
		const attackerRes = (onDamage.attacker ?? []).find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === ContentResource.happiness,
		);
		const defenderRes = (onDamage.defender ?? []).find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === ContentResource.happiness,
		);
		const attackerAmtRaw =
			(attackerRes?.params as { amount?: number })?.amount ?? 0;
		const defenderAmtRaw =
			(defenderRes?.params as { amount?: number })?.amount ?? 0;
		const attackerAmt =
			attackerRes?.method === ResourceMethods.REMOVE
				? -attackerAmtRaw
				: attackerAmtRaw;
		const defenderAmt =
			defenderRes?.method === ResourceMethods.REMOVE
				? -defenderAmtRaw
				: defenderAmtRaw;
		const warRes = attack.effects.find(
			(e: EffectDef) =>
				e.type === 'stat' &&
				(e.params as { key?: string }).key === ContentStat.warWeariness,
		);
		const warAmt = (warRes?.params as { amount?: number })?.amount ?? 0;
		const summary = summarizeContent('action', attack.id, ctx);
		expect(summary).toEqual([
			`${army.icon} opponent's ${fort.icon}${castle.icon}`,
			{
				title: `On opponent ${castle.icon} damage`,
				items: [
					`${happiness.icon}${defenderAmt} for opponent`,
					`${happiness.icon}${attackerAmt >= 0 ? '+' : ''}${attackerAmt} for you`,
					`${plunder.icon} ${plunder.name}`,
				],
			},
			`${warWeariness.icon}${warAmt >= 0 ? '+' : ''}${warAmt}`,
		]);
	});

	it('describes plunder effects under on-damage entry', () => {
		const { ctx, plunder } = createSyntheticCtx();
		const desc = describeContent('action', SYNTH_ATTACK_ID, ctx);
		const onDamage = desc.find(
			(e) =>
				typeof e === 'object' &&
				'title' in e &&
				e.title.startsWith('On opponent'),
		) as { items: SummaryEntry[] };
		const plunderEntry = onDamage.items.find(
			(i) =>
				typeof i === 'object' &&
				(i as { title: string }).title === `${plunder.icon} ${plunder.name}`,
		) as { items?: unknown[] } | undefined;
		expect(plunderEntry).toBeDefined();
		expect(
			plunderEntry &&
				Array.isArray(plunderEntry.items) &&
				(plunderEntry.items?.length ?? 0) > 0,
		).toBeTruthy();
	});

	it('logs army attack action with concrete evaluation', () => {
		const { ctx, attack, plunder } = createSyntheticCtx();
		const castle = RESOURCES[Resource.castleHP];
		const army = STATS[Stat.armyStrength];
		const absorption = STATS[Stat.absorption];
		const fort = STATS[Stat.fortificationStrength];
		const happiness = RESOURCES[Resource.happiness];
		const gold = RESOURCES[Resource.gold];

		ctx.activePlayer.resources[Resource.ap] = 1;
		ctx.activePlayer.stats[Stat.armyStrength] = 2;
		ctx.activePlayer.resources[Resource.happiness] = 2;
		ctx.activePlayer.resources[Resource.gold] = 7;
		ctx.opponent.stats[Stat.fortificationStrength] = 1;
		ctx.opponent.resources[Resource.happiness] = 5;
		ctx.opponent.resources[Resource.gold] = 25;
		const castleBefore = ctx.opponent.resources[Resource.castleHP];
		const fortBefore = ctx.opponent.stats[Stat.fortificationStrength];
		const armyStrength = ctx.activePlayer.stats[Stat.armyStrength];
		const opponentHappinessBefore = ctx.opponent.resources[Resource.happiness];
		const attackerHappinessBefore =
			ctx.activePlayer.resources[Resource.happiness];
		const opponentGoldBefore = ctx.opponent.resources[Resource.gold];
		const playerGoldBefore = ctx.activePlayer.resources[Resource.gold];
		const remainingAfterAbsorption = armyStrength;
		const remainingAfterFort = Math.max(
			remainingAfterAbsorption - fortBefore,
			0,
		);

		performAction(attack.id, ctx);
		const castleAfter = ctx.opponent.resources[Resource.castleHP];
		const opponentHappinessAfter = ctx.opponent.resources[Resource.happiness];
		const attackerHappinessAfter =
			ctx.activePlayer.resources[Resource.happiness];
		const opponentGoldAfter = ctx.opponent.resources[Resource.gold];
		const playerGoldAfter = ctx.activePlayer.resources[Resource.gold];
		const opponentHappinessDelta =
			opponentHappinessAfter - opponentHappinessBefore;
		const attackerHappinessDelta =
			attackerHappinessAfter - attackerHappinessBefore;
		const opponentGoldDelta = opponentGoldAfter - opponentGoldBefore;
		const playerGoldDelta = playerGoldAfter - playerGoldBefore;

		const log = logContent('action', attack.id, ctx);
		expect(log).toEqual([
			`Played ${attack.icon} ${attack.name}`,
			`  Damage evaluation: ${army.icon}${armyStrength} vs. ${absorption.icon}0% ${fort.icon}${fortBefore} ${castle.icon}${castleBefore}`,
			`    ${army.icon}${armyStrength} vs. ${absorption.icon}0% --> ${army.icon}${remainingAfterAbsorption}`,
			`    ${army.icon}${remainingAfterAbsorption} vs. ${fort.icon}${fortBefore} --> ${fort.icon}0 ${army.icon}${remainingAfterFort}`,
			`    ${army.icon}${remainingAfterFort} vs. ${castle.icon}${castleBefore} --> ${castle.icon}${castleAfter}`,
			`  ${castle.icon} ${castle.label} damage trigger evaluation`,
			`    Opponent: ${happiness.icon} ${happiness.label} ${opponentHappinessDelta} (${opponentHappinessBefore}→${opponentHappinessAfter})`,
			`    You: ${happiness.icon} ${happiness.label} ${
				attackerHappinessDelta >= 0 ? '+' : ''
			}${attackerHappinessDelta} (${attackerHappinessBefore}→${attackerHappinessAfter})`,
			`    Triggered ${plunder.icon} ${plunder.name}`,
			`      Opponent: ${gold.icon} ${gold.label} -${PLUNDER_PERCENT}% (${opponentGoldBefore}→${opponentGoldAfter}) (${opponentGoldDelta})`,
			`      You: ${gold.icon} ${gold.label} ${
				playerGoldDelta >= 0 ? '+' : ''
			}${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
		]);
	});

	it('summarizes building attack as destruction', () => {
		const { ctx, buildingAttack, building } = createSyntheticCtx();
		const army = STATS[Stat.armyStrength];
		const gold = RESOURCES[Resource.gold];
		const buildingDisplay = iconLabel(
			building.icon,
			building.name,
			building.id,
		);
		const summaryTitle = building.icon
			? `On opponent ${building.icon} destruction`
			: `On opponent ${building.name ?? building.id} destruction`;
		const attackEffect = buildingAttack.effects.find(
			(e: EffectDef) => e.type === 'attack',
		);
		const onDamage = (attackEffect?.params?.['onDamage'] ?? {}) as {
			attacker?: EffectDef[];
		};
		const rewardEffect = (onDamage.attacker ?? []).find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === ContentResource.gold,
		);
		const rewardAmount =
			(rewardEffect?.params as { amount?: number })?.amount ?? 0;

		const summary = summarizeContent('action', buildingAttack.id, ctx);
		expect(summary).toEqual([
			`${army.icon} destroy opponent's ${buildingDisplay}`,
			{
				title: summaryTitle,
				items: [`${gold.icon}+${rewardAmount} for you`],
			},
		]);
	});

	it('logs building attack action with destruction evaluation', () => {
		const { ctx, buildingAttack, building } = createSyntheticCtx();
		const army = STATS[Stat.armyStrength];
		const absorption = STATS[Stat.absorption];
		const fort = STATS[Stat.fortificationStrength];
		const gold = RESOURCES[Resource.gold];
		const buildingDisplay = iconLabel(
			building.icon,
			building.name,
			building.id,
		);

		ctx.activePlayer.resources[Resource.ap] = 1;
		ctx.activePlayer.stats[Stat.armyStrength] = 3;
		ctx.activePlayer.resources[Resource.gold] = 0;
		ctx.opponent.stats[Stat.fortificationStrength] = 1;
		ctx.opponent.buildings.add(building.id);
		const armyStrength = ctx.activePlayer.stats[Stat.armyStrength];
		const fortBefore = ctx.opponent.stats[Stat.fortificationStrength];
		const remainingAfterAbsorption = armyStrength;
		const remainingAfterFort = Math.max(
			remainingAfterAbsorption - fortBefore,
			0,
		);
		const playerGoldBefore = ctx.activePlayer.resources[Resource.gold];

		performAction(buildingAttack.id, ctx);
		const playerGoldAfter = ctx.activePlayer.resources[Resource.gold];
		const playerGoldDelta = playerGoldAfter - playerGoldBefore;
		const log = logContent('action', buildingAttack.id, ctx);
		expect(log).toEqual([
			`Played ${buildingAttack.icon} ${buildingAttack.name}`,
			`  Damage evaluation: ${army.icon}${armyStrength} vs. ${absorption.icon}0% ${fort.icon}${fortBefore} ${buildingDisplay}`,
			`    ${army.icon}${armyStrength} vs. ${absorption.icon}0% --> ${army.icon}${remainingAfterAbsorption}`,
			`    ${army.icon}${remainingAfterAbsorption} vs. ${fort.icon}${fortBefore} --> ${fort.icon}0 ${army.icon}${remainingAfterFort}`,
			`    ${army.icon}${remainingAfterFort} destroys ${buildingDisplay}`,
			`  ${buildingDisplay} destruction trigger evaluation`,
			`    You: ${gold.icon} ${gold.label} ${
				playerGoldDelta >= 0 ? '+' : ''
			}${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
		]);
	});
});
