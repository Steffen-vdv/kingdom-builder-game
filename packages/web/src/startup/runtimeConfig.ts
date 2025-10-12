import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { SessionResourceDefinition } from '@kingdom-builder/protocol/session';

export interface DeveloperPresetConfig {
	resourceTargets?: Array<{ key: string; target: number }>;
	populationPlan?: Array<{ role: string; count: number }>;
	landCount?: number;
	developments?: string[];
	buildings?: string[];
}

export interface LegacyContentConfig {
	phases: PhaseConfig[];
	start: StartConfig;
	rules: RuleSet;
	resources: Record<string, SessionResourceDefinition>;
	primaryIconId?: string | null;
	developerPreset?: DeveloperPresetConfig;
}

type RuntimeConfigSource = Partial<LegacyContentConfig>;

declare global {
	// eslint-disable-next-line no-var
	var __KINGDOM_BUILDER_CONFIG__: RuntimeConfigSource | undefined;
}

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

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

function normalizeDeveloperPreset(
	preset: DeveloperPresetConfig | undefined,
): DeveloperPresetConfig | undefined {
	if (!preset) {
		return undefined;
	}
	const normalized: DeveloperPresetConfig = {};
	let hasValues = false;
	if (Array.isArray(preset.resourceTargets)) {
		normalized.resourceTargets = preset.resourceTargets
			.filter(
				(entry) =>
					typeof entry?.key === 'string' && numberIsFinite(entry?.target),
			)
			.map((entry) => ({ key: entry.key, target: entry.target }));
		if (normalized.resourceTargets.length > 0) {
			hasValues = true;
		} else {
			delete normalized.resourceTargets;
		}
	}
	if (Array.isArray(preset.populationPlan)) {
		normalized.populationPlan = preset.populationPlan
			.filter(
				(entry) =>
					typeof entry?.role === 'string' && numberIsFinite(entry?.count),
			)
			.map((entry) => ({ role: entry.role, count: entry.count }));
		if (normalized.populationPlan.length > 0) {
			hasValues = true;
		} else {
			delete normalized.populationPlan;
		}
	}
	if (typeof preset.landCount === 'number') {
		normalized.landCount = preset.landCount;
		hasValues = true;
	}
	if (Array.isArray(preset.developments)) {
		const developmentIds = preset.developments.filter(
			(id): id is string => typeof id === 'string',
		);
		if (developmentIds.length > 0) {
			normalized.developments = developmentIds;
			hasValues = true;
		}
	}
	if (Array.isArray(preset.buildings)) {
		const buildingIds = preset.buildings.filter(
			(id): id is string => typeof id === 'string',
		);
		if (buildingIds.length > 0) {
			normalized.buildings = buildingIds;
			hasValues = true;
		}
	}
	if (!hasValues) {
		return undefined;
	}
	return normalized;
}

function numberIsFinite(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function readRuntimeConfig(): RuntimeConfigSource | undefined {
	const globalConfig =
		typeof globalThis !== 'undefined'
			? (globalThis as { __KINGDOM_BUILDER_CONFIG__?: RuntimeConfigSource })
			: undefined;
	return globalConfig?.__KINGDOM_BUILDER_CONFIG__;
}

async function loadFallbackConfig(): Promise<LegacyContentConfig> {
	const contents = await import('@kingdom-builder/contents');
	const developmentRegistry = contents.createDevelopmentRegistry();
	const developmentIds: string[] = [];
	for (const [identifier, definition] of developmentRegistry.entries()) {
		if (definition?.system) {
			continue;
		}
		developmentIds.push(identifier);
	}
	developmentIds.sort((left, right) => {
		const leftOrder =
			typeof developmentRegistry.get(left)?.order === 'number'
				? (developmentRegistry.get(left)?.order as number)
				: Number.MAX_SAFE_INTEGER;
		const rightOrder =
			typeof developmentRegistry.get(right)?.order === 'number'
				? (developmentRegistry.get(right)?.order as number)
				: Number.MAX_SAFE_INTEGER;
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}
		return left.localeCompare(right);
	});
	const fallbackResources = Object.fromEntries(
		Object.entries(contents.RESOURCES).map(([key, definition]) => {
			const entry: SessionResourceDefinition = { key };
			if (definition.icon !== undefined) {
				entry.icon = definition.icon;
			}
			if (definition.label !== undefined) {
				entry.label = definition.label;
			}
			if (definition.description !== undefined) {
				entry.description = definition.description;
			}
			if (definition.tags && definition.tags.length > 0) {
				entry.tags = [...definition.tags];
			}
			return [key, entry];
		}),
	);
	return {
		phases: clone(contents.PHASES),
		start: clone(contents.GAME_START),
		rules: clone(contents.RULES),
		resources: fallbackResources,
		primaryIconId: contents.PRIMARY_ICON_ID ?? null,
		developerPreset: {
			resourceTargets: [
				{ key: contents.Resource.gold, target: 100 },
				{ key: contents.Resource.happiness, target: 10 },
			],
			populationPlan: [
				{ role: contents.PopulationRole.Council, count: 2 },
				{ role: contents.PopulationRole.Legion, count: 1 },
				{ role: contents.PopulationRole.Fortifier, count: 1 },
			],
			landCount: 5,
			developments: developmentIds,
			buildings: [contents.BuildingId.Mill],
		},
	};
}

let resolvedConfigPromise: Promise<LegacyContentConfig> | null = null;

export async function getLegacyContentConfig(): Promise<LegacyContentConfig> {
	if (!resolvedConfigPromise) {
		resolvedConfigPromise = (async () => {
			const runtimeConfig = readRuntimeConfig();
			let fallback: LegacyContentConfig | null = null;
			const requireFallback = async (): Promise<LegacyContentConfig> => {
				if (!fallback) {
					fallback = await loadFallbackConfig();
				}
				return fallback;
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
			const developerPreset = normalizeDeveloperPreset(
				runtimeConfig?.developerPreset ??
					(await requireFallback()).developerPreset,
			);
			const config: LegacyContentConfig = {
				phases,
				start,
				rules,
				resources,
				primaryIconId,
			};
			if (developerPreset) {
				config.developerPreset = developerPreset;
			}
			Object.freeze(config);
			return config;
		})();
	}
	return resolvedConfigPromise;
}
