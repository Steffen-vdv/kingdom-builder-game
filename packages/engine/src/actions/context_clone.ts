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
	for (const key of Object.keys(player.stats)) {
		cloned.stats[key] = player.stats[key] ?? 0;
	}
	for (const key of Object.keys(player.statsHistory)) {
		cloned.statsHistory[key] = Boolean(player.statsHistory[key]);
	}
	for (const key of Object.keys(player.population)) {
		cloned.population[key] = player.population[key] ?? 0;
	}
	for (const key of Object.keys(player.resourceV2Values ?? {})) {
		cloned.resourceV2Values[key] = player.resourceV2Values[key] ?? 0;
	}
	for (const key of Object.keys(player.resourceV2LowerBounds ?? {})) {
		cloned.resourceV2LowerBounds[key] = player.resourceV2LowerBounds[key];
	}
	for (const key of Object.keys(player.resourceV2UpperBounds ?? {})) {
		cloned.resourceV2UpperBounds[key] = player.resourceV2UpperBounds[key];
	}
	for (const key of Object.keys(player.resourceV2Touched ?? {})) {
		cloned.resourceV2Touched[key] = Boolean(player.resourceV2Touched[key]);
	}
	for (const key of Object.keys(player.resourceV2BoundTouched ?? {})) {
		cloned.resourceV2BoundTouched[key] = Boolean(
			player.resourceV2BoundTouched[key],
		);
	}
	cloned.resourceV2RecentGains = player.resourceV2RecentGains.map((gain) => ({
		key: gain.key,
		amount: gain.amount,
	}));
	for (const key of Object.keys(player.resourceV2ParentValues ?? {})) {
		cloned.resourceV2ParentValues[key] =
			player.resourceV2ParentValues[key] ?? 0;
	}
	for (const key of Object.keys(player.resourceV2ParentLowerBounds ?? {})) {
		cloned.resourceV2ParentLowerBounds[key] =
			player.resourceV2ParentLowerBounds[key];
	}
	for (const key of Object.keys(player.resourceV2ParentUpperBounds ?? {})) {
		cloned.resourceV2ParentUpperBounds[key] =
			player.resourceV2ParentUpperBounds[key];
	}
	for (const key of Object.keys(player.resourceV2ParentTouched ?? {})) {
		cloned.resourceV2ParentTouched[key] = Boolean(
			player.resourceV2ParentTouched[key],
		);
	}
	for (const key of Object.keys(player.resourceV2ParentBoundTouched ?? {})) {
		cloned.resourceV2ParentBoundTouched[key] = Boolean(
			player.resourceV2ParentBoundTouched[key],
		);
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
		'stats',
		'statsHistory',
		'population',
		'resourceV2',
		'resourceV2Values',
		'resourceV2LowerBounds',
		'resourceV2UpperBounds',
		'resourceV2Touched',
		'resourceV2BoundTouched',
		'resourceV2RecentGains',
		'resourceV2Parents',
		'resourceV2ParentValues',
		'resourceV2ParentLowerBounds',
		'resourceV2ParentUpperBounds',
		'resourceV2ParentTouched',
		'resourceV2ParentBoundTouched',
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
	cloned.statAddPctBases = { ...source.statAddPctBases };
	cloned.statAddPctAccums = { ...source.statAddPctAccums };
	cloned.recentResourceGains = source.recentResourceGains.map((gain) => ({
		key: gain.key,
		amount: gain.amount,
	}));
	cloned.statSourceStack = [...source.statSourceStack];
	return cloned;
}
