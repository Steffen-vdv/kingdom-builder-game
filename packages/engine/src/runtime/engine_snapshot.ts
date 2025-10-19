import {
	clonePassiveMetadata,
	clonePassiveRecord,
} from '../services/passive_helpers';
import { cloneEffectList } from '../utils';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type {
	AdvanceResult,
	AdvanceSkip,
	AdvanceSkipSource,
} from '../phases/advance';
import type { PhaseDef, StepDef } from '../phases';
import type { PlayerId } from '../state';
import type {
	PlayerStartConfig,
	SessionAdvanceResult,
	SessionAdvanceSkipSnapshot,
	SessionAdvanceSkipSourceSnapshot,
	SessionPassiveEvaluationModifierMap,
	SessionPassiveRecordSnapshot,
	SessionPhaseDefinition,
	SessionPhaseStepDefinition,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionEffectLogMap,
} from '@kingdom-builder/protocol';
import type { PassiveRecordSnapshot } from './types';
import {
	cloneActionTraces,
	deepClone,
	snapshotPlayer,
} from './player_snapshot';

function clonePhaseStep(step: StepDef): SessionPhaseStepDefinition {
	const cloned: SessionPhaseStepDefinition = { id: step.id };
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

function clonePhases(phases: PhaseDef[]): SessionPhaseDefinition[] {
	return phases.map((phase) => {
		const cloned: SessionPhaseDefinition = {
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

function cloneSkipSource(
	source: AdvanceSkipSource,
): SessionAdvanceSkipSourceSnapshot {
	const cloned: SessionAdvanceSkipSourceSnapshot = { id: source.id };
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
): SessionAdvanceSkipSnapshot | undefined {
	if (!skip) {
		return undefined;
	}
	const cloned: SessionAdvanceSkipSnapshot = {
		type: skip.type,
		phaseId: skip.phaseId,
		sources: skip.sources.map((source) => cloneSkipSource(source)),
	};
	if (skip.stepId !== undefined) {
		cloned.stepId = skip.stepId;
	}
	return cloned;
}

function cloneEffectLogs(
	context: EngineContext,
): SessionEffectLogMap | undefined {
	const drained = context.drainEffectLogs();
	if (drained.size === 0) {
		return undefined;
	}
	const result: SessionEffectLogMap = {};
	for (const [key, entries] of drained.entries()) {
		result[key] = [...entries];
	}
	return result;
}

function snapshotEvaluationModifiers(
	context: EngineContext,
): SessionPassiveEvaluationModifierMap {
	const result: SessionPassiveEvaluationModifierMap = {};
	const evaluationModEntries = context.passives.evaluationMods.entries();
	for (const [target, modifiers] of evaluationModEntries) {
		result[target] = [...modifiers.keys()];
	}
	return result;
}

export function snapshotEngine(context: EngineContext): SessionSnapshot {
	const conclusion = context.game.conclusion;
	const rules = cloneRuleSnapshot(context);
	const effectLogs = cloneEffectLogs(context);
	const passiveEvaluationModifiers = snapshotEvaluationModifiers(context);
	const metadata: SessionSnapshotMetadata = effectLogs
		? { passiveEvaluationModifiers, effectLogs }
		: { passiveEvaluationModifiers };
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
			...(conclusion
				? {
						conclusion: {
							conditionId: conclusion.conditionId,
							winnerId: conclusion.winnerId,
							loserId: conclusion.loserId,
							triggeredBy: conclusion.triggeredBy,
						},
					}
				: {}),
		},
		phases: clonePhases(context.phases),
		actionCostResource: context.actionCostResource,
		recentResourceGains: context.recentResourceGains.map((gain) => ({
			key: gain.key,
			amount: gain.amount,
		})),
		compensations: cloneCompensations(context.compensations),
		rules,
		passiveRecords: clonePassiveRecords(context),
		metadata,
	};
}

function cloneRuleSnapshot(context: EngineContext): SessionRuleSnapshot {
	const {
		defaultActionAPCost,
		tieredResourceKey,
		tierDefinitions,
		winConditions = [],
	} = context.services.rules;
	return {
		defaultActionAPCost,
		tieredResourceKey,
		tierDefinitions: structuredClone(tierDefinitions),
		winConditions: structuredClone(winConditions),
	} satisfies SessionRuleSnapshot;
}

function clonePassiveRecords(
	context: EngineContext,
): Record<PlayerId, SessionPassiveRecordSnapshot[]> {
	const result: Record<PlayerId, SessionPassiveRecordSnapshot[]> = {} as Record<
		PlayerId,
		SessionPassiveRecordSnapshot[]
	>;
	for (const player of context.game.players) {
		const records = context.passives.values(player.id).map((record) => {
			const { frames: _frames, ...snapshot } = clonePassiveRecord(record);
			return snapshot as PassiveRecordSnapshot;
		});
		result[player.id] = records;
	}
	return result;
}

export function snapshotAdvance(
	context: EngineContext,
	result: AdvanceResult,
): SessionAdvanceResult {
	const skipped = cloneSkip(result.skipped);
	return {
		phase: result.phase,
		step: result.step,
		effects: result.effects.map((effect: EffectDef) => ({ ...effect })),
		player: snapshotPlayer(context, result.player),
		...(skipped ? { skipped } : {}),
	};
}

export { cloneActionTraces };
