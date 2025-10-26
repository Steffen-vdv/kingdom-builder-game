import type {
	PhaseConfig,
	ResourceV2Definition,
	ResourceV2GroupDefinition,
	RuleSet,
	SessionResourceDefinition,
	SessionRuntimeConfigResponse,
	StartConfig,
} from '@kingdom-builder/protocol';
import { runtimeConfigResponseSchema } from '@kingdom-builder/protocol';
import { clone } from '../state/clone';

export interface RuntimeContentConfig {
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	resources: Record<string, SessionResourceDefinition>;
	resourcesV2: Record<string, ResourceV2Definition>;
	resourceGroupsV2: Record<string, ResourceV2GroupDefinition>;
	primaryIconId?: string | null;
}

type RuntimeConfigSource = Partial<RuntimeContentConfig>;

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

function normalizeResourceCatalogDefinitions<DefinitionType>(
	registry: Record<string, DefinitionType> | undefined,
): Record<string, DefinitionType> {
	if (!registry) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(registry).map(([id, definition]) => [id, clone(definition)]),
	);
}

function readRuntimeConfig(): RuntimeConfigSource | undefined {
	const globalConfig =
		typeof globalThis !== 'undefined'
			? (globalThis as { __KINGDOM_BUILDER_CONFIG__?: RuntimeConfigSource })
			: undefined;
	return globalConfig?.__KINGDOM_BUILDER_CONFIG__;
}

async function fetchRuntimeConfig(): Promise<SessionRuntimeConfigResponse> {
	let response: Response;
	try {
		response = await fetch('/runtime-config', {
			credentials: 'same-origin',
		});
	} catch (error) {
		throw new Error('Failed to request runtime configuration.', {
			cause: error,
		});
	}
	if (!response.ok) {
		throw new Error(
			`Runtime configuration request failed with status ${response.status}.`,
		);
	}
	let payload: unknown;
	try {
		payload = await response.json();
	} catch (error) {
		throw new Error('Unable to parse runtime configuration response.', {
			cause: error,
		});
	}
	const parsed = runtimeConfigResponseSchema.safeParse(payload);
	if (!parsed.success) {
		throw new Error('Received invalid runtime configuration payload.', {
			cause: parsed.error,
		});
	}
	return parsed.data;
}

let resolvedConfigPromise: Promise<RuntimeContentConfig> | null = null;

export async function getRuntimeContentConfig(): Promise<RuntimeContentConfig> {
	if (!resolvedConfigPromise) {
		resolvedConfigPromise = (async () => {
			const overrides = readRuntimeConfig();
			const base = await fetchRuntimeConfig();
			const phases = overrides?.phases
				? clone(overrides.phases)
				: clone(base.phases);
			const start = overrides?.start
				? clone(overrides.start)
				: clone(base.start);
			const rules = overrides?.rules
				? clone(overrides.rules)
				: clone(base.rules);
			const resources = normalizeResourceDefinitions(
				overrides?.resources ?? base.resources,
			);
			const resourcesV2 = normalizeResourceCatalogDefinitions(
				overrides?.resourcesV2 ?? base.resourcesV2,
			);
			const resourceGroupsV2 = normalizeResourceCatalogDefinitions(
				overrides?.resourceGroupsV2 ?? base.resourceGroupsV2,
			);
			const primaryIconId =
				overrides?.primaryIconId ?? base.primaryIconId ?? null;
			const config: RuntimeContentConfig = {
				phases,
				start,
				rules,
				resources,
				resourcesV2,
				resourceGroupsV2,
				primaryIconId,
			};
			Object.freeze(config);
			return config;
		})();
	}
	return resolvedConfigPromise;
}
