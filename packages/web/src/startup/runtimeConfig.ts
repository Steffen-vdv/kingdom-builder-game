import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { DeveloperPresetOptions } from '@kingdom-builder/engine';

export type DeveloperPresetConfig = Omit<DeveloperPresetOptions, 'playerId'>;

export interface RuntimeResourceDescriptor {
	icon?: string;
	label?: string;
	description?: string;
}

export interface RuntimeConfig {
	primaryIconResourceId?: string | null;
	resourceMetadata?: Record<string, RuntimeResourceDescriptor | undefined>;
	phases?: PhaseConfig[];
	startConfig?: StartConfig;
	ruleSet?: RuleSet;
	developerPreset?: DeveloperPresetConfig;
}

type RuntimeConfigSource =
	| RuntimeConfig
	| (() => RuntimeConfig | Promise<RuntimeConfig | null | undefined>)
	| null
	| undefined;

declare global {
	interface Window {
		__KINGDOM_BUILDER_RUNTIME__?: RuntimeConfigSource;
	}
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace globalThis {
		// eslint-disable-next-line no-var
		var __KINGDOM_BUILDER_RUNTIME__: RuntimeConfigSource | undefined;
	}
}

let runtimeConfig: RuntimeConfig | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
	if (runtimeConfig) {
		return runtimeConfig;
	}
	const globalWindow = typeof window === 'undefined' ? undefined : window;
	const source =
		globalThis.__KINGDOM_BUILDER_RUNTIME__ ??
		globalWindow?.__KINGDOM_BUILDER_RUNTIME__;
	if (typeof source === 'function') {
		const resolved = await source();
		runtimeConfig = resolved ? { ...resolved } : {};
		return runtimeConfig;
	}
	if (source) {
		runtimeConfig = { ...source };
		return runtimeConfig;
	}
	runtimeConfig = {};
	return runtimeConfig;
}

export function setRuntimeConfig(config: RuntimeConfig | null): void {
	runtimeConfig = config ? { ...config } : {};
}

export function getRuntimeConfig(): RuntimeConfig {
	return runtimeConfig ?? {};
}
