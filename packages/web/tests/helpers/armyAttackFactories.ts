import { STATS, BUILDINGS } from '@kingdom-builder/contents';
import { createEngine, type EffectDef } from '@kingdom-builder/engine';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTranslationContextForEngine } from '../helpers/createTranslationContextForEngine';
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
import {
	selectAttackStatDescriptor,
	type AttackRegistryDescriptor,
} from '../../src/translation/effects/formatters/attack/registrySelectors';

type StatInfo = (typeof STATS)[keyof typeof STATS];

const originalStatEntries = new Map<string, StatInfo | undefined>();

function overrideStat(key: CombatStatKey) {
	const config = COMBAT_STAT_CONFIG[key];
	originalStatEntries.set(
		config.key,
		(STATS as Record<string, StatInfo | undefined>)[config.key],
	);
	(STATS as Record<string, StatInfo>)[config.key] = {
		...STATS[config.base],
		icon: config.icon,
		label: config.label,
	};
}

function restoreStat(key: CombatStatKey) {
	const config = COMBAT_STAT_CONFIG[key];
	const original = originalStatEntries.get(config.key);
	if (original) {
		(STATS as Record<string, StatInfo | undefined>)[config.key] = original;
	} else {
		delete (STATS as Record<string, StatInfo | undefined>)[config.key];
	}
}

export function setupStatOverrides() {
	for (const key of Object.keys(COMBAT_STAT_CONFIG) as CombatStatKey[]) {
		overrideStat(key);
	}
}

export function teardownStatOverrides() {
	for (const key of Object.keys(COMBAT_STAT_CONFIG) as CombatStatKey[]) {
		restoreStat(key);
	}
	originalStatEntries.clear();
}

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
	BUILDINGS.add(building.id, building);
	const plunder = buildAction(factory, ACTION_DEFS.plunder);
	const attack = buildAction(factory, ACTION_DEFS.attack);
	const buildingAttack = buildAction(factory, ACTION_DEFS.buildingAttack);
	const translation = createTranslationContextForEngine(ctx, (registries) => {
		const raid = ctx.actions.get(attack.id);
		const raidPlunder = ctx.actions.get(plunder.id);
		const raidBuilding = ctx.actions.get(buildingAttack.id);
		const ctxBuilding = ctx.buildings.get(building.id);
		if (raid) {
			registries.actions.add(raid.id, { ...raid });
		}
		if (raidPlunder) {
			registries.actions.add(raidPlunder.id, { ...raidPlunder });
		}
		if (raidBuilding) {
			registries.actions.add(raidBuilding.id, { ...raidBuilding });
		}
		if (ctxBuilding) {
			registries.buildings.add(ctxBuilding.id, { ...ctxBuilding });
		}
		registries.resources[TIER_RESOURCE_KEY] = {
			key: TIER_RESOURCE_KEY,
			label: 'Tier Resource',
		};
	});
	return {
		ctx,
		translation,
		attack,
		plunder,
		building,
		buildingAttack,
	} as const;
}

export function createPartialStatCtx() {
	const { factory, ctx } = createBaseEngine();
	const attack = buildAction(factory, ACTION_DEFS.partial);
	const translation = createTranslationContextForEngine(ctx, (registries) => {
		const raid = ctx.actions.get(attack.id);
		if (raid) {
			registries.actions.add(raid.id, { ...raid });
		}
		registries.resources[TIER_RESOURCE_KEY] = {
			key: TIER_RESOURCE_KEY,
			label: 'Tier Resource',
		};
	});
	return { ctx, translation, attack } as const;
}

export function getStat(key: string): AttackRegistryDescriptor {
	return selectAttackStatDescriptor(key);
}

export function iconLabel(
	icon: string | undefined,
	label: string | undefined,
	fallback: string,
) {
	const resolved = label ?? fallback;
	return icon ? `${icon} ${resolved}` : resolved;
}

export function statToken(
	stat: AttackRegistryDescriptor,
	fallback: string,
	value: string,
): string {
	const label = iconLabel(stat.icon, stat.label, fallback);
	return `${label} ${value}`;
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
