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
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	RESOURCES,
	STATS,
	PopulationRole,
} from '@kingdom-builder/contents';
import {
	action,
	effect,
	Types,
	ResourceMethods,
	attackParams,
	resourceParams,
} from '@kingdom-builder/contents/config/builders';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createCtx() {
	return createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});
}

function pickBuilding() {
	const entries = BUILDINGS.entries();
	const selected =
		entries.find(([, def]) => def.icon && def.name) ?? entries[0];
	if (!selected) throw new Error('Expected at least one building definition');
	const [id, def] = selected;
	return { id, def } as const;
}

function iconLabel(
	icon: string | undefined,
	label: string | undefined,
	fallback: string,
) {
	const resolved = label ?? fallback;
	return icon ? `${icon} ${resolved}` : resolved;
}

function createBuildingAttackCtx() {
	const { id: buildingId, def: building } = pickBuilding();
	const attack = {
		...action()
			.id('siege_building')
			.name('Siege Building')
			.icon('⚔️')
			.cost(Resource.ap, 1)
			.effect(
				effect('attack', 'perform')
					.params(
						attackParams()
							.targetBuilding(buildingId)
							.onDamageAttacker(
								effect(Types.Resource, ResourceMethods.ADD)
									.params(resourceParams().key(Resource.gold).amount(1))
									.build(),
							)
							.build(),
					)
					.build(),
			)
			.build(),
	};

	const ctx = createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
		config: { actions: [attack] },
	});

	return { ctx, attack, buildingId, building } as const;
}

