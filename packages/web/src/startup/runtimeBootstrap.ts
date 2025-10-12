import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import { createDefaultBootstrapConfig } from './defaultBootstrap';

export interface IconSource {
	icon?: string;
	label?: string;
	description?: string;
}

export interface DeveloperPresetConfig {
	resources?: Array<{ key: string; target: number }>;
	population?: Array<{ role: string; count: number }>;
	developments?: string[];
	buildings?: string[];
	landCount?: number;
}

export interface RuntimeBootstrapConfig {
	primaryResourceId?: string | null;
	resourceMetadata: Record<string, IconSource>;
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	developerPreset?: DeveloperPresetConfig;
}

export type RuntimeBootstrapOverrides = Partial<RuntimeBootstrapConfig> & {
	resourceMetadata?: Record<string, IconSource | undefined>;
	developerPreset?: DeveloperPresetConfig;
};

const GLOBAL_RUNTIME_KEY = '__KINGDOM_BUILDER_RUNTIME__';

function clonePhases(phases: PhaseConfig[]): PhaseConfig[] {
	return structuredClone(phases);
}

function cloneStart(start: StartConfig): StartConfig {
	return structuredClone(start);
}

function cloneRules(rules: RuleSet): RuleSet {
	return structuredClone(rules);
}

function cloneDeveloperPreset(
	preset: DeveloperPresetConfig | undefined,
): DeveloperPresetConfig | undefined {
	if (!preset) {
		return undefined;
	}
	const cloned: DeveloperPresetConfig = {};
	if (preset.resources) {
		cloned.resources = preset.resources.map((entry) => ({ ...entry }));
	}
	if (preset.population) {
		cloned.population = preset.population.map((entry) => ({ ...entry }));
	}
	if (preset.developments) {
		cloned.developments = [...preset.developments];
	}
	if (preset.buildings) {
		cloned.buildings = [...preset.buildings];
	}
	if (preset.landCount !== undefined) {
		cloned.landCount = preset.landCount;
	}
	return cloned;
}

function mergeDeveloperPreset(
	basePreset: DeveloperPresetConfig | undefined,
	overrides: DeveloperPresetConfig | undefined,
): DeveloperPresetConfig | undefined {
	if (!overrides) {
		return cloneDeveloperPreset(basePreset);
	}
	const merged: DeveloperPresetConfig = {};
	const base = cloneDeveloperPreset(basePreset);
	if (base?.resources) {
		merged.resources = base.resources.map((entry) => ({ ...entry }));
	}
	if (base?.population) {
		merged.population = base.population.map((entry) => ({ ...entry }));
	}
	if (base?.developments) {
		merged.developments = [...base.developments];
	}
	if (base?.buildings) {
		merged.buildings = [...base.buildings];
	}
	if (base?.landCount !== undefined) {
		merged.landCount = base.landCount;
	}
	if (overrides.resources) {
		merged.resources = overrides.resources.map((entry) => ({ ...entry }));
	}
	if (overrides.population) {
		merged.population = overrides.population.map((entry) => ({ ...entry }));
	}
	if (overrides.developments) {
		merged.developments = [...overrides.developments];
	}
	if (overrides.buildings) {
		merged.buildings = [...overrides.buildings];
	}
	if (overrides.landCount !== undefined) {
		merged.landCount = overrides.landCount;
	}
	return merged;
}

function mergeResourceMetadata(
	base: Record<string, IconSource>,
	overrides: Record<string, IconSource | undefined> | undefined,
): Record<string, IconSource> {
	const metadata: Record<string, IconSource> = { ...base };
	if (!overrides) {
		return metadata;
	}
	for (const [key, descriptor] of Object.entries(overrides)) {
		if (!descriptor) {
			continue;
		}
		metadata[key] = { ...descriptor };
	}
	return metadata;
}

function mergeBootstrap(
	base: RuntimeBootstrapConfig,
	overrides: RuntimeBootstrapOverrides | undefined,
): RuntimeBootstrapConfig {
	if (!overrides) {
		const developerPreset = cloneDeveloperPreset(base.developerPreset);
		const result: RuntimeBootstrapConfig = {
			primaryResourceId: base.primaryResourceId ?? null,
			resourceMetadata: mergeResourceMetadata(base.resourceMetadata, undefined),
			phases: clonePhases(base.phases),
			start: cloneStart(base.start),
			rules: cloneRules(base.rules),
		};
		if (developerPreset) {
			result.developerPreset = developerPreset;
		}
		return result;
	}
	const developerPreset = mergeDeveloperPreset(
		base.developerPreset,
		overrides.developerPreset,
	);
	const result: RuntimeBootstrapConfig = {
		primaryResourceId:
			overrides.primaryResourceId !== undefined
				? overrides.primaryResourceId
				: (base.primaryResourceId ?? null),
		resourceMetadata: mergeResourceMetadata(
			base.resourceMetadata,
			overrides.resourceMetadata,
		),
		phases: clonePhases(overrides.phases ?? base.phases),
		start: cloneStart(overrides.start ?? base.start),
		rules: cloneRules(overrides.rules ?? base.rules),
	};
	if (developerPreset) {
		result.developerPreset = developerPreset;
	}
	return result;
}
function resolveRuntimeOverrides(): RuntimeBootstrapOverrides | undefined {
	if (typeof window === 'undefined') {
		return undefined;
	}
	const runtimeWindow = window as typeof window & {
		[GLOBAL_RUNTIME_KEY]?: RuntimeBootstrapOverrides;
	};
	return runtimeWindow[GLOBAL_RUNTIME_KEY];
}

export function resolveRuntimeBootstrap(): RuntimeBootstrapConfig {
	const base = createDefaultBootstrapConfig();
	const overrides = resolveRuntimeOverrides();
	return mergeBootstrap(base, overrides);
}

let bootstrapPromise: Promise<RuntimeBootstrapConfig> | null = null;

export function loadRuntimeBootstrap(): Promise<RuntimeBootstrapConfig> {
	if (!bootstrapPromise) {
		bootstrapPromise = Promise.resolve(resolveRuntimeBootstrap());
	}
	return bootstrapPromise;
}
