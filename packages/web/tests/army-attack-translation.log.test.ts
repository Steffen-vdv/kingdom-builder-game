import { describe, it, expect, vi } from 'vitest';
import { logContent } from '../src/translation/content';
import { Resource, Stat, performAction } from '@kingdom-builder/engine';
import {
	formatNumber,
	formatPercent,
	formatSignedValue,
} from '../src/translation/effects/formatters/attack/shared';
import {
        createSyntheticCtx,
        SYNTH_COMBAT_STATS,
        PLUNDER_PERCENT,
} from './helpers/armyAttackFactories';
import type { EffectDef } from './helpers/armyAttackFactories';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';
import { selectResourceInfo } from '../src/translation/effects/formatters/attack/descriptorSelectors';
import { resolveAttackFormatterContext } from '../src/translation/effects/formatters/attack/statContext';

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

describe('army attack translation log', () => {
	it('logs army attack action with concrete evaluation', () => {
		const { ctx: translationContext, attack, plunder } = createSyntheticCtx();
		const attackerName = translationContext.activePlayer.name ?? 'Player';
		const defenderName = translationContext.opponent.name ?? 'Opponent';
		const castle = selectResourceInfo(translationContext, Resource.castleHP);
		const happiness = selectResourceInfo(translationContext, Resource.happiness);
		const gold = selectResourceInfo(translationContext, Resource.gold);
		const attackEffect = attack.effects.find((effect) => effect.type === 'attack');
		const attackContext = resolveAttackFormatterContext(
			attackEffect as EffectDef<Record<string, unknown>>,
			translationContext,
		);
		const powerStat = attackContext.stats.power;
		const absorptionStat = attackContext.stats.absorption;
		const fortStat = attackContext.stats.fortification;
		translationContext.activePlayer.resources[Resource.ap] = 1;
		translationContext.activePlayer.stats[Stat.armyStrength] = 2;
		translationContext.activePlayer.resources[Resource.happiness] = 2;
		translationContext.activePlayer.resources[Resource.gold] = 7;
		translationContext.opponent.stats[Stat.fortificationStrength] = 1;
		translationContext.opponent.resources[Resource.happiness] = 5;
		translationContext.opponent.resources[Resource.gold] = 25;
		const castleBefore = translationContext.opponent.resources[Resource.castleHP];
		const fortBefore = translationContext.opponent.stats[Stat.fortificationStrength];
		const armyStrength = translationContext.activePlayer.stats[Stat.armyStrength];
		const opponentHappinessBefore = translationContext.opponent.resources[Resource.happiness];
		const attackerHappinessBefore = translationContext.activePlayer.resources[Resource.happiness];
		const opponentGoldBefore = translationContext.opponent.resources[Resource.gold];
		const playerGoldBefore = translationContext.activePlayer.resources[Resource.gold];
		const remainingAfterAbsorption = armyStrength;
		const remainingAfterFort = Math.max(remainingAfterAbsorption - fortBefore, 0);
		performAction(attack.id, translationContext);
		const castleAfter = translationContext.opponent.resources[Resource.castleHP];
		const opponentHappinessAfter = translationContext.opponent.resources[Resource.happiness];
		const attackerHappinessAfter = translationContext.activePlayer.resources[Resource.happiness];
		const opponentGoldAfter = translationContext.opponent.resources[Resource.gold];
		const playerGoldAfter = translationContext.activePlayer.resources[Resource.gold];
		const opponentHappinessDelta = opponentHappinessAfter - opponentHappinessBefore;
		const attackerHappinessDelta = attackerHappinessAfter - attackerHappinessBefore;
		const opponentGoldDelta = opponentGoldAfter - opponentGoldBefore;
		const playerGoldDelta = playerGoldAfter - playerGoldBefore;
		const log = logContent('action', attack.id, translationContext);
		const powerValue = (value: number) =>
			`${powerStat?.icon ?? powerStat?.label ?? 'Attack'} ${formatSignedValue(value, formatNumber)}`;
		const absorptionValue = (value: number) =>
			`${absorptionStat?.icon ?? absorptionStat?.label ?? 'Absorption'} ${formatSignedValue(
				value,
				formatPercent,
			)}`;
		const fortValue = (value: number) =>
			`${fortStat?.icon ?? fortStat?.label ?? 'Fortification'} ${formatSignedValue(
				value,
				formatNumber,
			)}`;
		const castleAfterValue = `${castle.icon} ${castle.label} ${castleAfter}`;
		expect(withLegacyIndent(log)).toEqual([
			`${attack.icon} ${attack.name}`,
			`  Evaluate damage: Compare ${powerValue(armyStrength)} against ${absorptionValue(0)}; Compare remaining damage against ${fortValue(fortBefore)}; Apply damage to ${castle.icon} ${castle.label} ${castleBefore}`,
			`    Compare ${powerValue(armyStrength)} against ${absorptionValue(0)} → ${powerValue(remainingAfterAbsorption)}`,
			`    Compare ${powerValue(remainingAfterAbsorption)} against ${fortValue(fortBefore)} → ${fortValue(0)} and carry forward ${powerValue(remainingAfterFort)}`,
			`    Apply ${powerValue(remainingAfterFort)} to ${castle.icon} ${castle.label} ${castleBefore} → ${castleAfterValue}`,
			`  ${castle.icon} ${castle.label} damage trigger evaluation`,
			`    ${defenderName}: ${happiness.icon} ${happiness.label} ${opponentHappinessDelta} (${opponentHappinessBefore}→${opponentHappinessAfter})`,
			`    ${attackerName}: ${happiness.icon} ${happiness.label} ${attackerHappinessDelta >= 0 ? '+' : ''}${attackerHappinessDelta} (${attackerHappinessBefore}→${attackerHappinessAfter})`,
			`    Trigger ${plunder.icon} ${plunder.name}`,
			`      ${defenderName}: ${gold.icon} ${gold.label} -${PLUNDER_PERCENT}% (${opponentGoldBefore}→${opponentGoldAfter}) (${opponentGoldDelta})`,
			`      ${attackerName}: ${gold.icon} ${gold.label} ${playerGoldDelta >= 0 ? '+' : ''}${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
		]);
	});

	it('logs building attack action with destruction evaluation', () => {
		const { ctx: translationContext, buildingAttack, building } = createSyntheticCtx();
		const attackerName = translationContext.activePlayer.name ?? 'Player';
		const attackEffect = buildingAttack.effects.find((effect) => effect.type === 'attack');
		const attackContext = resolveAttackFormatterContext(
			attackEffect as EffectDef<Record<string, unknown>>,
			translationContext,
		);
		const powerStat = attackContext.stats.power;
		const absorptionStat = attackContext.stats.absorption;
		const fortStat = attackContext.stats.fortification;
		const gold = selectResourceInfo(translationContext, Resource.gold);
		const buildingDisplay = building.icon ? `${building.icon} ${building.name}` : building.name || building.id;
		translationContext.activePlayer.resources[Resource.ap] = 1;
		translationContext.activePlayer.stats[Stat.armyStrength] = 3;
		translationContext.activePlayer.resources[Resource.gold] = 0;
		translationContext.opponent.stats[Stat.fortificationStrength] = 1;
		translationContext.opponent.buildings.add(building.id);
		const armyStrength = translationContext.activePlayer.stats[Stat.armyStrength];
		const fortBefore = translationContext.opponent.stats[Stat.fortificationStrength];
		const remainingAfterAbsorption = armyStrength;
		const remainingAfterFort = Math.max(remainingAfterAbsorption - fortBefore, 0);
		const playerGoldBefore = translationContext.activePlayer.resources[Resource.gold];
		performAction(buildingAttack.id, translationContext);
		const playerGoldAfter = translationContext.activePlayer.resources[Resource.gold];
		const playerGoldDelta = playerGoldAfter - playerGoldBefore;
		const log = logContent('action', buildingAttack.id, translationContext);
		const powerValue = (value: number) =>
			`${powerStat?.icon ?? powerStat?.label ?? 'Attack'} ${formatSignedValue(value, formatNumber)}`;
		const absorptionValue = (value: number) =>
			`${absorptionStat?.icon ?? absorptionStat?.label ?? 'Absorption'} ${formatSignedValue(
				value,
				formatPercent,
			)}`;
		const fortValue = (value: number) =>
			`${fortStat?.icon ?? fortStat?.label ?? 'Fortification'} ${formatSignedValue(
				value,
				formatNumber,
			)}`;
		expect(withLegacyIndent(log)).toEqual([
			`${buildingAttack.icon} ${buildingAttack.name}`,
			`  Evaluate damage: Compare ${powerValue(armyStrength)} against ${absorptionValue(0)}; Compare remaining damage against ${fortValue(fortBefore)}; Destroy ${buildingDisplay} with ${powerValue(remainingAfterFort)}`,
			`    Compare ${powerValue(armyStrength)} against ${absorptionValue(0)} → ${powerValue(remainingAfterAbsorption)}`,
			`    Compare ${powerValue(remainingAfterAbsorption)} against ${fortValue(fortBefore)} → ${fortValue(0)} and carry forward ${powerValue(remainingAfterFort)}`,
			`    Destroy ${buildingDisplay} with ${powerValue(remainingAfterFort)}`,
			`  ${buildingDisplay} destruction trigger evaluation`,
			`    ${attackerName}: ${gold.icon} ${gold.label} ${playerGoldDelta >= 0 ? '+' : ''}${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
		]);
	});
});
