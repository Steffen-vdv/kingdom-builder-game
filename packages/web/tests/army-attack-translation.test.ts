/* eslint-disable max-lines */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
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
} from '@kingdom-builder/engine';
import type { EffectDef, StartConfig } from '@kingdom-builder/protocol';
import {
	RESOURCES,
	STATS,
	BUILDINGS,
	Resource as ContentResource,
	Stat as ContentStat,
	type StatKey,
} from '@kingdom-builder/contents';
import {
	formatNumber,
	formatPercent,
} from '../src/translation/effects/formatters/attack/shared';
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
const SYNTH_PARTIAL_ATTACK_ID = 'synthetic:partial_attack';
const SYNTH_PARTIAL_ATTACK_NAME = 'Partial Assault';
const SYNTH_PARTIAL_ATTACK_ICON = '🗡️';

const ATTACKER_HAPPINESS_GAIN = 2;
const DEFENDER_HAPPINESS_LOSS = 3;
const WAR_WEARINESS_GAIN = 4;
const BUILDING_REWARD_GOLD = 6;
const PLUNDER_PERCENT = 40;

const TIER_RESOURCE_KEY = 'synthetic:tier';

const SYNTH_POWER_STAT_KEY = 'synthetic:valor';
const SYNTH_ABSORPTION_STAT_KEY = 'synthetic:veil';
const SYNTH_FORT_STAT_KEY = 'synthetic:rampart';
const SYNTH_POWER_ICON = '⚔️';
const SYNTH_POWER_LABEL = 'Valor';
const SYNTH_ABSORPTION_ICON = '🌫️';
const SYNTH_ABSORPTION_LABEL = 'Veil';
const SYNTH_FORT_ICON = '🧱';
const SYNTH_FORT_LABEL = 'Rampart';

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
						.powerStat(SYNTH_POWER_STAT_KEY as unknown as StatKey)
						.absorptionStat(SYNTH_ABSORPTION_STAT_KEY as unknown as StatKey)
						.fortificationStat(SYNTH_FORT_STAT_KEY as unknown as StatKey)
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
						.powerStat(SYNTH_POWER_STAT_KEY as unknown as StatKey)
						.absorptionStat(SYNTH_ABSORPTION_STAT_KEY as unknown as StatKey)
						.fortificationStat(SYNTH_FORT_STAT_KEY as unknown as StatKey)
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

