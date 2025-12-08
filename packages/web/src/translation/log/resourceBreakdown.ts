import { type EffectDef } from '@kingdom-builder/protocol';

type StringRecord = Record<string, string>;

export type StepEffects = { effects?: EffectDef[] } | undefined;

export interface ResourcePctBreakdown {
	resourceId: string;
	percentSourceId: string;
}

function resolveEvaluatorResourceId(
	effect: EffectDef,
	currentResourceId: string | undefined,
): string | undefined {
	const evaluator = effect.evaluator;
	if (evaluator?.type !== 'resource') {
		return currentResourceId;
	}
	const params = evaluator.params as StringRecord | undefined;
	return params?.['resourceId'] ?? currentResourceId;
}

// Percent change params for resource effects
type PercentChange = {
	type: 'percentFromResource';
	sourceResourceId: string;
};

function detectPctEffect(
	effect: EffectDef,
	targetResourceId: string,
	evaluatorResourceId: string | undefined,
): ResourcePctBreakdown | undefined {
	// Resource format: type 'resource' with change.type 'percentFromResource'
	if (effect.type !== 'resource') {
		return undefined;
	}
	const params = effect.params as
		| {
				resourceId?: string;
				change?: PercentChange;
		  }
		| undefined;
	if (params?.resourceId !== targetResourceId) {
		return undefined;
	}
	const change = params?.change;
	if (change?.type !== 'percentFromResource' || !change.sourceResourceId) {
		return undefined;
	}
	if (!evaluatorResourceId) {
		return undefined;
	}
	return {
		resourceId: evaluatorResourceId,
		percentSourceId: change.sourceResourceId,
	};
}

export function findResourcePctBreakdown(
	step: StepEffects,
	targetResourceId: string,
): ResourcePctBreakdown | undefined {
	const walk = (
		effects: EffectDef[] | undefined,
		currentResourceId: string | undefined,
	): ResourcePctBreakdown | undefined => {
		if (!effects) {
			return undefined;
		}
		for (const effect of effects) {
			const evaluatorResourceId = resolveEvaluatorResourceId(
				effect,
				currentResourceId,
			);
			const pct = detectPctEffect(
				effect,
				targetResourceId,
				evaluatorResourceId,
			);
			if (pct) {
				return pct;
			}
			const nested = walk(effect.effects, evaluatorResourceId);
			if (nested) {
				return nested;
			}
		}
		return undefined;
	};
	return walk(step?.effects, undefined);
}
