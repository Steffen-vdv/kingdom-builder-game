import type { EffectHandler } from '.';

export interface PhaseSkipStepParam {
	phaseId: string;
	stepId: string;
}

export interface PhaseSkipParams {
	source: string;
	phases?: string[];
	steps?: PhaseSkipStepParam[];
	[key: string]: unknown;
}

function requireSource(params: PhaseSkipParams | undefined): PhaseSkipParams {
	if (
		!params ||
		typeof params.source !== 'string' ||
		params.source.length === 0
	) {
		throw new Error('phase_skip effects require a source id');
	}
	return params;
}

export const phaseSkipAdd: EffectHandler<PhaseSkipParams> = (effect, ctx) => {
	const params = requireSource(effect.params);
	const player = ctx.activePlayer;
	const { source } = params;
	if (Array.isArray(params.phases)) {
		for (const phaseId of params.phases) {
			if (!phaseId) {
				continue;
			}
			const bucket = player.skipPhases[phaseId] ?? {};
			bucket[source] = true;
			player.skipPhases[phaseId] = bucket;
		}
	}
	if (Array.isArray(params.steps)) {
		for (const entry of params.steps) {
			const phaseId = entry?.phaseId;
			const stepId = entry?.stepId;
			if (!phaseId || !stepId) {
				continue;
			}
			const phaseBucket = player.skipSteps[phaseId] ?? {};
			const stepBucket = phaseBucket[stepId] ?? {};
			stepBucket[source] = true;
			phaseBucket[stepId] = stepBucket;
			player.skipSteps[phaseId] = phaseBucket;
		}
	}
};

export const phaseSkipRemove: EffectHandler<PhaseSkipParams> = (
	effect,
	ctx,
) => {
	const params = requireSource(effect.params);
	const player = ctx.activePlayer;
	const { source } = params;
	if (Array.isArray(params.phases)) {
		for (const phaseId of params.phases) {
			if (!phaseId) {
				continue;
			}
			const bucket = player.skipPhases[phaseId];
			if (!bucket) {
				continue;
			}
			delete bucket[source];
			if (Object.keys(bucket).length === 0) {
				delete player.skipPhases[phaseId];
			}
		}
	}
	if (Array.isArray(params.steps)) {
		for (const entry of params.steps) {
			const phaseId = entry?.phaseId;
			const stepId = entry?.stepId;
			if (!phaseId || !stepId) {
				continue;
			}
			const phaseBucket = player.skipSteps[phaseId];
			if (!phaseBucket) {
				continue;
			}
			const stepBucket = phaseBucket[stepId];
			if (!stepBucket) {
				continue;
			}
			delete stepBucket[source];
			if (Object.keys(stepBucket).length === 0) {
				delete phaseBucket[stepId];
			}
			if (Object.keys(phaseBucket).length === 0) {
				delete player.skipSteps[phaseId];
			}
		}
	}
};
