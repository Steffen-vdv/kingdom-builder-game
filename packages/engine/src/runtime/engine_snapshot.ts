import { clonePassiveMetadata } from '../services/passive_helpers';
import { cloneEffectList } from '../utils';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type {
	AdvanceResult,
	AdvanceSkip,
	AdvanceSkipSource,
} from '../phases/advance';
import type { PhaseDef, StepDef } from '../phases';
import type { PlayerId, PlayerStartConfig } from '../state';
import type {
	AdvanceSkipSnapshot,
	AdvanceSkipSourceSnapshot,
	EngineAdvanceResult,
	EngineSessionSnapshot,
} from './types';
import {
	cloneActionTraces,
	deepClone,
	snapshotPlayer,
} from './player_snapshot';

function clonePhaseStep(step: StepDef): StepDef {
	const cloned: StepDef = { id: step.id };
	if (step.title !== undefined) {
		cloned.title = step.title;
	}
	const effects = cloneEffectList(step.effects);
	if (effects) {
		cloned.effects = effects;
	}
	if (step.triggers) {
		cloned.triggers = [...step.triggers];
	}
	return cloned;
}

function clonePhases(phases: PhaseDef[]): PhaseDef[] {
	return phases.map((phase) => {
		const cloned: PhaseDef = {
			id: phase.id,
			steps: phase.steps.map((step) => clonePhaseStep(step)),
		};
		if (phase.action !== undefined) {
			cloned.action = phase.action;
		}
		if (phase.icon !== undefined) {
			cloned.icon = phase.icon;
		}
		if (phase.label !== undefined) {
			cloned.label = phase.label;
		}
		return cloned;
	});
}

function cloneCompensations(
	compensations: Record<PlayerId, PlayerStartConfig>,
): Record<PlayerId, PlayerStartConfig> {
	return Object.fromEntries(
		Object.entries(compensations).map(([playerId, config]) => [
			playerId,
			deepClone(config),
		]),
	) as Record<PlayerId, PlayerStartConfig>;
}

function cloneSkipSource(source: AdvanceSkipSource): AdvanceSkipSourceSnapshot {
	const cloned: AdvanceSkipSourceSnapshot = { id: source.id };
	if (source.detail !== undefined) {
		cloned.detail = source.detail;
	}
	const metadata = clonePassiveMetadata(source.meta);
	if (metadata) {
		cloned.meta = metadata;
	}
	return cloned;
}

function cloneSkip(
	skip: AdvanceSkip | undefined,
): AdvanceSkipSnapshot | undefined {
	if (!skip) {
		return undefined;
	}
	return {
		type: skip.type,
		phaseId: skip.phaseId,
		stepId: skip.stepId,
		sources: skip.sources.map((source) => cloneSkipSource(source)),
	};
}

export function snapshotEngine(context: EngineContext): EngineSessionSnapshot {
	return {
		game: {
			turn: context.game.turn,
			currentPlayerIndex: context.game.currentPlayerIndex,
			currentPhase: context.game.currentPhase,
			currentStep: context.game.currentStep,
			phaseIndex: context.game.phaseIndex,
			stepIndex: context.game.stepIndex,
			devMode: context.game.devMode,
			players: context.game.players.map((player) =>
				snapshotPlayer(context, player),
			),
			activePlayerId: context.game.active.id,
			opponentId: context.game.opponent.id,
		},
		phases: clonePhases(context.phases),
		actionCostResource: context.actionCostResource,
		recentResourceGains: context.recentResourceGains.map((gain) => ({
			key: gain.key,
			amount: gain.amount,
		})),
		compensations: cloneCompensations(context.compensations),
	};
}

export function snapshotAdvance(
	context: EngineContext,
	result: AdvanceResult,
): EngineAdvanceResult {
	return {
		phase: result.phase,
		step: result.step,
		effects: result.effects.map((effect: EffectDef) => ({ ...effect })),
		player: snapshotPlayer(context, result.player),
		skipped: cloneSkip(result.skipped),
	};
}

export { cloneActionTraces };
