import type {
	PhaseConfig,
	ResourceDefinition,
	ResourceGroupDefinition,
	RuleSet,
	SessionRuntimeConfigResponse,
} from '@kingdom-builder/protocol';
import { runtimeConfigResponseSchema } from '@kingdom-builder/protocol';
import { clone } from '../state/clone';

export interface RuntimeContentConfig {
	phases: PhaseConfig[];
	rules: RuleSet;
	resources: Record<string, ResourceDefinition>;
	resourceGroups: Record<string, ResourceGroupDefinition>;
	primaryIconId?: string | null;
}

type RuntimeConfigSource = Partial<RuntimeContentConfig>;

declare global {
	var __KINGDOM_BUILDER_CONFIG__: RuntimeConfigSource | undefined;
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
			const rules = overrides?.rules
				? clone(overrides.rules)
				: clone(base.rules);
			const resources = normalizeResourceCatalogDefinitions(
				overrides?.resources ?? base.resources,
			);
			const resourceGroups = normalizeResourceCatalogDefinitions(
				overrides?.resourceGroups ?? base.resourceGroups,
			);
			const primaryIconId =
				overrides?.primaryIconId ?? base.primaryIconId ?? null;
			const config: RuntimeContentConfig = {
				phases,
				rules,
				resources,
				resourceGroups,
				primaryIconId,
			};
			Object.freeze(config);
			return config;
		})();
	}
	return resolvedConfigPromise;
}
