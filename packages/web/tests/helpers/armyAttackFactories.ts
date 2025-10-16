import { createEngine, type EffectDef } from '@kingdom-builder/engine';
import { createContentFactory } from '@kingdom-builder/testing';
import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol/session';

import type { SessionRegistries } from '../../src/state/sessionRegistries';
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
	SYNTH_RESOURCE_METADATA,
	SYNTH_STAT_METADATA,
	type CombatStatKey,
	type SyntheticDescriptor,
} from './armyAttackConfig';
import {
	buildEffects,
	buildAttackEffect,
	ACTION_DEFS,
	type ActionDefinition,
} from './armyAttackEffects';
import type { TranslationContext } from '../../src/translation/context';
import {
	selectAttackStatDescriptor,
	type AttackRegistryDescriptor,
} from '../../src/translation/effects/formatters/attack/registrySelectors';

const originalStatEntries = new Map<string, SyntheticDescriptor | undefined>();

function overrideStat(key: CombatStatKey) {
	const config = COMBAT_STAT_CONFIG[key];
	originalStatEntries.set(config.key, SYNTH_STAT_METADATA[config.key]);
	SYNTH_STAT_METADATA[config.key] = {
		key: config.key,
		icon: config.icon,
		label: config.label,
	};
}

function restoreStat(key: CombatStatKey) {
	const config = COMBAT_STAT_CONFIG[key];
	const original = originalStatEntries.get(config.key);
	if (original) {
		SYNTH_STAT_METADATA[config.key] = original;
	} else {
		delete SYNTH_STAT_METADATA[config.key];
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
	return { factory, ctx } as const;
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

function registerSyntheticResources(registries: SessionRegistries) {
	for (const descriptor of Object.values(SYNTH_RESOURCE_METADATA)) {
		registries.resources[descriptor.key] = {
			key: descriptor.key,
			icon: descriptor.icon,
			label: descriptor.label,
		};
	}
	registries.resources[TIER_RESOURCE_KEY] = {
		key: TIER_RESOURCE_KEY,
		label: SYNTH_RESOURCE_METADATA[TIER_RESOURCE_KEY]?.label ?? 'Tier Resource',
		icon: SYNTH_RESOURCE_METADATA[TIER_RESOURCE_KEY]?.icon,
	};
}

/**
 * Create a test engine and translation context prepopulated with synthetic raid actions, building, and metadata for resources and stats.
 *
 * @returns An object containing:
 * - `ctx`: the created engine context
 * - `translation`: the translation context populated with action and building registries and synthetic resources
 * - `attack`: the built attack action
 * - `plunder`: the built plunder action
 * - `building`: the synthetic building entity
 * - `buildingAttack`: the built building-attack action
 * - `resourceMetadata`: the synthetic resource metadata mapping
 * - `statMetadata`: the synthetic stat descriptor mapping
 */
export function createSyntheticCtx() {
	const { factory, ctx } = createBaseEngine();
	const building = factory.building({ ...SYNTH_BUILDING });
	const plunder = buildAction(factory, ACTION_DEFS.plunder);
	const attack = buildAction(factory, ACTION_DEFS.attack);
	const buildingAttack = buildAction(factory, ACTION_DEFS.buildingAttack);
	const statMetadata = Object.fromEntries(
		Object.entries(SYNTH_STAT_METADATA).map(([key, descriptor]) => {
			const entry: SessionMetadataDescriptor = {};
			if (descriptor.icon !== undefined) {
				entry.icon = descriptor.icon;
			}
			if (descriptor.label !== undefined) {
				entry.label = descriptor.label;
			}
			return [key, entry] as const;
		}),
	);
	const translation = createTranslationContextForEngine(
		ctx,
		(registries) => {
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
			registerSyntheticResources(registries);
		},
		{ metadata: { stats: statMetadata } },
	);
	return {
		ctx,
		translation,
		attack,
		plunder,
		building,
		buildingAttack,
		resourceMetadata: SYNTH_RESOURCE_METADATA,
		statMetadata: SYNTH_STAT_METADATA,
	} as const;
}

/**
 * Create a test engine and translation context configured with a partial attack and synthetic resource/stat metadata.
 *
 * @returns An object containing:
 * - `ctx`: the created engine context used for tests.
 * - `translation`: the translation context wired to the engine and populated with synthetic stat and resource metadata.
 * - `attack`: the built partial attack action used for tests.
 * - `resourceMetadata`: the synthetic resource metadata map.
 * - `statMetadata`: the synthetic stat metadata map.
 */
export function createPartialStatCtx() {
	const { factory, ctx } = createBaseEngine();
	const attack = buildAction(factory, ACTION_DEFS.partial);
	const statMetadata = Object.fromEntries(
		Object.entries(SYNTH_STAT_METADATA).map(([key, descriptor]) => {
			const entry: SessionMetadataDescriptor = {};
			if (descriptor.icon !== undefined) {
				entry.icon = descriptor.icon;
			}
			if (descriptor.label !== undefined) {
				entry.label = descriptor.label;
			}
			return [key, entry] as const;
		}),
	);
	const translation = createTranslationContextForEngine(
		ctx,
		(registries) => {
			const raid = ctx.actions.get(attack.id);
			if (raid) {
				registries.actions.add(raid.id, { ...raid });
			}
			registerSyntheticResources(registries);
		},
		{ metadata: { stats: statMetadata } },
	);
	return {
		ctx,
		translation,
		attack,
		resourceMetadata: SYNTH_RESOURCE_METADATA,
		statMetadata: SYNTH_STAT_METADATA,
	} as const;
}

/**
 * Fetches the attack stat descriptor for a given stat key from the provided translation assets.
 *
 * @param context - Object exposing translation `assets` used to resolve registry descriptors
 * @param key - The stat key to look up
 * @returns The attack registry descriptor associated with `key`
 */
export function getStat(
	context: Pick<TranslationContext, 'assets'>,
	key: string,
): AttackRegistryDescriptor {
	return selectAttackStatDescriptor(context, key);
}

/**
 * Produce a display label, optionally prefixed by an icon.
 *
 * @param icon - Optional icon string to prefix the label (e.g., emoji or symbol)
 * @param label - Primary label to use when present
 * @param fallback - Label to use when `label` is undefined
 * @returns The chosen label (`label` if present, otherwise `fallback`), prefixed by `icon` and a space when `icon` is provided
 */
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

const suppressedStatEntries = new Map<
	string,
	SyntheticDescriptor | undefined
>();

export function suppressSyntheticStatDescriptor(statKey: string) {
	if (!suppressedStatEntries.has(statKey)) {
		suppressedStatEntries.set(statKey, SYNTH_STAT_METADATA[statKey]);
	}
	delete SYNTH_STAT_METADATA[statKey];
}

export function restoreSyntheticStatDescriptor(statKey: string) {
	const original = suppressedStatEntries.get(statKey);
	if (original) {
		SYNTH_STAT_METADATA[statKey] = original;
	} else {
		delete SYNTH_STAT_METADATA[statKey];
	}
	suppressedStatEntries.delete(statKey);
}

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