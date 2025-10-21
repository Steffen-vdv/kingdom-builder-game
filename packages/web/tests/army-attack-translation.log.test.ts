import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import './helpers/armyAttackSyntheticRegistries';
import { logContent } from '../src/translation/content';
import { Resource, Stat, performAction } from '@kingdom-builder/engine';
import {
	createSyntheticEngineContext,
	setupStatOverrides,
	teardownStatOverrides,
	getStat,
	iconLabel,
	SYNTH_COMBAT_STATS,
	PLUNDER_PERCENT,
	PLUNDER_HAPPINESS_AMOUNT,
	BUILDING_REWARD_GOLD,
} from './helpers/armyAttackFactories';
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
		const { engineContext, translation, attack, plunder } =
			createSyntheticEngineContext();
		const castle = selectAttackResourceDescriptor(
			translation,
			Resource.castleHP,
		);
		const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
		const absorptionStat = getStat(
			translation,
			SYNTH_COMBAT_STATS.absorption.key,
		)!;
		const fortStat = getStat(
			translation,
			SYNTH_COMBAT_STATS.fortification.key,
		)!;
		const gold = selectAttackResourceDescriptor(translation, Resource.gold);
		const happiness = selectAttackResourceDescriptor(
			translation,
			Resource.happiness,
		);

		engineContext.activePlayer.resources[Resource.ap] = 1;
		engineContext.activePlayer.stats[Stat.armyStrength] = 2;
		engineContext.activePlayer.resources[Resource.happiness] = 2;
		engineContext.activePlayer.resources[Resource.gold] = 7;
		engineContext.opponent.stats[Stat.fortificationStrength] = 1;
		engineContext.opponent.resources[Resource.happiness] = 5;
		engineContext.opponent.resources[Resource.gold] = 25;

		performAction(attack.id, engineContext);

		const log = logContent('action', attack.id, translation);
		const powerLabel = iconLabel(powerStat.icon, powerStat.label, 'Attack');
		const absorptionLabel = iconLabel(
			absorptionStat.icon,
			absorptionStat.label,
			'Absorption',
		);
		const fortLabel = iconLabel(fortStat.icon, fortStat.label, 'Fortification');
		const castleLabel = iconLabel(castle.icon, castle.label, Resource.castleHP);
		expect(withLegacyIndent(log)).toEqual([
			`${attack.icon} ${attack.name}`,
			`  Attack opponent with your ${powerLabel}`,
			`    ${absorptionLabel} damage reduction applied`,
			`    Apply damage to opponent ${fortLabel}`,
			`    If opponent ${fortLabel} falls to 0, overflow remaining damage onto opponent ${castleLabel}`,
			`  On opponent ${castleLabel} damage`,
			`    ${plunder.icon} ${plunder.name}`,
			`      Transfer ${happiness.icon}+${PLUNDER_HAPPINESS_AMOUNT} ${happiness.label} from opponent to you`,
			`      Transfer ${PLUNDER_PERCENT}% of opponent's ${gold.icon}${gold.label} to you`,
		]);
	});

	it('logs building attack action with destruction evaluation', () => {
		const { engineContext, translation, buildingAttack, building } =
			createSyntheticEngineContext();
		const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.key)!;
		const absorptionStat = getStat(
			translation,
			SYNTH_COMBAT_STATS.absorption.key,
		)!;
		const fortStat = getStat(
			translation,
			SYNTH_COMBAT_STATS.fortification.key,
		)!;
		const gold = selectAttackResourceDescriptor(translation, Resource.gold);
		const buildingDescriptor = selectAttackBuildingDescriptor(
			translation,
			building.id,
		);
		const buildingDisplay = iconLabel(
			buildingDescriptor.icon,
			buildingDescriptor.label,
			building.id,
		);

		engineContext.activePlayer.resources[Resource.ap] = 1;
		engineContext.activePlayer.stats[Stat.armyStrength] = 3;
		engineContext.activePlayer.resources[Resource.gold] = 0;
		engineContext.opponent.stats[Stat.fortificationStrength] = 1;
		engineContext.opponent.buildings.add(building.id);

		performAction(buildingAttack.id, engineContext);
		const log = logContent('action', buildingAttack.id, translation);
		const powerLabel = iconLabel(powerStat.icon, powerStat.label, 'Attack');
		const absorptionLabel = iconLabel(
			absorptionStat.icon,
			absorptionStat.label,
			'Absorption',
		);
		const fortLabel = iconLabel(fortStat.icon, fortStat.label, 'Fortification');
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
