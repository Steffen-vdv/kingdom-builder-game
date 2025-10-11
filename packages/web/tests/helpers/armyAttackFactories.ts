import { createEngine, type EffectDef } from '@kingdom-builder/engine';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	SYNTH_ATTACK,
	SYNTH_PLUNDER,
	SYNTH_BUILDING_ATTACK,
	SYNTH_PARTIAL_ATTACK,
	SYNTH_BUILDING,
	COMBAT_STAT_CONFIG,
	PHASES,
	START,
	RULES,
	ATTACKER_HAPPINESS_GAIN,
	DEFENDER_HAPPINESS_LOSS,
	WAR_WEARINESS_GAIN,
	BUILDING_REWARD_GOLD,
	PLUNDER_PERCENT,
	TIER_RESOURCE_KEY,
	type CombatStatKey,
} from './armyAttackConfig';
import {
	buildEffects,
	buildAttackEffect,
	ACTION_DEFS,
	type ActionDefinition,
} from './armyAttackEffects';

function createBaseEngine() {
        const factory = createContentFactory();
        const ctx = createEngine({
		actions: factory.actions,
		buildings: factory.buildings,
		developments: factory.developments,
		populations: factory.populations,
		phases: PHASES,
		start: START,
		rules: RULES,
	});
	return { factory, ctx };
}

type FactoryWithActions = ReturnType<typeof createContentFactory>;

function buildAction(
	factory: FactoryWithActions,
	definition: ActionDefinition,
) {
	const effects: EffectDef[] = [];
	if (definition.attack) {
		effects.push(buildAttackEffect(definition.attack));
	}
	if (definition.extra?.length) {
		effects.push(...buildEffects(definition.extra));
	}
	return factory.action({
		...definition.meta,
		baseCosts: definition.baseCosts,
		system: definition.system,
		effects,
	});
}

export function createSyntheticCtx() {
        const { factory, ctx } = createBaseEngine();
        const building = factory.building({ ...SYNTH_BUILDING });
        const plunder = buildAction(factory, ACTION_DEFS.plunder);
        const attack = buildAction(factory, ACTION_DEFS.attack);
        const buildingAttack = buildAction(factory, ACTION_DEFS.buildingAttack);
        return { ctx, attack, plunder, building, buildingAttack } as const;
}

export function createPartialStatCtx() {
	const { factory, ctx } = createBaseEngine();
	const attack = buildAction(factory, ACTION_DEFS.partial);
	return { ctx, attack } as const;
}

export const SYNTH_COMBAT_STATS: Record<CombatStatKey, { key: string }> = {
        power: { key: COMBAT_STAT_CONFIG.power.key },
        absorption: { key: COMBAT_STAT_CONFIG.absorption.key },
	fortification: { key: COMBAT_STAT_CONFIG.fortification.key },
};

export {
	SYNTH_ATTACK,
	SYNTH_PLUNDER,
	SYNTH_BUILDING_ATTACK,
	SYNTH_PARTIAL_ATTACK,
	SYNTH_BUILDING,
	ATTACKER_HAPPINESS_GAIN,
	DEFENDER_HAPPINESS_LOSS,
	WAR_WEARINESS_GAIN,
	BUILDING_REWARD_GOLD,
	PLUNDER_PERCENT,
	TIER_RESOURCE_KEY,
};

export type { EffectDef };
