import type { EngineSession, PlayerId } from '@kingdom-builder/engine';
import type { DeveloperPresetConfig } from '../startup/runtimeConfig';
import type { SessionRegistries } from './sessionRegistries';

const DEFAULT_TARGET_LAND_COUNT = 5;

interface DeveloperModeOptions {
	registries: Pick<
		SessionRegistries,
		'developments' | 'buildings' | 'populations' | 'resources'
	>;
	preset?: DeveloperPresetConfig;
}

interface DeveloperPresetPlan {
	resources?: Array<{ key: string; target: number }>;
	population?: Array<{ role: string; count: number }>;
	landCount?: number;
	developments?: string[];
	buildings?: string[];
}

function toFinitePositive(value: number | undefined): number | undefined {
	if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
		return undefined;
	}
	return value;
}

function buildResourceTargets(
	registries: DeveloperModeOptions['registries'],
	preset: DeveloperPresetConfig | undefined,
): Array<{ key: string; target: number }> {
	if (!preset?.resourceTargets) {
		return [];
	}
	const targets: Array<{ key: string; target: number }> = [];
	for (const entry of preset.resourceTargets) {
		if (!entry || typeof entry.key !== 'string') {
			continue;
		}
		const target = toFinitePositive(entry.target);
		if (!target) {
			continue;
		}
		if (!registries.resources[entry.key]) {
			continue;
		}
		targets.push({ key: entry.key, target });
	}
	return targets;
}

function buildPopulationPlan(
	registries: DeveloperModeOptions['registries'],
	preset: DeveloperPresetConfig | undefined,
): Array<{ role: string; count: number }> {
	if (!preset?.populationPlan) {
		return [];
	}
	const plan: Array<{ role: string; count: number }> = [];
	for (const entry of preset.populationPlan) {
		if (!entry || typeof entry.role !== 'string') {
			continue;
		}
		const count = toFinitePositive(entry.count);
		if (!count) {
			continue;
		}
		if (!registries.populations.has(entry.role)) {
			continue;
		}
		plan.push({ role: entry.role, count });
	}
	return plan;
}

function buildDevelopmentPlan(
	registries: DeveloperModeOptions['registries'],
	preset: DeveloperPresetConfig | undefined,
): string[] {
	const presetIds =
		preset?.developments?.filter((id) => registries.developments.has(id)) ?? [];
	if (presetIds.length > 0) {
		return [...presetIds];
	}
	const identifiers: string[] = [];
	for (const [identifier, definition] of registries.developments.entries()) {
		if (definition?.system) {
			continue;
		}
		identifiers.push(identifier);
	}
	identifiers.sort((left, right) => {
		const leftOrder = resolveOrderingValue(registries.developments.get(left));
		const rightOrder = resolveOrderingValue(registries.developments.get(right));
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}
		return left.localeCompare(right);
	});
	return identifiers;
}

function buildBuildingPlan(
	registries: DeveloperModeOptions['registries'],
	preset: DeveloperPresetConfig | undefined,
): string[] {
	if (!preset?.buildings) {
		return [];
	}
	return preset.buildings.filter((id) => registries.buildings.has(id));
}

function createDeveloperPresetPlan(
	options: DeveloperModeOptions,
): DeveloperPresetPlan | null {
	const resources = buildResourceTargets(options.registries, options.preset);
	const population = buildPopulationPlan(options.registries, options.preset);
	const developments = buildDevelopmentPlan(options.registries, options.preset);
	const buildings = buildBuildingPlan(options.registries, options.preset);
	const explicitLandCount = toFinitePositive(options.preset?.landCount);
	if (
		resources.length === 0 &&
		population.length === 0 &&
		!explicitLandCount &&
		developments.length === 0 &&
		buildings.length === 0
	) {
		return null;
	}
	const plan: DeveloperPresetPlan = {};
	if (resources.length > 0) {
		plan.resources = resources;
	}
	if (population.length > 0) {
		plan.population = population;
	}
	const resolvedLandCount =
		explicitLandCount ??
		Math.max(DEFAULT_TARGET_LAND_COUNT, developments.length);
	if (
		typeof resolvedLandCount === 'number' &&
		Number.isFinite(resolvedLandCount)
	) {
		plan.landCount = resolvedLandCount;
	}
	if (developments.length > 0) {
		plan.developments = developments;
	}
	if (buildings.length > 0) {
		plan.buildings = buildings;
	}
	return plan;
}

function resolveOrderingValue(definition: unknown): number {
	if (
		definition &&
		typeof definition === 'object' &&
		'order' in definition &&
		typeof (definition as { order?: unknown }).order === 'number'
	) {
		return (definition as { order: number }).order;
	}
	return Number.MAX_SAFE_INTEGER;
}

export function initializeDeveloperMode(
	session: EngineSession,
	playerId: PlayerId,
	options: DeveloperModeOptions,
): void {
	const plan = createDeveloperPresetPlan(options);
	if (!plan) {
		return;
	}
	const presetOptions: Parameters<EngineSession['applyDeveloperPreset']>[0] = {
		playerId,
	};
	if (plan.resources) {
		presetOptions.resources = plan.resources.map((entry) => ({ ...entry }));
	}
	if (plan.population) {
		presetOptions.population = plan.population.map((entry) => ({ ...entry }));
	}
	if (typeof plan.landCount === 'number') {
		presetOptions.landCount = plan.landCount;
	}
	if (plan.developments) {
		presetOptions.developments = [...plan.developments];
	}
	if (plan.buildings) {
		presetOptions.buildings = [...plan.buildings];
	}
	session.applyDeveloperPreset(presetOptions);
}

export type { DeveloperModeOptions };
