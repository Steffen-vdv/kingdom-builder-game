import type { EngineSession, PlayerId } from '@kingdom-builder/engine';
import type { DeveloperPresetConfig } from '../runtime/types';
import type { SessionRegistries } from './sessionRegistries';

interface ResourceTarget {
	key: string;
	target: number;
}

interface PopulationTarget {
	role: string;
	count: number;
}

function readDevelopmentOrder(definition: unknown): number {
	if (!definition || typeof definition !== 'object') {
		return Number.MAX_SAFE_INTEGER;
	}
	const order = (definition as { order?: unknown }).order;
	return typeof order === 'number' ? order : Number.MAX_SAFE_INTEGER;
}

function createDevelopmentPlan(
	registry: SessionRegistries['developments'],
): string[] {
	const entries: Array<{ id: string; order: number }> = [];
	for (const [id, definition] of registry.entries()) {
		entries.push({ id, order: readDevelopmentOrder(definition) });
	}
	entries.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.id.localeCompare(right.id);
	});
	return entries.map((entry) => entry.id);
}

function createResourceTargets(
	preset: DeveloperPresetConfig | undefined,
): ResourceTarget[] {
	if (!preset?.resourceTargets) {
		return [];
	}
	const targets: ResourceTarget[] = [];
	for (const [key, value] of Object.entries(preset.resourceTargets)) {
		const target = Number(value);
		if (!Number.isFinite(target) || target <= 0) {
			continue;
		}
		targets.push({ key, target });
	}
	return targets;
}

function createPopulationPlan(
	preset: DeveloperPresetConfig | undefined,
): PopulationTarget[] {
	if (!preset?.population) {
		return [];
	}
	const plan: PopulationTarget[] = [];
	for (const [role, value] of Object.entries(preset.population)) {
		const count = Number(value);
		if (!Number.isFinite(count) || count <= 0) {
			continue;
		}
		plan.push({ role, count });
	}
	return plan;
}

function createBuildingPlan(
	preset: DeveloperPresetConfig | undefined,
): string[] {
	if (!preset?.buildingIds || preset.buildingIds.length === 0) {
		return [];
	}
	const unique = new Set<string>();
	for (const id of preset.buildingIds) {
		if (typeof id === 'string' && id.length > 0) {
			unique.add(id);
		}
	}
	return [...unique];
}

function determineLandCount(
	developmentPlanLength: number,
	preset: DeveloperPresetConfig | undefined,
): number {
	const base = Number(preset?.landCount ?? 0);
	const desired =
		Number.isFinite(base) && base > 0 ? base : developmentPlanLength;
	return Math.max(desired, developmentPlanLength);
}

export function initializeDeveloperMode(
	session: EngineSession,
	playerId: PlayerId,
	registries: Pick<SessionRegistries, 'developments'>,
	preset: DeveloperPresetConfig | undefined,
): void {
	const developmentPlan = createDevelopmentPlan(registries.developments);
	const resources = createResourceTargets(preset);
	const population = createPopulationPlan(preset);
	const buildings = createBuildingPlan(preset);
	const landCount = determineLandCount(developmentPlan.length, preset);
	session.applyDeveloperPreset({
		playerId,
		resources: resources.map((entry) => ({ ...entry })),
		population: population.map((entry) => ({ ...entry })),
		landCount,
		developments: [...developmentPlan],
		buildings: [...buildings],
	});
}