describe('army attack translation', () => {
	it('summarizes attack action with on-damage effects', () => {
		const ctx = createCtx();
		const castle = RESOURCES[Resource.castleHP];
		const army = STATS[Stat.armyStrength];
		const fort = STATS[Stat.fortificationStrength];
		const happiness = RESOURCES[Resource.happiness];
		const plunder = ctx.actions.get('plunder');
		const warWeariness = STATS[Stat.warWeariness];
		const armyAttack = ctx.actions.get('army_attack');
		const attackEffect = armyAttack.effects.find(
			(e: EffectDef) => e.type === 'attack',
		);
		const onDamage = attackEffect?.params?.['onDamage'] as {
			attacker: EffectDef[];
			defender: EffectDef[];
		};
		const attackerRes = onDamage?.attacker.find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === Resource.happiness,
		);
		const defenderRes = onDamage?.defender.find(
			(e: EffectDef) =>
				e.type === 'resource' &&
				(e.params as { key?: string }).key === Resource.happiness,
		);
		const attackerAmtRaw =
			(attackerRes?.params as { amount?: number })?.amount ?? 0;
		const defenderAmtRaw =
			(defenderRes?.params as { amount?: number })?.amount ?? 0;
		const attackerAmt =
			attackerRes?.method === 'remove' ? -attackerAmtRaw : attackerAmtRaw;
		const defenderAmt =
			defenderRes?.method === 'remove' ? -defenderAmtRaw : defenderAmtRaw;
		const warRes = armyAttack.effects.find(
			(e: EffectDef) =>
				e.type === 'stat' &&
				(e.params as { key?: string }).key === Stat.warWeariness,
		);
		const warAmt = (warRes?.params as { amount?: number })?.amount ?? 0;
		const summary = summarizeContent('action', 'army_attack', ctx);
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
		const ctx = createCtx();
		const plunder = ctx.actions.get('plunder');
		const desc = describeContent('action', 'army_attack', ctx);
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
		const ctx = createCtx();
		const armyAttack = ctx.actions.get('army_attack');
		const castle = RESOURCES[Resource.castleHP];
		const army = STATS[Stat.armyStrength];
		const absorption = STATS[Stat.absorption];
		const fort = STATS[Stat.fortificationStrength];
		const happiness = RESOURCES[Resource.happiness];
		const plunder = ctx.actions.get('plunder');

		ctx.activePlayer.resources[Resource.ap] = 1;
		ctx.activePlayer.population = {
			...ctx.activePlayer.population,
			[PopulationRole.Legion]: 1,
			[PopulationRole.Council]: 0,
		};
		ctx.activePlayer.stats[Stat.armyStrength] = 2;
		ctx.activePlayer.resources[Resource.happiness] = 1;
		ctx.activePlayer.resources[Resource.gold] = 13;
		ctx.opponent.stats[Stat.fortificationStrength] = 1;
		ctx.opponent.resources[Resource.happiness] = 3;
		ctx.opponent.resources[Resource.gold] = 20;
		const castleBefore = ctx.opponent.resources[Resource.castleHP];

		performAction('army_attack', ctx);
		const castleAfter = ctx.opponent.resources[Resource.castleHP];
		const log = logContent('action', 'army_attack', ctx);
		expect(log).toEqual([
			`Played ${armyAttack.icon} ${armyAttack.name}`,
			`  Damage evaluation: ${army.icon}2 vs. ${absorption.icon}0% ${fort.icon}1 ${castle.icon}${castleBefore}`,
			`    ${army.icon}2 vs. ${absorption.icon}0% --> ${army.icon}2`,
			`    ${army.icon}2 vs. ${fort.icon}1 --> ${fort.icon}0 ${army.icon}1`,
			`    ${army.icon}1 vs. ${castle.icon}${castleBefore} --> ${castle.icon}${castleAfter}`,
			`  ${castle.icon} ${castle.label} damage trigger evaluation`,
			`    Opponent: ${happiness.icon} ${happiness.label} -1 (3→2)`,
			`    You: ${happiness.icon} ${happiness.label} +1 (1→2)`,
			`    Triggered ${plunder.icon} ${plunder.name}`,
			`      Opponent: ${RESOURCES[Resource.gold].icon} ${RESOURCES[Resource.gold].label} -25% (20→15) (-5)`,
			`      You: ${RESOURCES[Resource.gold].icon} ${RESOURCES[Resource.gold].label} +5 (13→18)`,
		]);
	});

	it('summarizes building attack as destruction', () => {
		const { ctx, attack, buildingId, building } = createBuildingAttackCtx();
		const army = STATS[Stat.armyStrength];
		const gold = RESOURCES[Resource.gold];
		const buildingDisplay = iconLabel(building.icon, building.name, buildingId);
		const summaryTitle = building.icon
			? `On opponent ${building.icon} destruction`
			: `On opponent ${building.name ?? buildingId} destruction`;

		const summary = summarizeContent('action', attack.id, ctx);
		expect(summary).toEqual([
			`${army.icon} destroy opponent's ${buildingDisplay}`,
			{
				title: summaryTitle,
				items: [`${gold.icon}+1 for you`],
			},
		]);
	});

	it('logs building attack action with destruction evaluation', () => {
		const { ctx, attack, buildingId, building } = createBuildingAttackCtx();
		const army = STATS[Stat.armyStrength];
		const absorption = STATS[Stat.absorption];
		const fort = STATS[Stat.fortificationStrength];
		const gold = RESOURCES[Resource.gold];
		const buildingDisplay = iconLabel(building.icon, building.name, buildingId);

		ctx.activePlayer.resources[Resource.ap] = 1;
		ctx.activePlayer.stats[Stat.armyStrength] = 3;
		ctx.activePlayer.resources[Resource.gold] = 0;
		ctx.opponent.stats[Stat.fortificationStrength] = 1;
		ctx.opponent.buildings.add(buildingId);

		performAction(attack.id, ctx);
		const log = logContent('action', attack.id, ctx);
		expect(log).toEqual([
			`Played ${attack.icon} ${attack.name}`,
			`  Damage evaluation: ${army.icon}3 vs. ${absorption.icon}0% ${fort.icon}1 ${buildingDisplay}`,
			`    ${army.icon}3 vs. ${absorption.icon}0% --> ${army.icon}3`,
			`    ${army.icon}3 vs. ${fort.icon}1 --> ${fort.icon}0 ${army.icon}2`,
			`    ${army.icon}2 destroys ${buildingDisplay}`,
			`  ${buildingDisplay} destruction trigger evaluation`,
			`    You: ${gold.icon} ${gold.label} +1 (0→1)`,
		]);
	});
});
