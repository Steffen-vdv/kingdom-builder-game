import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
	SessionRuntimeConfigResponse,
	ResourceV2Definition,
	ResourceV2GroupMetadata,
} from '@kingdom-builder/protocol';
import { runtimeConfigResponseSchema } from '@kingdom-builder/protocol';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';
import { clone } from '../state/clone';

export interface RuntimeContentConfig {
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	resources: Record<string, SessionResourceDefinition>;
	resourcesV2: Record<string, ResourceV2Definition>;
	resourceGroups: Record<string, ResourceV2GroupMetadata>;
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

function normalizeResourceV2Definitions(
	resources: Record<string, ResourceV2Definition> | undefined,
): Record<string, ResourceV2Definition> {
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

function normalizeResourceGroupMetadata(
	groups: Record<string, ResourceV2GroupMetadata> | undefined,
): Record<string, ResourceV2GroupMetadata> {
	if (!groups) {
		return {};
	}
	return Object.fromEntries(
		Object.entries(groups).map(([key, definition]) => [key, clone(definition)]),
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
			const resourcesV2 = normalizeResourceV2Definitions(
				overrides?.resourcesV2 ?? base.resourcesV2,
			);
			const resourceGroups = normalizeResourceGroupMetadata(
				overrides?.resourceGroups ?? base.resourceGroups,
			);
			const primaryIconId =
				overrides?.primaryIconId ?? base.primaryIconId ?? null;
			const config: RuntimeContentConfig = {
				phases,
				start,
				rules,
				resources,
				resourcesV2,
				resourceGroups,
				primaryIconId,
			};
			Object.freeze(config);
			return config;
		})();
	}
	return resolvedConfigPromise;
}