function createPartialStatCtx() {
	const factory = createContentFactory();
	const attack = factory.action({
		id: SYNTH_PARTIAL_ATTACK_ID,
		name: SYNTH_PARTIAL_ATTACK_NAME,
		icon: SYNTH_PARTIAL_ATTACK_ICON,
		baseCosts: { [ContentResource.ap]: 0 },
		effects: [
			effect('attack', 'perform')
				.params(
					attackParams()
						.powerStat(SYNTH_POWER_STAT_KEY as unknown as StatKey)
						.targetResource(ContentResource.castleHP)
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

	return { ctx, attack } as const;
}

function iconLabel(
	icon: string | undefined,
	label: string | undefined,
	fallback: string,
) {
	const resolved = label ?? fallback;
	return icon ? `${icon} ${resolved}` : resolved;
}

type StatInfo = (typeof STATS)[keyof typeof STATS];

const STAT_OVERRIDES: Array<{
	key: string;
	icon: string;
	label: string;
	base: StatInfo;
}> = [
	{
		key: SYNTH_POWER_STAT_KEY,
		icon: SYNTH_POWER_ICON,
		label: SYNTH_POWER_LABEL,
		base: STATS[Stat.armyStrength],
	},
	{
		key: SYNTH_ABSORPTION_STAT_KEY,
		icon: SYNTH_ABSORPTION_ICON,
		label: SYNTH_ABSORPTION_LABEL,
		base: STATS[Stat.absorption],
	},
	{
		key: SYNTH_FORT_STAT_KEY,
		icon: SYNTH_FORT_ICON,
		label: SYNTH_FORT_LABEL,
		base: STATS[Stat.fortificationStrength],
	},
];

const originalStatEntries = new Map<string, StatInfo | undefined>();

beforeAll(() => {
	for (const override of STAT_OVERRIDES) {
		originalStatEntries.set(
			override.key,
			(STATS as Record<string, StatInfo | undefined>)[override.key],
		);
		(STATS as Record<string, StatInfo>)[override.key] = {
			...override.base,
			icon: override.icon,
			label: override.label,
		};
	}
});

afterAll(() => {
	for (const override of STAT_OVERRIDES) {
		const original = originalStatEntries.get(override.key);
		if (original) {
			(STATS as Record<string, StatInfo | undefined>)[override.key] = original;
		} else {
			delete (STATS as Record<string, StatInfo | undefined>)[override.key];
		}
	}
	originalStatEntries.clear();
});

function statToken(
	stat: StatInfo | undefined,
	fallback: string,
	value: string,
): string {
	if (stat?.icon) {
		return `${stat.icon}${value}`;
	}
	if (stat?.label) {
		return `${stat.label} ${value}`;
	}
	return `${fallback} ${value}`;
}

function getStat(key: string): StatInfo | undefined {
	return (STATS as Record<string, StatInfo | undefined>)[key];
}

describe('army attack translation', () => {
	it('summarizes attack action with on-damage effects', () => {
		const { ctx, attack, plunder } = createSyntheticCtx();
		const castle = RESOURCES[Resource.castleHP];
		const powerStat = getStat(SYNTH_POWER_STAT_KEY)!;
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
		const targetDisplay = iconLabel(castle.icon, castle.label, castle.id);
		expect(summary).toEqual([
			`${powerStat.icon ?? powerStat.label} vs opponent's ${targetDisplay}`,
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
		const powerStat = getStat(SYNTH_POWER_STAT_KEY)!;
		const absorptionStat = getStat(SYNTH_ABSORPTION_STAT_KEY)!;
		const fortStat = getStat(SYNTH_FORT_STAT_KEY)!;
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
		const powerValue = (value: number) =>
			statToken(powerStat, 'Attack', formatNumber(value));
		const absorptionValue = (value: number) =>
			statToken(absorptionStat, 'Absorption', formatPercent(value));
		const fortValue = (value: number) =>
			statToken(fortStat, 'Fortification', formatNumber(value));
		const castleValue = `${castle.icon}${castleBefore}`;
		const castleAfterValue = `${castle.icon}${castleAfter}`;
		expect(log).toEqual([
			`Played ${attack.icon} ${attack.name}`,
			`  Damage evaluation: ${powerValue(armyStrength)} vs. ${absorptionValue(0)} ${fortValue(fortBefore)} ${castleValue}`,
			`    ${powerValue(armyStrength)} vs. ${absorptionValue(0)} --> ${powerValue(remainingAfterAbsorption)}`,
			`    ${powerValue(remainingAfterAbsorption)} vs. ${fortValue(fortBefore)} --> ${fortValue(0)} ${powerValue(remainingAfterFort)}`,
			`    ${powerValue(remainingAfterFort)} vs. ${castleValue} --> ${castleAfterValue}`,
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

	it('falls back to generic labels when combat stat descriptors are omitted', () => {
		const { ctx, attack } = createPartialStatCtx();
		const castle = RESOURCES[Resource.castleHP];
		const powerStat = getStat(SYNTH_POWER_STAT_KEY)!;
		const targetDisplay = iconLabel(castle.icon, castle.label, castle.id);

		const summary = summarizeContent('action', attack.id, ctx);
		expect(summary).toEqual([
			`${powerStat.icon ?? powerStat.label} vs opponent's ${targetDisplay}`,
		]);

		const description = describeContent('action', attack.id, ctx);
		expect(description).toEqual([
			{
				title: `Attack opponent with your ${iconLabel(powerStat.icon, powerStat.label, 'attack power')}`,
				items: [
					'Damage reduction applied',
					`Damage applied to opponent's defenses`,
					`If opponent defenses fall, overflow remaining damage on opponent ${targetDisplay}`,
				],
			},
		]);

		ctx.activePlayer.stats[Stat.armyStrength] = 4;
		ctx.opponent.stats[Stat.fortificationStrength] = 1;
		const castleBefore = ctx.opponent.resources[Resource.castleHP];
		const fortBefore = ctx.opponent.stats[Stat.fortificationStrength];

		performAction(attack.id, ctx);

		const log = logContent('action', attack.id, ctx);
		const castleAfter = ctx.opponent.resources[Resource.castleHP];
		const armyStrength = ctx.activePlayer.stats[Stat.armyStrength];
		const remainingAfterAbsorption = armyStrength;
		const remainingAfterFort = Math.max(
			remainingAfterAbsorption - fortBefore,
			0,
		);
		const powerValue = (value: number) =>
			statToken(powerStat, 'Attack', formatNumber(value));
		const absorptionValue = (value: number) =>
			`Absorption ${formatPercent(value)}`;
		const fortValue = (value: number) => `Fortification ${formatNumber(value)}`;
		const targetValue = (value: number) =>
			`${castle.icon}${formatNumber(value)}`;

		expect(log).toEqual([
			`Played ${attack.icon} ${attack.name}`,
			`  Damage evaluation: ${powerValue(armyStrength)} vs. ${absorptionValue(0)} ${fortValue(fortBefore)} ${targetValue(castleBefore)}`,
			`    ${powerValue(armyStrength)} vs. ${absorptionValue(0)} --> ${powerValue(remainingAfterAbsorption)}`,
			`    ${powerValue(remainingAfterAbsorption)} vs. ${fortValue(fortBefore)} --> ${fortValue(0)} ${powerValue(remainingAfterFort)}`,
			`    ${powerValue(remainingAfterFort)} vs. ${targetValue(castleBefore)} --> ${targetValue(castleAfter)}`,
		]);
	});

	it('summarizes building attack as destruction', () => {
		const { ctx, buildingAttack, building } = createSyntheticCtx();
		const powerStat = getStat(SYNTH_POWER_STAT_KEY)!;
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
			`${powerStat.icon ?? powerStat.label} destroy opponent's ${buildingDisplay}`,
			{
				title: summaryTitle,
				items: [`${gold.icon}+${rewardAmount} for you`],
			},
		]);
	});

	it('logs building attack action with destruction evaluation', () => {
		const { ctx, buildingAttack, building } = createSyntheticCtx();
		const powerStat = getStat(SYNTH_POWER_STAT_KEY)!;
		const absorptionStat = getStat(SYNTH_ABSORPTION_STAT_KEY)!;
		const fortStat = getStat(SYNTH_FORT_STAT_KEY)!;
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
		const powerValue = (value: number) =>
			statToken(powerStat, 'Attack', formatNumber(value));
		const absorptionValue = (value: number) =>
			statToken(absorptionStat, 'Absorption', formatPercent(value));
		const fortValue = (value: number) =>
			statToken(fortStat, 'Fortification', formatNumber(value));
		expect(log).toEqual([
			`Played ${buildingAttack.icon} ${buildingAttack.name}`,
			`  Damage evaluation: ${powerValue(armyStrength)} vs. ${absorptionValue(0)} ${fortValue(fortBefore)} ${buildingDisplay}`,
			`    ${powerValue(armyStrength)} vs. ${absorptionValue(0)} --> ${powerValue(remainingAfterAbsorption)}`,
			`    ${powerValue(remainingAfterAbsorption)} vs. ${fortValue(fortBefore)} --> ${fortValue(0)} ${powerValue(remainingAfterFort)}`,
			`    ${powerValue(remainingAfterFort)} destroys ${buildingDisplay}`,
			`  ${buildingDisplay} destruction trigger evaluation`,
			`    You: ${gold.icon} ${gold.label} ${
				playerGoldDelta >= 0 ? '+' : ''
			}${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
		]);
	});
});
