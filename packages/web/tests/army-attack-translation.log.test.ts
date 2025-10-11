import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { logContent } from '../src/translation/content';
import { Resource, Stat, performAction } from '@kingdom-builder/engine';
import {
	formatNumber,
	formatPercent,
	formatSignedValue,
} from '../src/translation/effects/formatters/attack/shared';
import {
	selectAttackBuildingInfo,
	selectAttackResourceInfo,
} from '../src/translation/effects/formatters/attack/registrySelectors';
import {
	createSyntheticCtx,
	setupStatOverrides,
	teardownStatOverrides,
	statToken,
	iconLabel,
	SYNTH_COMBAT_STATS,
	PLUNDER_PERCENT,
} from './helpers/armyAttackFactories';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function withLegacyIndent(
	entries: readonly (string | ActionLogLineDescriptor)[],
): string[] {
	return entries.map((entry) =>
		typeof entry === 'string'
			? entry
			: `${'  '.repeat(entry.depth)}${entry.text}`,
	);
}

beforeAll(() => {
	setupStatOverrides();
});

afterAll(() => {
	teardownStatOverrides();
});

describe('army attack translation log', () => {
	it('logs army attack action with concrete evaluation', () => {
		const { ctx: engineContext, attack, plunder } = createSyntheticCtx();
		const attackerName = engineContext.activePlayer.name ?? 'Player';
		const defenderName = engineContext.opponent.name ?? 'Opponent';
		const castle = selectAttackResourceInfo(Resource.castleHP);
		const happiness = selectAttackResourceInfo(Resource.happiness);
		const gold = selectAttackResourceInfo(Resource.gold);

		engineContext.activePlayer.resources[Resource.ap] = 1;
		engineContext.activePlayer.stats[Stat.armyStrength] = 2;
		engineContext.activePlayer.resources[Resource.happiness] = 2;
		engineContext.activePlayer.resources[Resource.gold] = 7;
		engineContext.opponent.stats[Stat.fortificationStrength] = 1;
		engineContext.opponent.resources[Resource.happiness] = 5;
		engineContext.opponent.resources[Resource.gold] = 25;
		const castleBefore = engineContext.opponent.resources[Resource.castleHP];
		const fortBefore = engineContext.opponent.stats[Stat.fortificationStrength];
		const armyStrength = engineContext.activePlayer.stats[Stat.armyStrength];
		const opponentHappinessBefore =
			engineContext.opponent.resources[Resource.happiness];
		const attackerHappinessBefore =
			engineContext.activePlayer.resources[Resource.happiness];
		const opponentGoldBefore = engineContext.opponent.resources[Resource.gold];
		const playerGoldBefore =
			engineContext.activePlayer.resources[Resource.gold];
		const remainingAfterAbsorption = armyStrength;
		const remainingAfterFort = Math.max(
			remainingAfterAbsorption - fortBefore,
			0,
		);

		performAction(attack.id, engineContext);
		const castleAfter = engineContext.opponent.resources[Resource.castleHP];
		const opponentHappinessAfter =
			engineContext.opponent.resources[Resource.happiness];
		const attackerHappinessAfter =
			engineContext.activePlayer.resources[Resource.happiness];
		const opponentGoldAfter = engineContext.opponent.resources[Resource.gold];
		const playerGoldAfter = engineContext.activePlayer.resources[Resource.gold];
		const opponentHappinessDelta =
			opponentHappinessAfter - opponentHappinessBefore;
		const attackerHappinessDelta =
			attackerHappinessAfter - attackerHappinessBefore;
		const opponentGoldDelta = opponentGoldAfter - opponentGoldBefore;
		const playerGoldDelta = playerGoldAfter - playerGoldBefore;

		const log = logContent('action', attack.id, engineContext);
		const powerValue = (value: number) =>
			statToken(
				SYNTH_COMBAT_STATS.power.key,
				'Attack',
				formatSignedValue(value, formatNumber),
			);
		const absorptionValue = (value: number) =>
			statToken(
				SYNTH_COMBAT_STATS.absorption.key,
				'Absorption',
				formatSignedValue(value, formatPercent),
			);
		const fortValue = (value: number) =>
			statToken(
				SYNTH_COMBAT_STATS.fortification.key,
				'Fortification',
				formatSignedValue(value, formatNumber),
			);
		const castleAfterValue = `${castle.icon} ${castle.label} ${castleAfter}`;
		expect(withLegacyIndent(log)).toEqual([
			`${attack.icon} ${attack.name}`,
			`  Evaluate damage: Compare ${powerValue(armyStrength)} against ${absorptionValue(0)}; Compare remaining damage against ${fortValue(fortBefore)}; Apply damage to ${castle.icon} ${castle.label} ${castleBefore}`,
			`    Compare ${powerValue(armyStrength)} against ${absorptionValue(0)} → ${powerValue(remainingAfterAbsorption)}`,
			`    Compare ${powerValue(remainingAfterAbsorption)} against ${fortValue(fortBefore)} → ${fortValue(0)} and carry forward ${powerValue(remainingAfterFort)}`,
			`    Apply ${powerValue(remainingAfterFort)} to ${castle.icon} ${castle.label} ${castleBefore} → ${castleAfterValue}`,
			`  ${castle.icon} ${castle.label} damage trigger evaluation`,
			`    ${defenderName}: ${happiness.icon} ${happiness.label} ${opponentHappinessDelta} (${opponentHappinessBefore}→${opponentHappinessAfter})`,
			`    ${attackerName}: ${happiness.icon} ${happiness.label} ${
				attackerHappinessDelta >= 0 ? '+' : ''
			}${attackerHappinessDelta} (${attackerHappinessBefore}→${attackerHappinessAfter})`,
			`    Trigger ${plunder.icon} ${plunder.name}`,
			`      ${defenderName}: ${gold.icon} ${gold.label} -${PLUNDER_PERCENT}% (${opponentGoldBefore}→${opponentGoldAfter}) (${opponentGoldDelta})`,
			`      ${attackerName}: ${gold.icon} ${gold.label} ${
				playerGoldDelta >= 0 ? '+' : ''
			}${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
		]);
	});

	it('logs building attack action with destruction evaluation', () => {
		const {
			ctx: engineContext,
			buildingAttack,
			building,
		} = createSyntheticCtx();
		const attackerName = engineContext.activePlayer.name ?? 'Player';
		const gold = selectAttackResourceInfo(Resource.gold);
		const buildingInfo = selectAttackBuildingInfo(building.id);
		const buildingDisplay = iconLabel(
			buildingInfo.icon,
			buildingInfo.label,
			building.id,
		);

		engineContext.activePlayer.resources[Resource.ap] = 1;
		engineContext.activePlayer.stats[Stat.armyStrength] = 3;
		engineContext.activePlayer.resources[Resource.gold] = 0;
		engineContext.opponent.stats[Stat.fortificationStrength] = 1;
		engineContext.opponent.buildings.add(building.id);
		const armyStrength = engineContext.activePlayer.stats[Stat.armyStrength];
		const fortBefore = engineContext.opponent.stats[Stat.fortificationStrength];
		const remainingAfterAbsorption = armyStrength;
		const remainingAfterFort = Math.max(
			remainingAfterAbsorption - fortBefore,
			0,
		);
		const playerGoldBefore =
			engineContext.activePlayer.resources[Resource.gold];

		performAction(buildingAttack.id, engineContext);
		const playerGoldAfter = engineContext.activePlayer.resources[Resource.gold];
		const playerGoldDelta = playerGoldAfter - playerGoldBefore;
		const log = logContent('action', buildingAttack.id, engineContext);
		const powerValue = (value: number) =>
			statToken(
				SYNTH_COMBAT_STATS.power.key,
				'Attack',
				formatSignedValue(value, formatNumber),
			);
		const absorptionValue = (value: number) =>
			statToken(
				SYNTH_COMBAT_STATS.absorption.key,
				'Absorption',
				formatSignedValue(value, formatPercent),
			);
		const fortValue = (value: number) =>
			statToken(
				SYNTH_COMBAT_STATS.fortification.key,
				'Fortification',
				formatSignedValue(value, formatNumber),
			);
		expect(withLegacyIndent(log)).toEqual([
			`${buildingAttack.icon} ${buildingAttack.name}`,
			`  Evaluate damage: Compare ${powerValue(armyStrength)} against ${absorptionValue(0)}; Compare remaining damage against ${fortValue(fortBefore)}; Destroy ${buildingDisplay} with ${powerValue(remainingAfterFort)}`,
			`    Compare ${powerValue(armyStrength)} against ${absorptionValue(0)} → ${powerValue(remainingAfterAbsorption)}`,
			`    Compare ${powerValue(remainingAfterAbsorption)} against ${fortValue(fortBefore)} → ${fortValue(0)} and carry forward ${powerValue(remainingAfterFort)}`,
			`    Destroy ${buildingDisplay} with ${powerValue(remainingAfterFort)}`,
			`  ${buildingDisplay} destruction trigger evaluation`,
			`    ${attackerName}: ${gold.icon} ${gold.label} ${
				playerGoldDelta >= 0 ? '+' : ''
			}${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
		]);
	});
});
