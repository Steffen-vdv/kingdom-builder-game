import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import './helpers/armyAttackSyntheticRegistries';
import { logContent } from '../src/translation/content';
import { performAction } from '@kingdom-builder/engine';
import {
	createSyntheticCtx,
	setupStatOverrides,
	teardownStatOverrides,
	iconLabel,
	PLUNDER_PERCENT,
	ATTACKER_HAPPINESS_GAIN,
	DEFENDER_HAPPINESS_LOSS,
	BUILDING_REWARD_GOLD,
} from './helpers/armyAttackFactories';
import {
	SYNTH_RESOURCE_IDS,
	SYNTH_STAT_IDS,
	COMBAT_STAT_CONFIG,
} from './helpers/armyAttackConfig';
import type { ActionLogLineDescriptor } from '../src/translation/log/timeline';
import {
	selectAttackBuildingDescriptor,
	selectAttackResourceDescriptor,
} from '../src/translation/effects/formatters/attack/registrySelectors';

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
		const {
			ctx: engineContext,
			translation,
			attack,
			plunder,
		} = createSyntheticCtx();
		const castle = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.castleHP,
		);
		const happiness = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.happiness,
		);
		const gold = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.gold,
		);

		engineContext.activePlayer.resources[SYNTH_RESOURCE_IDS.ap] = 1;
		engineContext.activePlayer.stats[SYNTH_STAT_IDS.armyStrength] = 2;
		engineContext.activePlayer.resources[SYNTH_RESOURCE_IDS.happiness] = 2;
		engineContext.activePlayer.resources[SYNTH_RESOURCE_IDS.gold] = 7;
		engineContext.opponent.stats[SYNTH_STAT_IDS.fortificationStrength] = 1;
		engineContext.opponent.resources[SYNTH_RESOURCE_IDS.happiness] = 5;
		engineContext.opponent.resources[SYNTH_RESOURCE_IDS.gold] = 25;

		performAction(attack.id, engineContext);

		const log = logContent('action', attack.id, translation);
		const powerLabel = iconLabel(
			COMBAT_STAT_CONFIG.power.icon,
			COMBAT_STAT_CONFIG.power.label,
			COMBAT_STAT_CONFIG.power.label,
		);
		const absorptionLabel = iconLabel(
			COMBAT_STAT_CONFIG.absorption.icon,
			COMBAT_STAT_CONFIG.absorption.label,
			COMBAT_STAT_CONFIG.absorption.label,
		);
		const fortLabel = iconLabel(
			COMBAT_STAT_CONFIG.fortification.icon,
			COMBAT_STAT_CONFIG.fortification.label,
			COMBAT_STAT_CONFIG.fortification.label,
		);
		const castleLabel = iconLabel(
			castle.icon,
			castle.label,
			SYNTH_RESOURCE_IDS.castleHP,
		);
		expect(withLegacyIndent(log)).toEqual([
			`${attack.icon} ${attack.name}`,
			`  Attack opponent with your ${powerLabel}`,
			`    ${absorptionLabel} damage reduction applied`,
			`    Apply damage to opponent ${fortLabel}`,
			`    If opponent ${fortLabel} falls to 0, overflow remaining damage onto opponent ${castleLabel}`,
			`  On opponent ${castleLabel} damage`,
			`    ${happiness.icon}-${DEFENDER_HAPPINESS_LOSS} ${happiness.label} for Opponent`,
			`    ${happiness.icon}+${ATTACKER_HAPPINESS_GAIN} ${happiness.label} for Player`,
			`    ${plunder.icon} ${plunder.name}`,
			`      Transfer ${PLUNDER_PERCENT}% of opponent's ${gold.icon}${gold.label} to you`,
		]);
	});

	it('logs building attack action with destruction evaluation', () => {
		const {
			ctx: engineContext,
			translation,
			buildingAttack,
			building,
		} = createSyntheticCtx();
		const gold = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.gold,
		);
		const buildingDescriptor = selectAttackBuildingDescriptor(
			translation,
			building.id,
		);
		const buildingDisplay = iconLabel(
			buildingDescriptor.icon,
			buildingDescriptor.label,
			building.id,
		);

		engineContext.activePlayer.resources[SYNTH_RESOURCE_IDS.ap] = 1;
		engineContext.activePlayer.stats[SYNTH_STAT_IDS.armyStrength] = 3;
		engineContext.activePlayer.resources[SYNTH_RESOURCE_IDS.gold] = 0;
		engineContext.opponent.stats[SYNTH_STAT_IDS.fortificationStrength] = 1;
		engineContext.opponent.buildings.add(building.id);

		performAction(buildingAttack.id, engineContext);
		const log = logContent('action', buildingAttack.id, translation);
		const powerLabel = iconLabel(
			COMBAT_STAT_CONFIG.power.icon,
			COMBAT_STAT_CONFIG.power.label,
			COMBAT_STAT_CONFIG.power.label,
		);
		const absorptionLabel = iconLabel(
			COMBAT_STAT_CONFIG.absorption.icon,
			COMBAT_STAT_CONFIG.absorption.label,
			COMBAT_STAT_CONFIG.absorption.label,
		);
		const fortLabel = iconLabel(
			COMBAT_STAT_CONFIG.fortification.icon,
			COMBAT_STAT_CONFIG.fortification.label,
			COMBAT_STAT_CONFIG.fortification.label,
		);
		expect(withLegacyIndent(log)).toEqual([
			`${buildingAttack.icon} ${buildingAttack.name}`,
			`  Attack opponent with your ${powerLabel}`,
			`    ${absorptionLabel} damage reduction applied`,
			`    Apply damage to opponent ${fortLabel}`,
			`    If opponent ${fortLabel} falls to 0, use remaining damage to attempt to destroy opponent ${buildingDisplay}`,
			`  On opponent ${buildingDisplay} destruction`,
			`    ${gold.icon}+${BUILDING_REWARD_GOLD} ${gold.label} for Player`,
		]);
	});
});
