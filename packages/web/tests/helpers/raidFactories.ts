import { createEngine } from '@kingdom-builder/engine';
import type { EffectDef } from '@kingdom-builder/protocol';
import { createContentFactory } from '@kingdom-builder/testing';

import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createTranslationContextForEngine } from '../helpers/createTranslationContextForEngine';
import {
	SYNTH_ATTACK,
	SYNTH_PLUNDER,
	SYNTH_BUILDING_ATTACK,
	SYNTH_PARTIAL_ATTACK,
	SYNTH_BUILDING,
	COMBAT_RESOURCE_CONFIG,
	PHASES,
	RULES,
	PLUNDER_HAPPINESS_AMOUNT,
	WAR_WEARINESS_GAIN,
	BUILDING_REWARD_GOLD,
	PLUNDER_PERCENT,
	TIER_RESOURCE_KEY,
	SYNTH_RESOURCE_METADATA,
	SYNTH_RESOURCE_CATALOG,
	type CombatResourceKey,
	type SyntheticDescriptor,
} from './raidConfig';

/**
 * No-op system action IDs used to skip initial setup.
 * These actions don't exist, so no setup effects run.
 */
const SKIP_SETUP_ACTION_IDS = {
	initialSetup: '__army_attack_noop_initial__',
	initialSetupDevmode: '__army_attack_noop_devmode__',
	compensation: '__army_attack_noop_compensation__',
};
import {
	buildEffects,
	buildAttackEffect,
	ACTION_DEFS,
	type ActionDefinition,
} from './raidEffects';
import type { TranslationContext } from '../../src/translation/context';
import {
	selectAttackStatDescriptor,
	type AttackRegistryDescriptor,
} from '../../src/translation/effects/formatters/attack/registrySelectors';

const originalResourceEntries = new Map<
	string,
	SyntheticDescriptor | undefined
>();

function overrideResource(key: CombatResourceKey) {
	const config = COMBAT_RESOURCE_CONFIG[key];
	originalResourceEntries.set(
		config.resourceId,
		SYNTH_RESOURCE_METADATA[config.resourceId],
	);
	SYNTH_RESOURCE_METADATA[config.resourceId] = {
		key: config.resourceId,
		icon: config.icon,
		label: config.label,
	};
}

function restoreResource(key: CombatResourceKey) {
	const config = COMBAT_RESOURCE_CONFIG[key];
	const original = originalResourceEntries.get(config.resourceId);
	if (original) {
		SYNTH_RESOURCE_METADATA[config.resourceId] = original;
	} else {
		delete SYNTH_RESOURCE_METADATA[config.resourceId];
	}
}

export function setupResourceOverrides() {
	for (const key of Object.keys(
		COMBAT_RESOURCE_CONFIG,
	) as CombatResourceKey[]) {
		overrideResource(key);
	}
}

export function teardownResourceOverrides() {
	for (const key of Object.keys(
		COMBAT_RESOURCE_CONFIG,
	) as CombatResourceKey[]) {
		restoreResource(key);
	}
	originalResourceEntries.clear();
}

