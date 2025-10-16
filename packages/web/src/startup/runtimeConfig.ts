import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import fallbackConfigJson from './runtimeConfigFallback.json';
import { clone } from '../state/clone';

export interface LegacyContentConfig {
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	resources: Record<string, SessionResourceDefinition>;
	primaryIconId?: string | null;
}

type RuntimeConfigSource = Partial<LegacyContentConfig>;

declare global {
	var __KINGDOM_BUILDER_CONFIG__: RuntimeConfigSource | undefined;
}

function normalizeResourceDefinitions(
	resources: Record<string, SessionResourceDefinition> | undefined,
): Record<string, SessionResourceDefinition> {
	if (!resources) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(resources).map(([key, definition]) => [
			key,
			clone(definition),
		]),
	);
}

function readRuntimeConfig(): RuntimeConfigSource | undefined {
	const globalConfig =
		typeof globalThis !== 'undefined'
			? (globalThis as { __KINGDOM_BUILDER_CONFIG__?: RuntimeConfigSource })
			: undefined;
	return globalConfig?.__KINGDOM_BUILDER_CONFIG__;
}

const FALLBACK_CONFIG = fallbackConfigJson as LegacyContentConfig;

function loadFallbackConfig(): LegacyContentConfig {
	return clone(FALLBACK_CONFIG);
}

let resolvedConfigPromise: Promise<LegacyContentConfig> | null = null;

export async function getLegacyContentConfig(): Promise<LegacyContentConfig> {
	if (!resolvedConfigPromise) {
		resolvedConfigPromise = (async () => {
			const runtimeConfig = readRuntimeConfig();
			let fallback: LegacyContentConfig | null = null;
			const requireFallback = (): Promise<LegacyContentConfig> => {
				if (!fallback) {
					fallback = loadFallbackConfig();
				}
				return Promise.resolve(fallback);
			};
			const phases = runtimeConfig?.phases
				? clone(runtimeConfig.phases)
				: clone((await requireFallback()).phases);
			const start = runtimeConfig?.start
				? clone(runtimeConfig.start)
				: clone((await requireFallback()).start);
			const rules = runtimeConfig?.rules
				? clone(runtimeConfig.rules)
				: clone((await requireFallback()).rules);
			const resources = normalizeResourceDefinitions(
				runtimeConfig?.resources ?? (await requireFallback()).resources,
			);
			const primaryIconId =
				runtimeConfig?.primaryIconId ??
				(await requireFallback()).primaryIconId ??
				null;
			const config: LegacyContentConfig = {
				phases,
				start,
				rules,
				resources,
				primaryIconId,
			};
			Object.freeze(config);
			return config;
		})();
	}
	return resolvedConfigPromise;
}
