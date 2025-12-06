import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import './helpers/armyAttackSyntheticRegistries';
import { logContent } from '../src/translation/content';
import { performAction } from '@kingdom-builder/engine';
import { formatActionTitle } from '../src/translation/formatActionTitle';
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
import { SYNTH_RESOURCE_IDS } from './helpers/armyAttackConfig';
import {
	selectAttackBuildingDescriptor,
	selectAttackResourceDescriptor,
} from '../src/translation/effects/formatters/attack/registrySelectors';

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
		const { engineContext, translation, attack, plunder } =
			createSyntheticEngineContext();
		const castle = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.castleHP,
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
		const gold = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.gold,
		);
		const happiness = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.happiness,
		);

		engineContext.activePlayer.resourceValues[SYNTH_RESOURCE_IDS.ap] = 1;
		engineContext.activePlayer.resourceValues[SYNTH_RESOURCE_IDS.armyStrength] =
			2;
		engineContext.activePlayer.resourceValues[SYNTH_RESOURCE_IDS.happiness] = 2;
		engineContext.activePlayer.resourceValues[SYNTH_RESOURCE_IDS.gold] = 7;
		engineContext.opponent.resourceValues[
			SYNTH_RESOURCE_IDS.fortificationStrength
		] = 1;
		engineContext.opponent.resourceValues[SYNTH_RESOURCE_IDS.happiness] = 5;
		engineContext.opponent.resourceValues[SYNTH_RESOURCE_IDS.gold] = 25;
		engineContext.activePlayer.actions.add(attack.id);
		engineContext.activePlayer.actions.add(plunder.id);

		performAction(attack.id, engineContext);

		const log = logContent('action', attack.id, translation);
		const powerLabel = iconLabel(powerStat.icon, powerStat.label, 'Attack');
		const absorptionLabel = iconLabel(
			absorptionStat.icon,
			absorptionStat.label,
			'Absorption',
		);
		const fortLabel = iconLabel(fortStat.icon, fortStat.label, 'Fortification');
		const castleLabel = iconLabel(
			castle.icon,
			castle.label,
			SYNTH_RESOURCE_IDS.castleHP,
		);
		const attackDefinition = translation.actions.get(attack.id);
		if (!attackDefinition) {
			throw new Error('Missing attack definition');
		}
		const attackHeadline = formatActionTitle(attackDefinition, translation);

		expect(log).toHaveLength(9);
		expect(log[0]).toMatchObject({ text: attackHeadline, depth: 0 });
		expect(log[1]).toMatchObject({
			text: `Attack opponent with your ${powerLabel}`,
			depth: 1,
		});
		expect(log[2]).toMatchObject({
			text: `${absorptionLabel} damage reduction applied`,
			depth: 2,
		});
		expect(log[3]).toMatchObject({
			text: `Apply damage to opponent ${fortLabel}`,
			depth: 2,
		});
		expect(log[4]).toMatchObject({
			text: `If opponent ${fortLabel} falls to 0, overflow remaining damage onto opponent ${castleLabel}`,
			depth: 2,
		});
		expect(log[5]).toMatchObject({
			text: `On opponent ${castleLabel} damage`,
			depth: 1,
		});
		expect(log[6]).toMatchObject({
			text: `${plunder.icon} ${plunder.name}`,
			depth: 2,
		});
		expect(log[7]).toMatchObject({
			text: `Transfer ${PLUNDER_HAPPINESS_AMOUNT} of opponent's ${happiness.icon}${happiness.label} to you`,
			depth: 3,
		});
		expect(log[8]).toMatchObject({
			text: `Transfer ${PLUNDER_PERCENT}% of opponent's ${gold.icon}${gold.label} to you`,
			depth: 3,
		});
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

		engineContext.activePlayer.resourceValues[SYNTH_RESOURCE_IDS.ap] = 1;
		engineContext.activePlayer.resourceValues[SYNTH_RESOURCE_IDS.armyStrength] =
			3;
		engineContext.activePlayer.resourceValues[SYNTH_RESOURCE_IDS.gold] = 0;
		engineContext.opponent.resourceValues[
			SYNTH_RESOURCE_IDS.fortificationStrength
		] = 1;
		engineContext.opponent.buildings.add(building.id);
		engineContext.activePlayer.actions.add(buildingAttack.id);

		performAction(buildingAttack.id, engineContext);
		const log = logContent('action', buildingAttack.id, translation);
		const powerLabel = iconLabel(powerStat.icon, powerStat.label, 'Attack');
		const absorptionLabel = iconLabel(
			absorptionStat.icon,
			absorptionStat.label,
			'Absorption',
		);
		const fortLabel = iconLabel(fortStat.icon, fortStat.label, 'Fortification');
		const buildingAttackDefinition = translation.actions.get(buildingAttack.id);
		if (!buildingAttackDefinition) {
			throw new Error('Missing building attack definition');
		}
		const buildingAttackHeadline = formatActionTitle(
			buildingAttackDefinition,
			translation,
		);

		expect(log).toHaveLength(7);
		expect(log[0]).toMatchObject({ text: buildingAttackHeadline, depth: 0 });
		expect(log[1]).toMatchObject({
			text: `Attack opponent with your ${powerLabel}`,
			depth: 1,
		});
		expect(log[2]).toMatchObject({
			text: `${absorptionLabel} damage reduction applied`,
			depth: 2,
		});
		expect(log[3]).toMatchObject({
			text: `Apply damage to opponent ${fortLabel}`,
			depth: 2,
		});
		expect(log[4]).toMatchObject({
			text: `If opponent ${fortLabel} falls to 0, use remaining damage to attempt to destroy opponent ${buildingDisplay}`,
			depth: 2,
		});
		expect(log[5]).toMatchObject({
			text: `On opponent ${buildingDisplay} destruction`,
			depth: 1,
		});
		// V2 format adds space after icon
		expect(log[6]).toMatchObject({
			text: `${gold.icon} +${BUILDING_REWARD_GOLD} ${gold.label} for Player`,
			depth: 2,
		});
	});
});
