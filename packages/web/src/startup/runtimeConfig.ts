import type {
	SessionSnapshotMetadata,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import type {
	StartConfig,
	PhaseConfig,
	RuleSet,
} from '@kingdom-builder/protocol';
import { RULES, PHASES, GAME_START } from '@kingdom-builder/contents';
import {
	DEFAULT_REGISTRIES,
	DEFAULT_REGISTRY_METADATA,
} from '../contexts/defaultRegistryMetadata';

type ResourceRecord = Record<string, SessionResourceDefinition>;

export interface RuntimeBootstrapConfig {
	metadata?: SessionSnapshotMetadata;
	resources?: ResourceRecord;
	primaryResourceKey?: string | null;
	rules?: RuleSet;
	phases?: PhaseConfig[];
	start?: StartConfig;
}

declare global {
	// eslint-disable-next-line no-var
	var __KINGDOM_RUNTIME_CONFIG__:
		| RuntimeBootstrapConfig
		| Promise<RuntimeBootstrapConfig>
		| undefined;
}

const DEFAULT_CONFIG: RuntimeBootstrapConfig = {
	metadata: DEFAULT_REGISTRY_METADATA,
	resources: DEFAULT_REGISTRIES.resources,
	rules: RULES,
	phases: PHASES,
	start: GAME_START,
};

function isPromise(
	value: RuntimeBootstrapConfig | Promise<RuntimeBootstrapConfig>,
): value is Promise<RuntimeBootstrapConfig> {
	return typeof (value as Promise<RuntimeBootstrapConfig>)?.then === 'function';
}

function mergeWithDefault(
	config: RuntimeBootstrapConfig | undefined,
): RuntimeBootstrapConfig {
	if (!config) {
		return DEFAULT_CONFIG;
	}
	return {
		...DEFAULT_CONFIG,
		...config,
	};
}

export async function loadRuntimeConfig(): Promise<RuntimeBootstrapConfig> {
	const runtimeConfig = globalThis.__KINGDOM_RUNTIME_CONFIG__;
	if (!runtimeConfig) {
		return DEFAULT_CONFIG;
	}
	if (isPromise(runtimeConfig)) {
		try {
			const resolved = await runtimeConfig;
			return mergeWithDefault(resolved);
		} catch (error) {
			console.error('Failed to load runtime configuration.', error);
			return DEFAULT_CONFIG;
		}
	}
	return mergeWithDefault(runtimeConfig);
}
