import { EngineContext } from '../context';
import {
	GameState,
	Land,
	PlayerState,
	type ResourceSourceContribution,
} from '../state';
import { cloneMeta } from '../resource_sources/meta';
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
	// Clone all unified resource values (resources, stats, population)
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
	cloned.lands = player.lands.map((land) => cloneLand(land));
	cloned.buildings = new Set(player.buildings);
	cloned.actions = new Set(player.actions);
	const clonedSources = cloned.resourceSources;
	for (const resourceKey of Object.keys(player.resourceSources)) {
		const contributions = player.resourceSources[resourceKey];
		if (!contributions) {
			clonedSources[resourceKey] = {};
			continue;
		}
		const next: Record<string, ResourceSourceContribution> = {};
		for (const sourceKey of Object.keys(contributions)) {
			const contribution = contributions[sourceKey]!;
			next[sourceKey] = {
				amount: contribution.amount,
				meta: cloneMeta(contribution.meta),
			};
		}
		clonedSources[resourceKey] = next;
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
		'resourceValues',
		'resourceLowerBounds',
		'resourceUpperBounds',
		'resourceTouched',
		'resourceTierIds',
		'resourceBoundTouched',
		'lands',
		'buildings',
		'actions',
		'resourceSources',
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
	const catalog = game.resourceCatalogV2;
	const cloned = new GameState(catalog, firstName, secondName);
	cloned.turn = game.turn;
	cloned.currentPlayerIndex = game.currentPlayerIndex;
	cloned.currentPhase = game.currentPhase;
	cloned.currentStep = game.currentStep;
	cloned.phaseIndex = game.phaseIndex;
	cloned.stepIndex = game.stepIndex;
	cloned.devMode = game.devMode;
	cloned.players = game.players.map((player) => clonePlayerState(player));
	cloned.resourceCatalogV2 = catalog;
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
		source.actionCostResourceId,
		source.actionCostAmount,
		source.resourceCatalogV2,
		compensations,
	);
	if (source.aiSystem) {
		cloned.aiSystem = source.aiSystem;
	}
	cloned.game.resourceCatalogV2 = source.resourceCatalogV2;
	cloned.resourcePercentBases = { ...source.resourcePercentBases };
	cloned.resourcePercentAccums = { ...source.resourcePercentAccums };
	cloned.recentResourceGains = source.recentResourceGains.map((gain) => ({
		key: gain.key,
		amount: gain.amount,
	}));
	cloned.resourceSourceStack = [...source.resourceSourceStack];
	return cloned;
}
