import { collectTriggerEffects } from '../triggers';
import { runEffects } from '../effects';
import { withStatSourceFrames } from '../stat_sources';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type { PlayerState, StatKey } from '../state';
import type { PassiveMetadata } from '../services';

export interface AdvanceSkipSource {
	id: string;
	detail?: string;
	meta?: PassiveMetadata;
}

export interface AdvanceSkip {
	type: 'phase' | 'step';
	phaseId: string;
	stepId?: string;
	sources: AdvanceSkipSource[];
}

export interface AdvanceResult {
	phase: string;
	step: string;
	effects: EffectDef[];
	player: PlayerState;
	skipped?: AdvanceSkip;
}

function createPhaseStatFrame(
	phaseId: string,
	stepId: string | undefined,
): (
	effect: EffectDef,
	context: EngineContext,
	statKey: StatKey,
) => {
	key: string;
	kind: 'phase';
	id: string;
	longevity: 'permanent';
	detail?: string;
} {
	return (_effect, _context, statKey) => {
		const baseFrame: {
			key: string;
			kind: 'phase';
			id: string;
			longevity: 'permanent';
		} = {
			key: `phase:${phaseId}:${stepId ?? 'step'}:${statKey}`,
			kind: 'phase',
			id: phaseId,
			longevity: 'permanent',
		};
		return stepId ? { ...baseFrame, detail: stepId } : baseFrame;
	};
}

function runTriggerBundles(
	triggerIds: string[],
	engineContext: EngineContext,
	playerState: PlayerState,
	statFrame: ReturnType<typeof createPhaseStatFrame>,
	collectedEffects: EffectDef[],
): void {
	withStatSourceFrames(engineContext, statFrame, () => {
		for (const triggerId of triggerIds) {
			const bundles = collectTriggerEffects(
				triggerId,
				engineContext,
				playerState,
			);
			for (const bundle of bundles) {
				withStatSourceFrames(engineContext, bundle.frames, () => {
					runEffects(bundle.effects, engineContext);
				});
				collectedEffects.push(...bundle.effects);
			}
		}
	});
}

function gatherSkipSources(
	engineContext: EngineContext,
	player: PlayerState,
	sourceIds: string[],
): AdvanceSkipSource[] {
	return sourceIds.map((id) => {
		const passive = engineContext.passives.get(id, player.id);
		const entry: AdvanceSkipSource = { id };
		if (passive?.detail !== undefined) {
			entry.detail = passive.detail;
		}
		if (passive?.meta !== undefined) {
			entry.meta = passive.meta;
		}
		return entry;
	});
}

function resolvePhaseSkip(
	engineContext: EngineContext,
	player: PlayerState,
	phaseId: string,
): AdvanceSkip | undefined {
	const skipSources = player.skipPhases[phaseId];
	if (!skipSources) {
		return undefined;
	}
	const ids = Object.keys(skipSources);
	if (ids.length === 0) {
		return undefined;
	}
	return {
		type: 'phase',
		phaseId,
		sources: gatherSkipSources(engineContext, player, ids),
	};
}

function resolveStepSkip(
	engineContext: EngineContext,
	player: PlayerState,
	phaseId: string,
	stepId: string,
): AdvanceSkip | undefined {
	const skipMap = player.skipSteps[phaseId];
	const bucket = skipMap?.[stepId];
	if (!bucket) {
		return undefined;
	}
	const ids = Object.keys(bucket);
	if (ids.length === 0) {
		return undefined;
	}
	return {
		type: 'step',
		phaseId,
		stepId,
		sources: gatherSkipSources(engineContext, player, ids),
	};
}

function moveToNext(engineContext: EngineContext, skipPhase: boolean): void {
	const phaseIndex = engineContext.game.phaseIndex;
	const phaseDefinition = engineContext.phases[phaseIndex]!;
	if (skipPhase) {
		engineContext.game.stepIndex = phaseDefinition.steps.length;
	} else {
		engineContext.game.stepIndex += 1;
	}
	if (engineContext.game.stepIndex >= phaseDefinition.steps.length) {
		engineContext.game.stepIndex = 0;
		engineContext.game.phaseIndex += 1;
		if (engineContext.game.phaseIndex >= engineContext.phases.length) {
			engineContext.game.phaseIndex = 0;
			const lastPlayerIndex = engineContext.game.players.length - 1;
			if (engineContext.game.currentPlayerIndex === lastPlayerIndex) {
				engineContext.game.currentPlayerIndex = 0;
				engineContext.game.turn += 1;
			} else {
				engineContext.game.currentPlayerIndex += 1;
			}
		}
	}
	const nextPhaseIndex = engineContext.game.phaseIndex;
	const nextStepIndex = engineContext.game.stepIndex;
	const nextPhaseDefinition = engineContext.phases[nextPhaseIndex]!;
	const nextStepDefinition = nextPhaseDefinition.steps[nextStepIndex];
	engineContext.game.currentPhase = nextPhaseDefinition.id;
	engineContext.game.currentStep = nextStepDefinition
		? nextStepDefinition.id
		: '';
}

export function advance(engineContext: EngineContext): AdvanceResult {
	const phaseIndex = engineContext.game.phaseIndex;
	const stepIndex = engineContext.game.stepIndex;
	const currentPhaseDefinition = engineContext.phases[phaseIndex]!;
	const currentStepDefinition = currentPhaseDefinition.steps[stepIndex];
	const actingPlayer = engineContext.activePlayer;
	const appliedEffects: EffectDef[] = [];

	let skipped = resolvePhaseSkip(
		engineContext,
		actingPlayer,
		currentPhaseDefinition.id,
	);

	if (!skipped && currentStepDefinition) {
		skipped = resolveStepSkip(
			engineContext,
			actingPlayer,
			currentPhaseDefinition.id,
			currentStepDefinition.id,
		);
	}

	if (!skipped) {
		const phaseFrame = createPhaseStatFrame(
			currentPhaseDefinition.id,
			currentStepDefinition?.id,
		);
		const triggerIds = currentStepDefinition?.triggers ?? [];
		if (triggerIds.length > 0) {
			runTriggerBundles(
				triggerIds,
				engineContext,
				actingPlayer,
				phaseFrame,
				appliedEffects,
			);
		}
		const stepEffects = currentStepDefinition?.effects;
		if (stepEffects) {
			withStatSourceFrames(engineContext, phaseFrame, () => {
				runEffects(stepEffects, engineContext);
			});
			appliedEffects.push(...stepEffects);
		}
		if (currentStepDefinition) {
			withStatSourceFrames(engineContext, phaseFrame, () => {
				engineContext.passives.runResultModifiers(
					currentStepDefinition.id,
					engineContext,
				);
			});
		}
	}

	moveToNext(engineContext, skipped?.type === 'phase');

	return {
		phase: currentPhaseDefinition.id,
		step: currentStepDefinition?.id || '',
		effects: appliedEffects,
		player: actingPlayer,
		...(skipped ? { skipped } : {}),
	};
}
