import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { logContent } from '../src/translation/content';
import { RESOURCES } from '@kingdom-builder/contents';
import { Resource, Stat, performAction } from '@kingdom-builder/engine';
import {
	formatNumber,
	formatPercent,
} from '../src/translation/effects/formatters/attack/shared';
import {
	createSyntheticCtx,
	setupStatOverrides,
	teardownStatOverrides,
	getStat,
	statToken,
	iconLabel,
	SYNTH_COMBAT_STATS,
	PLUNDER_PERCENT,
} from './helpers/armyAttackFactories';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

beforeAll(() => {
	setupStatOverrides();
});

afterAll(() => {
	teardownStatOverrides();
});

describe('army attack translation log', () => {
	it('logs army attack action with concrete evaluation', () => {
		const { ctx, attack, plunder } = createSyntheticCtx();
		const attackerName = ctx.activePlayer.name ?? 'Player';
		const defenderName = ctx.opponent.name ?? 'Opponent';
		const castle = RESOURCES[Resource.castleHP];
		const powerStat = getStat(SYNTH_COMBAT_STATS.power.key)!;
		const absorptionStat = getStat(SYNTH_COMBAT_STATS.absorption.key)!;
		const fortStat = getStat(SYNTH_COMBAT_STATS.fortification.key)!;
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
			`    ${defenderName}: ${happiness.icon} ${happiness.label} ${opponentHappinessDelta} (${opponentHappinessBefore}→${opponentHappinessAfter})`,
			`    ${attackerName}: ${happiness.icon} ${happiness.label} ${
				attackerHappinessDelta >= 0 ? '+' : ''
			}${attackerHappinessDelta} (${attackerHappinessBefore}→${attackerHappinessAfter})`,
			`    Triggered ${plunder.icon} ${plunder.name}`,
			`      ${defenderName}: ${gold.icon} ${gold.label} -${PLUNDER_PERCENT}% (${opponentGoldBefore}→${opponentGoldAfter}) (${opponentGoldDelta})`,
			`      ${attackerName}: ${gold.icon} ${gold.label} ${
				playerGoldDelta >= 0 ? '+' : ''
			}${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
		]);
	});

	it('logs building attack action with destruction evaluation', () => {
		const { ctx, buildingAttack, building } = createSyntheticCtx();
		const attackerName = ctx.activePlayer.name ?? 'Player';
		const powerStat = getStat(SYNTH_COMBAT_STATS.power.key)!;
		const absorptionStat = getStat(SYNTH_COMBAT_STATS.absorption.key)!;
		const fortStat = getStat(SYNTH_COMBAT_STATS.fortification.key)!;
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
			`    ${attackerName}: ${gold.icon} ${gold.label} ${
				playerGoldDelta >= 0 ? '+' : ''
			}${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
		]);
	});
});
