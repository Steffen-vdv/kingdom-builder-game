import { cloneEngineContext } from '../actions/context_clone';
import type { EngineContext } from '../context';
import { advance } from '../phases/advance';
import type { PlayerId } from '../state';
import { snapshotPlayer } from './player_snapshot';
import { snapshotAdvance } from './engine_snapshot';
import type { EngineAdvanceResult, PlayerStateSnapshot } from './types';

export interface SimulateUpcomingPhasesIds {
	growth: string;
	upkeep: string;
}

export interface SimulateUpcomingPhasesOptions {
	phaseIds?: SimulateUpcomingPhasesIds;
	maxIterations?: number;
}

export interface PlayerSnapshotDeltaBucket {
	resources: Record<string, number>;
	stats: Record<string, number>;
	population: Record<string, number>;
}

export interface SimulateUpcomingPhasesResult {
	playerId: PlayerId;
	before: PlayerStateSnapshot;
	after: PlayerStateSnapshot;
	delta: PlayerSnapshotDeltaBucket;
	steps: EngineAdvanceResult[];
}

function ensurePhaseExists(
	context: EngineContext,
	phaseId: string | undefined,
	label: 'growth' | 'upkeep',
	source: 'options.phaseIds' | 'rules.corePhaseIds',
): string {
	if (!phaseId) {
		throw new Error(
			`simulateUpcomingPhases could not determine ${label} phase from ${source}.`,
		);
	}
	const phase = context.phases.find((definition) => definition.id === phaseId);
	if (!phase) {
		throw new Error(
			`simulateUpcomingPhases could not find ${label} phase "${phaseId}" in the engine context.`,
		);
	}
	return phase.id;
}

function resolvePhaseIds(
	context: EngineContext,
	ids: SimulateUpcomingPhasesIds | undefined,
): SimulateUpcomingPhasesIds {
	const source = ids ?? context.services.rules.corePhaseIds;
	const sourceLabel = ids ? 'options.phaseIds' : 'rules.corePhaseIds';
	if (!source) {
		throw new Error(
			'simulateUpcomingPhases requires growth and upkeep phase ids in options.phaseIds or rules.corePhaseIds.',
		);
	}
	return {
		growth: ensurePhaseExists(context, source.growth, 'growth', sourceLabel),
		upkeep: ensurePhaseExists(context, source.upkeep, 'upkeep', sourceLabel),
	};
}

function buildDelta(
	before: PlayerStateSnapshot,
	after: PlayerStateSnapshot,
): PlayerSnapshotDeltaBucket {
	const toDelta = (
		sourceBefore: Record<string, number>,
		sourceAfter: Record<string, number>,
		filter?: (key: string) => boolean,
	) => {
		const result: Record<string, number> = {};
		const keys = new Set([
			...Object.keys(sourceBefore),
			...Object.keys(sourceAfter),
		]);
		for (const key of keys) {
			if (filter && !filter(key)) {
				continue;
			}
			const diff = (sourceAfter[key] ?? 0) - (sourceBefore[key] ?? 0);
			if (diff !== 0) {
				result[key] = diff;
			}
		}
		return result;
	};
	// Filter deltas by ResourceV2 namespace to maintain backward compatibility
	const isResource = (key: string) => key.startsWith('resource:core:');
	const isStat = (key: string) => key.startsWith('resource:stat:');
	const isPopulation = (key: string) => key.startsWith('resource:population:');
	return {
		resources: toDelta(before.resources, after.resources, isResource),
		stats: toDelta(before.stats, after.stats, isStat),
		population: toDelta(before.population, after.population, isPopulation),
	};
}

function hasReachedIterationLimit(iterations: number, limit: number): boolean {
	return iterations >= limit;
}

export function simulateUpcomingPhases(
	context: EngineContext,
	playerId: PlayerId,
	options: SimulateUpcomingPhasesOptions = {},
): SimulateUpcomingPhasesResult {
	const phaseIds = resolvePhaseIds(context, options.phaseIds);
	const clone = cloneEngineContext(context);
	const playerIndex = clone.game.players.findIndex(
		(player) => player.id === playerId,
	);
	if (playerIndex === -1) {
		throw new Error(`Player ${playerId} does not exist in this context.`);
	}
	const before = snapshotPlayer(clone, clone.game.players[playerIndex]!);
	const steps: EngineAdvanceResult[] = [];
	let growthComplete = false;
	let upkeepComplete = false;
	let iterations = 0;
	const limit =
		options.maxIterations ??
		clone.phases.length * clone.game.players.length * 10;
	while (!upkeepComplete) {
		if (hasReachedIterationLimit(iterations, limit)) {
			throw new Error('simulateUpcomingPhases exceeded iteration limit.');
		}
		iterations += 1;
		const result = advance(clone);
		steps.push(snapshotAdvance(clone, result));
		if (result.player.id !== playerId) {
			continue;
		}
		const currentPhase = clone.game.currentPhase;
		if (!growthComplete) {
			if (
				result.phase === phaseIds.growth &&
				currentPhase !== phaseIds.growth
			) {
				growthComplete = true;
			} else if (result.phase === phaseIds.upkeep) {
				growthComplete = true;
			}
		}
		if (growthComplete && !upkeepComplete) {
			if (
				result.phase === phaseIds.upkeep &&
				currentPhase !== phaseIds.upkeep
			) {
				upkeepComplete = true;
			}
		}
	}
	const after = snapshotPlayer(clone, clone.game.players[playerIndex]!);
	return {
		playerId,
		before,
		after,
		delta: buildDelta(before, after),
		steps,
	};
}
