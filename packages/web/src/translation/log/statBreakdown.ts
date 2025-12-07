import { type EffectDef } from '@kingdom-builder/protocol';

type StringRecord = Record<string, string>;

export type StepEffects = { effects?: EffectDef[] } | undefined;

export interface StatPctBreakdown {
	role: string;
	percentStat: string;
}

function resolveResourceRole(
	effect: EffectDef,
	currentRole: string | undefined,
): string | undefined {
	const evaluator = effect.evaluator;
	if (evaluator?.type !== 'resource') {
		return currentRole;
	}
	const params = evaluator.params as StringRecord | undefined;
	return params?.['resourceId'] ?? currentRole;
}

// percent change params
type PercentChange = {
	type: 'percentFromResource';
	sourceResourceId: string;
};

function detectPctEffect(
	effect: EffectDef,
	statKey: string,
	role: string | undefined,
): StatPctBreakdown | undefined {
	// format: type 'resource' with change.type 'percentFromResource'
	if (effect.type !== 'resource') {
		return undefined;
	}
	const params = effect.params as
		| {
				resourceId?: string;
				change?: PercentChange;
		  }
		| undefined;
	if (params?.resourceId !== statKey) {
		return undefined;
	}
	const change = params?.change;
	if (change?.type !== 'percentFromResource' || !change.sourceResourceId) {
		return undefined;
	}
	if (!role) {
		return undefined;
	}
	return { role, percentStat: change.sourceResourceId };
}

export function findStatPctBreakdown(
	step: StepEffects,
	statKey: string,
): StatPctBreakdown | undefined {
	const walk = (
		effects: EffectDef[] | undefined,
		currentRole: string | undefined,
	): StatPctBreakdown | undefined => {
		if (!effects) {
			return undefined;
		}
		for (const effect of effects) {
			const role = resolveResourceRole(effect, currentRole);
			const pct = detectPctEffect(effect, statKey, role);
			if (pct) {
				return pct;
			}
			const nested = walk(effect.effects, role);
			if (nested) {
				return nested;
			}
		}
		return undefined;
	};
	return walk(step?.effects, undefined);
}
