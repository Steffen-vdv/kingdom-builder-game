import { createEngine } from '@kingdom-builder/engine';
import type { EffectDef } from '@kingdom-builder/protocol';
import { createContentFactory } from '@kingdom-builder/testing';
import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol/session';

import type { SessionRegistries } from '../../src/state/sessionRegistries';
import { createTranslationContextForEngine } from '../helpers/createTranslationContextForEngine';
import { ensureRequiredTranslationAssets } from './translationAssets';
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
	const engineContext = createEngine({
		actions: factory.actions,
		buildings: factory.buildings,
		developments: factory.developments,
		populations: factory.populations,
		phases: PHASES,
		start: START,
		rules: RULES,
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

function buildResourceMetadata(): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const entry of Object.values(SYNTH_RESOURCE_METADATA)) {
		descriptors[entry.key] = { icon: entry.icon, label: entry.label };
	}
	return descriptors;
}

function buildPopulationMetadata(
	engineContext: ReturnType<typeof createBaseEngine>['engineContext'],
): Record<string, SessionMetadataDescriptor> {
	const descriptors: Record<string, SessionMetadataDescriptor> = {};
	for (const population of engineContext.populations.values()) {
		const descriptor: SessionMetadataDescriptor = {};
		if (population.icon) {
			descriptor.icon = population.icon;
		}
		if (population.name) {
			descriptor.label = population.name;
		}
		descriptors[population.id] = descriptor;
	}
	return descriptors;
}

export function createSyntheticEngineContext() {
	const { factory, engineContext } = createBaseEngine();
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
		{
			metadata: ensureRequiredTranslationAssets({
				resources: buildResourceMetadata(),
				populations: buildPopulationMetadata(engineContext),
				stats: statMetadata,
			}),
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
		statMetadata: SYNTH_STAT_METADATA,
	} as const;
}
export function createPartialStatEngineContext() {
	const { factory, engineContext } = createBaseEngine();
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
		engineContext,
		(registries) => {
			const raid = engineContext.actions.get(attack.id);
			if (raid) {
				registries.actions.add(raid.id, { ...raid });
			}
			registerSyntheticResources(registries);
		},
		{
			metadata: ensureRequiredTranslationAssets({
				resources: buildResourceMetadata(),
				populations: buildPopulationMetadata(engineContext),
				stats: statMetadata,
			}),
		},
	);
	return {
		engineContext,
		translation,
		attack,
		resourceMetadata: SYNTH_RESOURCE_METADATA,
		statMetadata: SYNTH_STAT_METADATA,
	} as const;
}

export function getStat(
	context: Pick<TranslationContext, 'assets'>,
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
