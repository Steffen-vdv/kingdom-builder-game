import type { PlayerId, PopulationRoleId, ResourceKey } from '../state';
import type { EngineContext } from '../context';
import { runEffects, type EffectDef } from '../effects';

export interface DeveloperPopulationPlanEntry {
	role: PopulationRoleId;
	count: number;
}

export interface DeveloperResourceTarget {
	key: ResourceKey;
	target: number;
}

export interface DeveloperPresetOptions {
	playerId: PlayerId;
	resources?: DeveloperResourceTarget[];
	population?: DeveloperPopulationPlanEntry[];
	landCount?: number;
	developments?: string[];
	buildings?: string[];
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
	const effect: EffectDef<{ key: ResourceKey; amount: number }> = {
		type: 'resource',
		method,
		params: { key, amount },
	};
	applyEffect(context, effect);
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
	const effect: EffectDef<{ role: PopulationRoleId }> = {
		type: 'population',
		method,
		params: { role },
	};
	applyEffect(context, effect, Math.abs(delta));
}

function ensureLandCount(context: EngineContext, target: number): void {
	const player = context.activePlayer;
	if (player.lands.length >= target) {
		return;
	}
	const effect: EffectDef<{ count: number }> = {
		type: 'land',
		method: 'add',
		params: { count: target - player.lands.length },
	};
	applyEffect(context, effect);
}

function ensureDevelopment(context: EngineContext, id: string): void {
	const player = context.activePlayer;
	const alreadyOwned = player.lands.some((land) =>
		land.developments.includes(id),
	);
	if (alreadyOwned) {
		return;
	}
	let land = player.lands.find(
		(candidate) => candidate.slotsUsed < candidate.slotsMax,
	);
	if (!land) {
		const landEffect: EffectDef<{ count: number }> = {
			type: 'land',
			method: 'add',
			params: { count: 1 },
		};
		applyEffect(context, landEffect);
		land = player.lands.find(
			(candidate) => candidate.slotsUsed < candidate.slotsMax,
		);
	}
	if (!land) {
		return;
	}
	const effect: EffectDef<{ id: string; landId: string }> = {
		type: 'development',
		method: 'add',
		params: { id, landId: land.id },
	};
	applyEffect(context, effect);
}

function ensureBuilding(context: EngineContext, id: string): void {
	const player = context.activePlayer;
	if (player.buildings.has(id)) {
		return;
	}
	const effect: EffectDef<{ id: string }> = {
		type: 'building',
		method: 'add',
		params: { id },
	};
	applyEffect(context, effect);
}

function withPlayer(
	context: EngineContext,
	playerId: PlayerId,
	action: () => void,
): void {
	const index = context.game.players.findIndex(
		(player) => player.id === playerId,
	);
	if (index < 0) {
		return;
	}
	const previousIndex = context.game.currentPlayerIndex;
	if (previousIndex !== index) {
		context.game.currentPlayerIndex = index;
	}
	try {
		action();
	} finally {
		context.game.currentPlayerIndex = previousIndex;
	}
}

export function applyDeveloperPreset(
	context: EngineContext,
	options: DeveloperPresetOptions,
): void {
	withPlayer(context, options.playerId, () => {
		if (options.resources) {
			for (const entry of options.resources) {
				ensureResource(context, entry.key, entry.target);
			}
		}
		if (options.population) {
			for (const entry of options.population) {
				ensurePopulation(context, entry.role, entry.count);
			}
		}
		if (typeof options.landCount === 'number') {
			ensureLandCount(context, options.landCount);
		}
		if (options.developments) {
			for (const id of options.developments) {
				ensureDevelopment(context, id);
			}
		}
		if (options.buildings) {
			for (const id of options.buildings) {
				ensureBuilding(context, id);
			}
		}
	});
}
