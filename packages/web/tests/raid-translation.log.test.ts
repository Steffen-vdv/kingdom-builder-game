import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

import './helpers/raidSyntheticRegistries';
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
} from './helpers/raidFactories';
import { SYNTH_RESOURCE_IDS } from './helpers/raidConfig';
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

describe('raid translation log', () => {
	it('logs raid action with concrete evaluation', () => {
		const { engineContext, translation, attack, plunder } =
			createSyntheticEngineContext();
		const castle = selectAttackResourceDescriptor(
			translation,
			SYNTH_RESOURCE_IDS.castleHP,
		);
		const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.resourceId)!;
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

		// Simplified attack description - mechanics details removed
		expect(log).toHaveLength(6);
		expect(log[0]).toMatchObject({ text: attackHeadline, depth: 0 });
		expect(log[1]).toMatchObject({
			text: `Attack opponent's ${castleLabel} with your ${powerLabel}`,
			depth: 1,
		});
		expect(log[2]).toMatchObject({
			text: `On opponent ${castleLabel} damage`,
			depth: 1,
		});
		expect(log[3]).toMatchObject({
			text: `${plunder.icon} ${plunder.name}`,
			depth: 2,
		});
		expect(log[4]).toMatchObject({
			text: `Transfer ${PLUNDER_HAPPINESS_AMOUNT} of opponent's ${happiness.icon}${happiness.label} to you`,
			depth: 3,
		});
		expect(log[5]).toMatchObject({
			text: `Transfer ${PLUNDER_PERCENT}% of opponent's ${gold.icon}${gold.label} to you`,
			depth: 3,
		});
	});

	it('logs building attack action with destruction evaluation', () => {
		const { engineContext, translation, buildingAttack, building } =
			createSyntheticEngineContext();
		const powerStat = getStat(translation, SYNTH_COMBAT_STATS.power.resourceId)!;
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
		const buildingAttackDefinition = translation.actions.get(buildingAttack.id);
		if (!buildingAttackDefinition) {
			throw new Error('Missing building attack definition');
		}
		const buildingAttackHeadline = formatActionTitle(
			buildingAttackDefinition,
			translation,
		);

		// Simplified attack description - mechanics details removed
		expect(log).toHaveLength(4);
		expect(log[0]).toMatchObject({ text: buildingAttackHeadline, depth: 0 });
		expect(log[1]).toMatchObject({
			text: `Attack opponent's ${buildingDisplay} with your ${powerLabel}`,
			depth: 1,
		});
		expect(log[2]).toMatchObject({
			text: `On opponent ${buildingDisplay} destruction`,
			depth: 1,
		});
		// format adds space after icon
		expect(log[3]).toMatchObject({
			text: `${gold.icon} +${BUILDING_REWARD_GOLD} ${gold.label} for Player`,
			depth: 2,
		});
	});
});
