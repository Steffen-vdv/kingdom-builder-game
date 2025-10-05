import {
	createDevelopmentRegistry,
	BuildingId,
	PopulationRole,
	Resource,
	type DevelopmentDef,
	type PopulationRoleId,
	type ResourceKey,
} from '@kingdom-builder/contents';
import {
	runEffects,
	type EffectDef,
	type EngineContext,
} from '@kingdom-builder/engine';

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

function applyEffect(
	context: EngineContext,
	effect: EffectDef,
	multiplier = 1,
): void {
	runEffects([effect], context, multiplier);
}

function ensureResource(
	context: EngineContext,
	key: ResourceKey,
	target: number,
): void {
	const player = context.activePlayer;
	const current = player.resources[key] ?? 0;
	if (current === target) {
		return;
	}
	const amount = Math.abs(target - current);
	if (amount === 0) {
		return;
	}
	const method = target > current ? 'add' : 'remove';
	const resourceEffect: EffectDef = {
		type: 'resource',
		method,
		params: { key, amount },
	};
	applyEffect(context, resourceEffect);
}

function ensurePopulation(
	context: EngineContext,
	role: PopulationRoleId,
	target: number,
): void {
	const player = context.activePlayer;
	const current = player.population[role] ?? 0;
	if (current === target) {
		return;
	}
	const delta = target - current;
	const method = delta > 0 ? 'add' : 'remove';
	const populationEffect: EffectDef = {
		type: 'population',
		method,
		params: { role },
	};
	applyEffect(context, populationEffect, Math.abs(delta));
}

function ensureLandCount(context: EngineContext, target: number): void {
	const player = context.activePlayer;
	if (player.lands.length >= target) {
		return;
	}
	const landEffect: EffectDef<{ count: number }> = {
		type: 'land',
		method: 'add',
		params: { count: target - player.lands.length },
	};
	applyEffect(context, landEffect);
}

function ensureDevelopment(context: EngineContext, id: string): void {
	const player = context.activePlayer;
	const developmentId = String(id);
	const alreadyOwned = player.lands.some((land) => {
		return land.developments.includes(developmentId);
	});
	if (alreadyOwned) {
		return;
	}
	let land = player.lands.find((candidate) => {
		return candidate.slotsUsed < candidate.slotsMax;
	});
	if (!land) {
		const landEffect: EffectDef<{ count: number }> = {
			type: 'land',
			method: 'add',
			params: { count: 1 },
		};
		applyEffect(context, landEffect);
		land = player.lands.find((candidate) => {
			return candidate.slotsUsed < candidate.slotsMax;
		});
	}
	if (!land) {
		return;
	}
	const developmentEffect: EffectDef<{ id: string; landId: string }> = {
		type: 'development',
		method: 'add',
		params: { id: developmentId, landId: land.id },
	};
	applyEffect(context, developmentEffect);
}

function ensureMill(context: EngineContext): void {
	const player = context.activePlayer;
	if (player.buildings.has(BuildingId.Mill)) {
		return;
	}
	const millEffect: EffectDef<{ id: string }> = {
		type: 'building',
		method: 'add',
		params: { id: BuildingId.Mill },
	};
	applyEffect(context, millEffect);
}

function withPrimaryPlayer(context: EngineContext, action: () => void): void {
	const previousIndex = context.game.currentPlayerIndex;
	if (previousIndex !== 0) {
		context.game.currentPlayerIndex = 0;
	}
	try {
		action();
	} finally {
		context.game.currentPlayerIndex = previousIndex;
	}
}

export function initializeDeveloperMode(context: EngineContext): void {
	const player = context.game.players[0];
	if (!player) {
		return;
	}
	if (context.game.turn > 1 || player.buildings.has(BuildingId.Mill)) {
		return;
	}
	withPrimaryPlayer(context, () => {
		ensureResource(context, Resource.gold, TARGET_GOLD);
		ensureResource(context, Resource.happiness, TARGET_HAPPINESS);
		POPULATION_PLAN.forEach(({ role, count }) => {
			ensurePopulation(context, role, count);
		});
		ensureLandCount(
			context,
			Math.max(TARGET_LAND_COUNT, DEVELOPMENT_PLAN.length),
		);
		DEVELOPMENT_PLAN.forEach((id) => {
			ensureDevelopment(context, id);
		});
		ensureMill(context);
	});
}