function createBaseEngine() {
	// Use isolated mode to avoid loading real actions with gold baseCosts
	const factory = createContentFactory({ isolated: true });
	const engineContext = createEngine({
		actions: factory.actions,
		actionMetaCategories: factory.actionMetaCategories,
		buildings: factory.buildings,
		developments: factory.developments,
		populations: factory.populations,
		phases: PHASES,
		rules: RULES,
		resourceCatalog: SYNTH_RESOURCE_CATALOG,
		systemActionIds: SKIP_SETUP_ACTION_IDS,
	});
	return { factory, engineContext } as const;
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
		locked: definition.locked,
		free: true, // Skip global AP cost for tests
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

export function createSyntheticEngineContext() {
	const { factory, engineContext } = createBaseEngine();
	const building = factory.building({ ...SYNTH_BUILDING });
	const plunder = buildAction(factory, ACTION_DEFS.plunder);
	const attack = buildAction(factory, ACTION_DEFS.attack);
	const buildingAttack = buildAction(factory, ACTION_DEFS.buildingAttack);
	const translation = createTranslationContextForEngine(
		engineContext,
		(registries) => {
			const raid = engineContext.actions.get(attack.id);
			const raidPlunder = engineContext.actions.get(plunder.id);
			const raidBuilding = engineContext.actions.get(buildingAttack.id);
			const contextBuilding = engineContext.buildings.get(building.id);
			if (raid) {
				registries.actions.add(raid.id, { ...raid });
			}
			if (raidPlunder) {
				registries.actions.add(raidPlunder.id, { ...raidPlunder });
			}
			if (raidBuilding) {
				registries.actions.add(raidBuilding.id, { ...raidBuilding });
			}
			if (contextBuilding) {
				registries.buildings.add(contextBuilding.id, {
					...contextBuilding,
				});
			}
			registerSyntheticResources(registries);
		},
	);
	return {
		engineContext,
		translation,
		attack,
		plunder,
		building,
		buildingAttack,
		resourceMetadata: SYNTH_RESOURCE_METADATA,
	} as const;
}
export function createPartialStatEngineContext() {
	const { factory, engineContext } = createBaseEngine();
	const attack = buildAction(factory, ACTION_DEFS.partial);
	const translation = createTranslationContextForEngine(
		engineContext,
		(registries) => {
			const raid = engineContext.actions.get(attack.id);
			if (raid) {
				registries.actions.add(raid.id, { ...raid });
			}
			registerSyntheticResources(registries);
		},
	);
	return {
		engineContext,
		translation,
		attack,
		resourceMetadata: SYNTH_RESOURCE_METADATA,
	} as const;
}

export function getResource(
	context: Pick<TranslationContext, 'resourceMetadata'>,
	key: string,
): AttackRegistryDescriptor {
	return selectAttackStatDescriptor(context, key);
}

export function iconLabel(
	icon: string | undefined,
	label: string | undefined,
	fallback: string,
) {
	const resolved = label ?? fallback;
	return icon ? `${icon} ${resolved}` : resolved;
}

export const SYNTH_COMBAT_RESOURCES: Record<
	CombatResourceKey,
	{ resourceId: string }
> = {
	power: { resourceId: COMBAT_RESOURCE_CONFIG.power.resourceId },
	absorption: { resourceId: COMBAT_RESOURCE_CONFIG.absorption.resourceId },
	fortification: {
		resourceId: COMBAT_RESOURCE_CONFIG.fortification.resourceId,
	},
};

const suppressedResourceEntries = new Map<
	string,
	SyntheticDescriptor | undefined
>();

export function suppressSyntheticResourceDescriptor(resourceKey: string) {
	if (!suppressedResourceEntries.has(resourceKey)) {
		suppressedResourceEntries.set(
			resourceKey,
			SYNTH_RESOURCE_METADATA[resourceKey],
		);
	}
	delete SYNTH_RESOURCE_METADATA[resourceKey];
}

export function restoreSyntheticResourceDescriptor(resourceKey: string) {
	const original = suppressedResourceEntries.get(resourceKey);
	if (original) {
		SYNTH_RESOURCE_METADATA[resourceKey] = original;
	} else {
		delete SYNTH_RESOURCE_METADATA[resourceKey];
	}
	suppressedResourceEntries.delete(resourceKey);
}

export {
	SYNTH_ATTACK,
	SYNTH_PLUNDER,
	SYNTH_BUILDING_ATTACK,
	SYNTH_PARTIAL_ATTACK,
	SYNTH_BUILDING,
	PLUNDER_HAPPINESS_AMOUNT,
	WAR_WEARINESS_GAIN,
	BUILDING_REWARD_GOLD,
	PLUNDER_PERCENT,
	TIER_RESOURCE_KEY,
};

export type { EffectDef };
