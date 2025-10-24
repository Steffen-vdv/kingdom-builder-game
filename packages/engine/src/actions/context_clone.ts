import { EngineContext } from '../context';
import {
	GameState,
	Land,
	PlayerState,
	type StatSourceContribution,
} from '../state';
import { cloneMeta } from '../stat_sources/meta';
import { cloneEffectList } from '../utils';

function cloneLand(land: Land): Land {
	const cloned = new Land(land.id, land.slotsMax, land.tilled);
	cloned.slotsUsed = land.slotsUsed;
	cloned.developments = [...land.developments];
	if (land.upkeep) {
		cloned.upkeep = { ...land.upkeep };
	}
	const payUpkeep = cloneEffectList(land.onPayUpkeepStep);
	if (payUpkeep) {
		cloned.onPayUpkeepStep = payUpkeep;
	}
	const gainIncome = cloneEffectList(land.onGainIncomeStep);
	if (gainIncome) {
		cloned.onGainIncomeStep = gainIncome;
	}
	const gainAp = cloneEffectList(land.onGainAPStep);
	if (gainAp) {
		cloned.onGainAPStep = gainAp;
	}
	return cloned;
}

function clonePlayerState(player: PlayerState): PlayerState {
	const cloned = new PlayerState(player.id, player.name);
	for (const key of Object.keys(player.resources)) {
		cloned.resources[key] = player.resources[key] ?? 0;
	}
	for (const key of Object.keys(player.resourceValues)) {
		cloned.resourceValues[key] = player.resourceValues[key] ?? 0;
	}
	for (const key of Object.keys(player.resourceLowerBounds)) {
		cloned.resourceLowerBounds[key] = player.resourceLowerBounds[key] ?? null;
	}
	for (const key of Object.keys(player.resourceUpperBounds)) {
		cloned.resourceUpperBounds[key] = player.resourceUpperBounds[key] ?? null;
	}
	for (const key of Object.keys(player.resourceTouched)) {
		cloned.resourceTouched[key] = Boolean(player.resourceTouched[key]);
	}
	for (const key of Object.keys(player.resourceTierIds)) {
		cloned.resourceTierIds[key] = player.resourceTierIds[key] ?? null;
	}
	for (const key of Object.keys(player.resourceBoundTouched)) {
		const bounds = player.resourceBoundTouched[key];
		if (bounds) {
			cloned.resourceBoundTouched[key] = {
				lower: Boolean(bounds.lower),
				upper: Boolean(bounds.upper),
			};
		}
	}
	for (const key of Object.keys(player.stats)) {
		cloned.stats[key] = player.stats[key] ?? 0;
	}
	for (const key of Object.keys(player.statsHistory)) {
		cloned.statsHistory[key] = Boolean(player.statsHistory[key]);
	}
	for (const key of Object.keys(player.population)) {
		cloned.population[key] = player.population[key] ?? 0;
	}
	cloned.lands = player.lands.map((land) => cloneLand(land));
	cloned.buildings = new Set(player.buildings);
	cloned.actions = new Set(player.actions);
	const clonedSources = cloned.statSources;
	for (const statKey of Object.keys(player.statSources)) {
		const contributions = player.statSources[statKey];
		if (!contributions) {
			clonedSources[statKey] = {};
			continue;
		}
		const next: Record<string, StatSourceContribution> = {};
		for (const sourceKey of Object.keys(contributions)) {
			const contribution = contributions[sourceKey]!;
			next[sourceKey] = {
				amount: contribution.amount,
				meta: cloneMeta(contribution.meta),
			};
		}
		clonedSources[statKey] = next;
	}
	cloned.skipPhases = Object.fromEntries(
		Object.entries(player.skipPhases).map(([phaseId, flags]) => [
			phaseId,
			{ ...flags },
		]),
	);
	cloned.skipSteps = Object.fromEntries(
		Object.entries(player.skipSteps).map(([phaseId, steps]) => [
			phaseId,
			Object.fromEntries(
				Object.entries(steps).map(([stepId, flags]) => {
					return [stepId, { ...flags }];
				}),
			),
		]),
	);
	const reserved = new Set([
		'id',
		'name',
		'resources',
		'resourceValues',
		'resourceLowerBounds',
		'resourceUpperBounds',
		'resourceTouched',
		'resourceTierIds',
		'resourceBoundTouched',
		'stats',
		'statsHistory',
		'population',
		'lands',
		'buildings',
		'actions',
		'statSources',
		'skipPhases',
		'skipSteps',
	]);
	for (const [key, value] of Object.entries(player)) {
		if (reserved.has(key)) {
			continue;
		}
		if (typeof value === 'function') {
			(cloned as Record<string, unknown>)[key] = value;
			continue;
		}
		try {
			(cloned as Record<string, unknown>)[key] = structuredClone(value);
		} catch {
			(cloned as Record<string, unknown>)[key] = value;
		}
	}
	return cloned;
}

function cloneGameState(game: GameState): GameState {
	const [firstName = 'Player', secondName = 'Opponent'] = game.players.map(
		(player) => player.name,
	);
	const cloned = new GameState(firstName, secondName);
	cloned.turn = game.turn;
	cloned.currentPlayerIndex = game.currentPlayerIndex;
	cloned.currentPhase = game.currentPhase;
	cloned.currentStep = game.currentStep;
	cloned.phaseIndex = game.phaseIndex;
	cloned.stepIndex = game.stepIndex;
	cloned.devMode = game.devMode;
	cloned.players = game.players.map((player) => clonePlayerState(player));
	if (game.resourceCatalogV2 !== undefined) {
		cloned.resourceCatalogV2 = game.resourceCatalogV2;
	}
	return cloned;
}

export function cloneEngineContext(source: EngineContext): EngineContext {
	const clonedGame = cloneGameState(source.game);
	const clonedServices = source.services.clone(source.developments);
	const clonedPassives = source.passives.clone();
	const compensations = structuredClone(source.compensations);
	const cloned = new EngineContext(
		clonedGame,
		clonedServices,
		source.actions,
		source.buildings,
		source.developments,
		source.populations,
		clonedPassives,
		source.phases,
		source.actionCostResource,
		compensations,
	);
	if (source.aiSystem) {
		cloned.aiSystem = source.aiSystem;
	}
	if (source.resourceCatalogV2 !== undefined) {
		cloned.resourceCatalogV2 = source.resourceCatalogV2;
	}
	cloned.statAddPctBases = { ...source.statAddPctBases };
	cloned.statAddPctAccums = { ...source.statAddPctAccums };
	cloned.recentResourceGains = source.recentResourceGains.map((gain) => ({
		key: gain.key,
		amount: gain.amount,
	}));
	cloned.statSourceStack = [...source.statSourceStack];
	return cloned;
}
