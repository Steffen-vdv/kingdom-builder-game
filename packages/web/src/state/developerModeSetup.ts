import {
	createDevelopmentRegistry,
	BuildingId,
	PopulationRole,
	Resource,
	type DevelopmentDef,
	type PopulationRoleId,
	type ResourceKey,
} from '@kingdom-builder/contents';
import type { EngineSession, PlayerId } from '@kingdom-builder/engine';

const TARGET_GOLD = 100;
const TARGET_HAPPINESS = 10;
const DEVELOPMENT_REGISTRY = createDevelopmentRegistry();
const DEVELOPMENT_PLAN = toDevelopmentPlan();
const TARGET_LAND_COUNT = 5;
const POPULATION_PLAN: Array<{ role: PopulationRoleId; count: number }> = [
	{ role: PopulationRole.Council, count: 2 },
	{ role: PopulationRole.Legion, count: 1 },
	{ role: PopulationRole.Fortifier, count: 1 },
];

function toDevelopmentPlan(): string[] {
	const identifiers: string[] = [];
	for (const identifier of DEVELOPMENT_REGISTRY.keys()) {
		if (isDevelopmentId(identifier)) {
			identifiers.push(identifier);
		}
	}
	identifiers.sort((left, right) => {
		const leftOrder = getDevelopmentOrder(
			DEVELOPMENT_REGISTRY.get(String(left)),
		);
		const rightOrder = getDevelopmentOrder(
			DEVELOPMENT_REGISTRY.get(String(right)),
		);
		if (leftOrder !== rightOrder) {
			return leftOrder - rightOrder;
		}
		return String(left).localeCompare(String(right));
	});
	return identifiers;
}

function getDevelopmentOrder(definition: DevelopmentDef): number {
	return typeof definition.order === 'number'
		? definition.order
		: Number.MAX_SAFE_INTEGER;
}

function isDevelopmentId(id: string): boolean {
	return DEVELOPMENT_REGISTRY.has(id);
}

const DEVELOPER_RESOURCES: Array<{ key: ResourceKey; target: number }> = [
	{ key: Resource.gold as ResourceKey, target: TARGET_GOLD },
	{ key: Resource.happiness as ResourceKey, target: TARGET_HAPPINESS },
];
const DEVELOPER_BUILDINGS: string[] = [BuildingId.Mill];
const DEVELOPER_LAND_COUNT = Math.max(
	TARGET_LAND_COUNT,
	DEVELOPMENT_PLAN.length,
);

export function initializeDeveloperMode(
	session: EngineSession,
	playerId: PlayerId,
): void {
	session.applyDeveloperPreset({
		playerId,
		resources: DEVELOPER_RESOURCES.map((entry) => ({ ...entry })),
		population: POPULATION_PLAN.map((entry) => ({ ...entry })),
		landCount: DEVELOPER_LAND_COUNT,
		developments: [...DEVELOPMENT_PLAN],
		buildings: [...DEVELOPER_BUILDINGS],
	});
}
