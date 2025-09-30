import { collectTriggerEffects } from '../triggers';
import { runEffects } from '../effects';
import { withStatSourceFrames } from '../stat_sources';
import type { EngineContext } from '../context';
import type { EffectDef } from '../effects';
import type { PlayerState, StatKey } from '../state';

export interface AdvanceResult {
	phase: string;
	step: string;
	effects: EffectDef[];
	player: PlayerState;
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

export function advance(engineContext: EngineContext): AdvanceResult {
	const currentPhaseDefinition =
		engineContext.phases[engineContext.game.phaseIndex]!;
	const currentStepDefinition =
		currentPhaseDefinition.steps[engineContext.game.stepIndex];
	const actingPlayer = engineContext.activePlayer;
	const appliedEffects: EffectDef[] = [];
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
			engineContext.passives.runResultMods(
				currentStepDefinition.id,
				engineContext,
			);
		});
	}
	engineContext.game.stepIndex += 1;
	if (engineContext.game.stepIndex >= currentPhaseDefinition.steps.length) {
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
	const nextPhaseDefinition =
		engineContext.phases[engineContext.game.phaseIndex]!;
	const nextStepDefinition =
		nextPhaseDefinition.steps[engineContext.game.stepIndex];
	engineContext.game.currentPhase = nextPhaseDefinition.id;
	engineContext.game.currentStep = nextStepDefinition
		? nextStepDefinition.id
		: '';
	return {
		phase: currentPhaseDefinition.id,
		step: currentStepDefinition?.id || '',
		effects: appliedEffects,
		player: actingPlayer,
	};
}
