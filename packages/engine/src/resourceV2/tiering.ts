import type {
	EffectDef,
	ResourceV2TierStepConfig,
	ResourceV2TierTrackConfig,
} from '@kingdom-builder/protocol';
import { runEffects } from '../effects';
import type { EngineContext } from '../context';
import type {
	ResourceV2RecentTierTransition,
	ResourceV2State,
	ResourceV2TierState,
} from './state';

const OVERLAP_ERROR_MESSAGE =
	'ResourceV2 tier track produced overlapping step matches. Adjust the tier definitions to avoid shared ranges.';

function getTierTrack(
	state: ResourceV2State,
	resourceId: string,
): ResourceV2TierTrackConfig | undefined {
	const definition = state.blueprint.values.get(resourceId);
	if (!definition) {
		return undefined;
	}
	return definition.tierTrack;
}

interface TierMatch {
	step: ResourceV2TierStepConfig;
	index: number;
}

function findTierMatch(
	track: ResourceV2TierTrackConfig,
	value: number,
): TierMatch | undefined {
	let match: TierMatch | undefined;
	for (const [index, step] of track.steps.entries()) {
		if (value < step.min) {
			continue;
		}
		if (step.max !== undefined && value > step.max) {
			continue;
		}
		if (match) {
			throw new Error(OVERLAP_ERROR_MESSAGE);
		}
		match = { step, index } satisfies TierMatch;
	}
	return match;
}

function updateProgress(
	tier: ResourceV2TierState,
	value: number,
	match: TierMatch | undefined,
): void {
	if (!match) {
		tier.currentStepId = undefined;
		tier.currentStepIndex = undefined;
		tier.previousStepId = undefined;
		tier.nextStepId = undefined;
		tier.progress = undefined;
		return;
	}
	const { step, index } = match;
	tier.currentStepId = step.id;
	tier.currentStepIndex = index;
	tier.previousStepId = index > 0 ? tier.steps[index - 1]?.id : undefined;
	tier.nextStepId =
		index + 1 < tier.steps.length ? tier.steps[index + 1]?.id : undefined;
	tier.progress = {
		value,
		min: step.min,
		...(step.max !== undefined ? { max: step.max } : {}),
	};
}

function runEffectSequence(
	effectIds: readonly string[] | undefined,
	resolver: ((id: string) => readonly EffectDef[] | undefined) | undefined,
	context: EngineContext | undefined,
): void {
	if (!effectIds || effectIds.length === 0 || !resolver || !context) {
		return;
	}
        for (const effectId of effectIds) {
                const effects = resolver(effectId);
                if (effects && effects.length > 0) {
                        runEffects([...effects], context);
                }
        }
}

function removeStepPassives(
	passives: readonly string[] | undefined,
	context: EngineContext | undefined,
): void {
	if (!passives || passives.length === 0 || !context) {
		return;
	}
	for (const passiveId of passives) {
		context.passives.removePassive(passiveId, context);
	}
}

export interface ApplyResourceTieringOptions {
	state: ResourceV2State;
	resourceId: string;
	context?: EngineContext;
	resolveEffects?: (id: string) => readonly EffectDef[] | undefined;
	recordTransition?: boolean;
}

export function applyResourceTiering({
	state,
	resourceId,
	context,
	resolveEffects,
	recordTransition = true,
}: ApplyResourceTieringOptions): void {
	const node = state.values.get(resourceId);
	if (!node) {
		return;
	}
	const tier = node.tier;
	if (!tier) {
		return;
	}
	const track = getTierTrack(state, resourceId);
	if (!track) {
		return;
	}
	const value = node.value;
	const previousStepId = tier.currentStepId;
	const previousStepIndex = tier.currentStepIndex;
	const previousStep =
		previousStepIndex !== undefined
			? track.steps[previousStepIndex]
			: previousStepId
				? track.steps.find((step) => step.id === previousStepId)
				: undefined;

	const match = findTierMatch(track, value);
	updateProgress(tier, value, match);

	const nextStepId = tier.currentStepId;
	const stepChanged = previousStepId !== nextStepId;

	if (!stepChanged) {
		return;
	}

	const nextStep = match?.step;
	runEffectSequence(previousStep?.exitEffects, resolveEffects, context);
	removeStepPassives(previousStep?.passives, context);
	runEffectSequence(nextStep?.enterEffects, resolveEffects, context);

	if (recordTransition) {
		tier.touched = true;
                const transition: ResourceV2RecentTierTransition = {
                        resourceId,
                        trackId: tier.trackId,
                        ...(previousStepId ? { fromStepId: previousStepId } : {}),
                        ...(nextStepId ? { toStepId: nextStepId } : {}),
                };
                state.recentTierTransitions.push(transition);
        }
}

export function initialiseResourceTierState(state: ResourceV2State): void {
	for (const [resourceId, node] of state.values.entries()) {
		if (!node.tier) {
			continue;
		}
		applyResourceTiering({
			state,
			resourceId,
			recordTransition: false,
		});
	}
}
