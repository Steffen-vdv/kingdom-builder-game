import type { EngineSession, PlayerId } from '@kingdom-builder/engine';
import type {
	SessionRuleSnapshot,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import type { SessionRegistries } from './sessionRegistries';

const TARGET_ECONOMY_AMOUNT = 100;
const TARGET_HAPPINESS_AMOUNT = 10;
const TARGET_LAND_COUNT = 5;
const POPULATION_COUNTS = [2, 1, 1] as const;

interface DeveloperModeOptions {
	registries: Pick<
		SessionRegistries,
		'developments' | 'populations' | 'resources' | 'buildings'
	>;
	rules: SessionRuleSnapshot;
}

interface DeveloperResourceTarget {
	key: string;
	target: number;
}

interface DeveloperPopulationPlanEntry {
	role: string;
	count: number;
}

type ResourceEntry = SessionResourceDefinition & { key: string };

function readDefinitionOrder(definition: unknown): number {
	if (typeof definition !== 'object' || definition === null) {
		return Number.MAX_SAFE_INTEGER;
	}
	const maybeOrder = (definition as { order?: unknown }).order;
	if (typeof maybeOrder === 'number' && Number.isFinite(maybeOrder)) {
		return maybeOrder;
	}
	return Number.MAX_SAFE_INTEGER;
}

function readDefinitionName(definition: unknown): string {
	if (typeof definition !== 'object' || definition === null) {
		return '';
	}
	const maybeName = (definition as { name?: unknown }).name;
	if (typeof maybeName === 'string') {
		return maybeName;
	}
	return '';
}

function isBankruptcyResource(entry: ResourceEntry): boolean {
	return entry.tags?.includes('bankruptcy-check') ?? false;
}

function selectResourceTargets(
	resources: Record<string, SessionResourceDefinition>,
	rules: SessionRuleSnapshot,
): DeveloperResourceTarget[] {
	const entries: ResourceEntry[] = Object.entries(resources).map(
		([key, definition]) => ({ ...definition, key }),
	);
	if (entries.length === 0) {
		return [];
	}
	const tieredKey = rules.tieredResourceKey;
	const economyResource = entries.find((entry) => {
		if (entry.key === tieredKey) {
			return false;
		}
		if (isBankruptcyResource(entry)) {
			return false;
		}
		return Boolean(entry.icon || entry.label);
	});
	const happinessResource = entries.find((entry) => entry.key === tieredKey);
	const targets: DeveloperResourceTarget[] = [];
	if (economyResource) {
		targets.push({ key: economyResource.key, target: TARGET_ECONOMY_AMOUNT });
	}
	if (happinessResource && happinessResource.key !== economyResource?.key) {
		targets.push({
			key: happinessResource.key,
			target: TARGET_HAPPINESS_AMOUNT,
		});
	}
	if (targets.length === 0) {
		const [fallback] = entries;
		if (fallback) {
			targets.push({ key: fallback.key, target: TARGET_ECONOMY_AMOUNT });
		}
	}
	return targets;
}

function selectPopulationPlan(
	registries: DeveloperModeOptions['registries'],
): DeveloperPopulationPlanEntry[] {
	const entries = registries.populations
		.entries()
		.map(([role]) => role)
		.filter((role) => typeof role === 'string');
	const plan: DeveloperPopulationPlanEntry[] = [];
	for (let index = 0; index < POPULATION_COUNTS.length; index += 1) {
		const role = entries[index];
		if (!role) {
			break;
		}
		const count = POPULATION_COUNTS[index];
		if (typeof count !== 'number') {
			break;
		}
		plan.push({ role, count });
	}
	return plan;
}

function selectDevelopmentPlan(
	registries: DeveloperModeOptions['registries'],
): string[] {
	return registries.developments
		.entries()
		.filter(([, definition]) => definition.system !== true)
		.sort(([, left], [, right]) => {
			const leftOrder = readDefinitionOrder(left);
			const rightOrder = readDefinitionOrder(right);
			if (leftOrder !== rightOrder) {
				return leftOrder - rightOrder;
			}
			return readDefinitionName(left).localeCompare(readDefinitionName(right));
		})
		.map(([id]) => id);
}

function selectBuildingPlan(
	registries: DeveloperModeOptions['registries'],
): string[] {
	const [firstBuilding] = registries.buildings.keys();
	if (!firstBuilding) {
		return [];
	}
	return [firstBuilding];
}

export function initializeDeveloperMode(
	session: EngineSession,
	playerId: PlayerId,
	options: DeveloperModeOptions,
): void {
	const resources = selectResourceTargets(
		options.registries.resources,
		options.rules,
	);
	const population = selectPopulationPlan(options.registries);
	const developments = selectDevelopmentPlan(options.registries);
	const buildings = selectBuildingPlan(options.registries);
	const landCount = Math.max(TARGET_LAND_COUNT, developments.length);
	session.applyDeveloperPreset({
		playerId,
		resources,
		population,
		landCount,
		developments,
		buildings,
	});
}
