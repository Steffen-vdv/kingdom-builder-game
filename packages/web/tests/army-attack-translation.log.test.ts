import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
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
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';
import { createTranslationContextForEngine } from './helpers/createTranslationContextForEngine';
import {
        selectBuildingIconLabel,
        selectResourceIconLabel,
        selectStatIconLabel,
} from '../src/translation/registrySelectors';
import { DEFAULT_ATTACK_STAT_LABELS } from '../src/translation/effects/formatters/attack/types';

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

function statToken(
        translationContext: ReturnType<typeof createTranslationContextForEngine>,
        key: string,
        fallback: keyof typeof DEFAULT_ATTACK_STAT_LABELS,
        value: string,
) {
        const descriptor = selectStatIconLabel(translationContext, key, {
                fallbackLabel: DEFAULT_ATTACK_STAT_LABELS[fallback],
        });
        const label = descriptor.icon
                ? `${descriptor.icon} ${descriptor.label}`
                : descriptor.label;
        return `${label} ${value}`;
}

describe('army attack translation log', () => {
        it('logs army attack action with concrete evaluation', () => {
                const { ctx: engineContext, attack, plunder } = createSyntheticCtx();
                const attackerName = engineContext.activePlayer.name ?? 'Player';
                const defenderName = engineContext.opponent.name ?? 'Opponent';

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

                const translationContext = createTranslationContextForEngine(
                        engineContext,
                );
                const log = logContent('action', attack.id, translationContext);
                const powerValue = (value: number) =>
                        statToken(
                                translationContext,
                                SYNTH_COMBAT_STATS.power.key,
                                'power',
                                formatSignedValue(value, formatNumber),
                        );
                const absorptionValue = (value: number) =>
                        statToken(
                                translationContext,
                                SYNTH_COMBAT_STATS.absorption.key,
                                'absorption',
                                formatSignedValue(value, formatPercent),
                        );
                const fortValue = (value: number) =>
                        statToken(
                                translationContext,
                                SYNTH_COMBAT_STATS.fortification.key,
                                'fortification',
                                formatSignedValue(value, formatNumber),
                        );
                const castleDescriptor = selectResourceIconLabel(
                        translationContext,
                        Resource.castleHP,
                );
                const happinessDescriptor = selectResourceIconLabel(
                        translationContext,
                        Resource.happiness,
                );
                const goldDescriptor = selectResourceIconLabel(
                        translationContext,
                        Resource.gold,
                );
                const castleAfterValue = `${castleDescriptor.icon} ${castleDescriptor.label} ${castleAfter}`;
                expect(withLegacyIndent(log)).toEqual([
                        `${attack.icon} ${attack.name}`,
                        `  Evaluate damage: Compare ${powerValue(armyStrength)} against ${absorptionValue(0)}; Compare remaining damage against ${fortValue(fortBefore)}; Apply damage to ${castleDescriptor.icon} ${castleDescriptor.label} ${castleBefore}`,
                        `    Compare ${powerValue(armyStrength)} against ${absorptionValue(0)} → ${powerValue(remainingAfterAbsorption)}`,
                        `    Compare ${powerValue(remainingAfterAbsorption)} against ${fortValue(fortBefore)} → ${fortValue(0)} and carry forward ${powerValue(remainingAfterFort)}`,
                        `    Apply ${powerValue(remainingAfterFort)} to ${castleDescriptor.icon} ${castleDescriptor.label} ${castleBefore} → ${castleAfterValue}`,
                        `  ${castleDescriptor.icon} ${castleDescriptor.label} damage trigger evaluation`,
                        `    ${defenderName}: ${happinessDescriptor.icon} ${happinessDescriptor.label} ${opponentHappinessDelta} (${opponentHappinessBefore}→${opponentHappinessAfter})`,
                        `    ${attackerName}: ${happinessDescriptor.icon} ${happinessDescriptor.label} ${
                                attackerHappinessDelta >= 0 ? '+' : ''
                        }${attackerHappinessDelta} (${attackerHappinessBefore}→${attackerHappinessAfter})`,
                        `    Trigger ${plunder.icon} ${plunder.name}`,
                        `      ${defenderName}: ${goldDescriptor.icon} ${goldDescriptor.label} -${PLUNDER_PERCENT}% (${opponentGoldBefore}→${opponentGoldAfter}) (${opponentGoldDelta})`,
                        `      ${attackerName}: ${goldDescriptor.icon} ${goldDescriptor.label} ${
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
                const translationContext = createTranslationContextForEngine(
                        engineContext,
                );
                const log = logContent('action', buildingAttack.id, translationContext);
                const powerValue = (value: number) =>
                        statToken(
                                translationContext,
                                SYNTH_COMBAT_STATS.power.key,
                                'power',
                                formatSignedValue(value, formatNumber),
                        );
                const absorptionValue = (value: number) =>
                        statToken(
                                translationContext,
                                SYNTH_COMBAT_STATS.absorption.key,
                                'absorption',
                                formatSignedValue(value, formatPercent),
                        );
                const fortValue = (value: number) =>
                        statToken(
                                translationContext,
                                SYNTH_COMBAT_STATS.fortification.key,
                                'fortification',
                                formatSignedValue(value, formatNumber),
                        );
                const buildingDescriptor = selectBuildingIconLabel(
                        translationContext,
                        building.id,
                );
                const goldDescriptor = selectResourceIconLabel(
                        translationContext,
                        Resource.gold,
                );
                expect(withLegacyIndent(log)).toEqual([
                        `${buildingAttack.icon} ${buildingAttack.name}`,
                        `  Evaluate damage: Compare ${powerValue(armyStrength)} against ${absorptionValue(0)}; Compare remaining damage against ${fortValue(fortBefore)}; Destroy ${buildingDescriptor.icon} ${buildingDescriptor.label} with ${powerValue(remainingAfterFort)}`,
                        `    Compare ${powerValue(armyStrength)} against ${absorptionValue(0)} → ${powerValue(remainingAfterAbsorption)}`,
                        `    Compare ${powerValue(remainingAfterAbsorption)} against ${fortValue(fortBefore)} → ${fortValue(0)} and carry forward ${powerValue(remainingAfterFort)}`,
                        `    Destroy ${buildingDescriptor.icon} ${buildingDescriptor.label} with ${powerValue(remainingAfterFort)}`,
                        `  ${buildingDescriptor.icon} ${buildingDescriptor.label} destruction trigger evaluation`,
                        `    ${attackerName}: ${goldDescriptor.icon} ${goldDescriptor.label} ${
                                playerGoldDelta >= 0 ? '+' : ''
                        }${playerGoldDelta} (${playerGoldBefore}→${playerGoldAfter})`,
                ]);
        });
});
