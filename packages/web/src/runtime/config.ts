import type { RuleSet } from '@kingdom-builder/protocol';
import type {
	RuntimeConfig,
	EngineBootstrapOptions,
	DeveloperPresetConfig,
	PrimaryIconConfig,
} from './types';
import {
	DEFAULT_ENGINE_BOOTSTRAP,
	DEFAULT_RUNTIME_CONFIG,
} from './defaultRuntimeConfig';

type ConfigSource =
	| RuntimeConfig
	| (() => RuntimeConfig | Promise<RuntimeConfig>);

interface ConfigWindow extends Window {
	__KINGDOM_CONFIG__?: ConfigSource;
}

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

let runtimeConfig: RuntimeConfig = clone(DEFAULT_RUNTIME_CONFIG);
let engineBootstrap: EngineBootstrapOptions = clone(DEFAULT_ENGINE_BOOTSTRAP);
let loadPromise: Promise<RuntimeConfig> | null = null;

function mergePrimaryIcon(
	base: PrimaryIconConfig | undefined,
	override: PrimaryIconConfig | undefined,
): PrimaryIconConfig | undefined {
	if (!base && !override) {
		return undefined;
	}
	const result: PrimaryIconConfig = {};
	const resolved = { ...base, ...override };
	if (resolved.icon !== undefined) {
		result.icon = resolved.icon;
	}
	if (resolved.resourceKey !== undefined) {
		result.resourceKey = resolved.resourceKey;
	}
	return result;
}

function mergeRecord(
	base: Record<string, number> | undefined,
	override: Record<string, number> | undefined,
): Record<string, number> | undefined {
	if (!base && !override) {
		return undefined;
	}
	const result: Record<string, number> = {};
	if (base) {
		for (const [key, value] of Object.entries(base)) {
			result[key] = value;
		}
	}
	if (override) {
		for (const [key, value] of Object.entries(override)) {
			result[key] = value;
		}
	}
	return result;
}

function mergeRuleSet(base: RuleSet, override: RuleSet | undefined): RuleSet {
	const result = clone(base);
	if (!override) {
		return result;
	}
	const overrides = override as Partial<RuleSet>;
	if (overrides.defaultActionAPCost !== undefined) {
		result.defaultActionAPCost = overrides.defaultActionAPCost;
	}
	if (overrides.absorptionCapPct !== undefined) {
		result.absorptionCapPct = overrides.absorptionCapPct;
	}
	if (overrides.absorptionRounding !== undefined) {
		result.absorptionRounding = overrides.absorptionRounding;
	}
	if (overrides.tieredResourceKey !== undefined) {
		result.tieredResourceKey = overrides.tieredResourceKey;
	}
	if (overrides.tierDefinitions !== undefined) {
		result.tierDefinitions = clone(overrides.tierDefinitions);
	}
	if (overrides.slotsPerNewLand !== undefined) {
		result.slotsPerNewLand = overrides.slotsPerNewLand;
	}
	if (overrides.maxSlotsPerLand !== undefined) {
		result.maxSlotsPerLand = overrides.maxSlotsPerLand;
	}
	if (overrides.basePopulationCap !== undefined) {
		result.basePopulationCap = overrides.basePopulationCap;
	}
	if (overrides.winConditions !== undefined) {
		result.winConditions = clone(overrides.winConditions);
	}
	return result;
}

function mergeDeveloperPreset(
	base: DeveloperPresetConfig | undefined,
	override: DeveloperPresetConfig | undefined,
): DeveloperPresetConfig | undefined {
	if (!base && !override) {
		return undefined;
	}
	const result: DeveloperPresetConfig = {};
	if (base || override) {
		const mergedResources = mergeRecord(
			base?.resourceTargets,
			override?.resourceTargets,
		);
		if (mergedResources) {
			result.resourceTargets = mergedResources;
		}
		const mergedPopulation = mergeRecord(
			base?.population,
			override?.population,
		);
		if (mergedPopulation) {
			result.population = mergedPopulation;
		}
		const buildingIds = override?.buildingIds ?? base?.buildingIds ?? undefined;
		if (buildingIds !== undefined) {
			result.buildingIds = [...buildingIds];
		}
		if (override?.landCount !== undefined) {
			result.landCount = override.landCount;
		} else if (base?.landCount !== undefined) {
			result.landCount = base.landCount;
		}
		if (override?.skipIfBuildingPresent !== undefined) {
			result.skipIfBuildingPresent = override.skipIfBuildingPresent;
		} else if (base?.skipIfBuildingPresent !== undefined) {
			result.skipIfBuildingPresent = base.skipIfBuildingPresent;
		}
	}
	return result;
}

function mergeEngineBootstrap(
	base: EngineBootstrapOptions,
	override: Partial<EngineBootstrapOptions> | undefined,
): EngineBootstrapOptions {
	if (!override) {
		return clone(base);
	}
	const mergedRules = mergeRuleSet(base.rules, override.rules);
	return {
		phases: override.phases ? clone(override.phases) : clone(base.phases),
		start: override.start ? clone(override.start) : clone(base.start),
		rules: mergedRules,
	};
}

function applyRuntimeConfig(config: RuntimeConfig): void {
	const current = runtimeConfig;
	const nextConfig: RuntimeConfig = {};
	const primaryIcon = mergePrimaryIcon(current.primaryIcon, config.primaryIcon);
	if (primaryIcon) {
		nextConfig.primaryIcon = primaryIcon;
	}
	const developerPreset = mergeDeveloperPreset(
		current.developerPreset,
		config.developerPreset,
	);
	if (developerPreset) {
		nextConfig.developerPreset = developerPreset;
	}
	if (config.engine) {
		engineBootstrap = mergeEngineBootstrap(engineBootstrap, config.engine);
	}
	runtimeConfig = nextConfig;
}

export function getRuntimeConfig(): Readonly<RuntimeConfig> {
	return runtimeConfig;
}

export function setRuntimeConfig(config: RuntimeConfig): void {
	applyRuntimeConfig(config);
}

export function resetRuntimeConfig(): void {
	runtimeConfig = clone(DEFAULT_RUNTIME_CONFIG);
	engineBootstrap = clone(DEFAULT_ENGINE_BOOTSTRAP);
	loadPromise = null;
}

export function getEngineBootstrapOptions(): EngineBootstrapOptions {
	return engineBootstrap;
}

export function setEngineBootstrapOptions(
	options: Partial<EngineBootstrapOptions>,
): void {
	engineBootstrap = mergeEngineBootstrap(engineBootstrap, options);
}

async function readGlobalConfig(): Promise<RuntimeConfig | undefined> {
	if (typeof window === 'undefined') {
		return undefined;
	}
	const globalConfig = (window as ConfigWindow).__KINGDOM_CONFIG__;
	if (!globalConfig) {
		return undefined;
	}
	if (typeof globalConfig === 'function') {
		return await globalConfig();
	}
	return globalConfig;
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
	if (!loadPromise) {
		loadPromise = (async () => {
			const override = await readGlobalConfig();
			if (override) {
				applyRuntimeConfig(override);
			}
			return runtimeConfig;
		})();
	}
	return loadPromise;
}
