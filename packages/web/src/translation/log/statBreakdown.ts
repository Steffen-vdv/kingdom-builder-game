import { type EffectDef } from '@kingdom-builder/protocol';

type StringRecord = Record<string, string>;

export type StepEffects = { effects?: EffectDef[] } | undefined;

export interface StatPctBreakdown {
	role: string;
	percentStat: string;
}

function resolvePopulationRole(
	effect: EffectDef,
	currentRole: string | undefined,
): string | undefined {
	if (effect.evaluator?.type !== 'population') {
		return currentRole;
	}
	const params = effect.evaluator.params as StringRecord | undefined;
	return params?.['role'] ?? currentRole;
}

// V2 percent change params
type V2PercentChange = {
	type: 'percentFromResource';
	sourceResourceId: string;
};

function detectPctEffect(
	effect: EffectDef,
	statKey: string,
	role: string | undefined,
): StatPctBreakdown | undefined {
	// V2 format: type 'resource' with change.type 'percentFromResource'
	if (effect.type === 'resource') {
		const params = effect.params as
			| {
					resourceId?: string;
					change?: V2PercentChange;
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
	// Legacy format: type 'stat' with method 'add_pct'
	if (effect.type !== 'stat' || effect.method !== 'add_pct') {
		return undefined;
	}
	const params = effect.params as StringRecord | undefined;
	if (params?.['key'] !== statKey) {
		return undefined;
	}
	if (!params?.['percentStat'] || !role) {
		return undefined;
	}
	return { role, percentStat: params['percentStat'] };
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
			const role = resolvePopulationRole(effect, currentRole);
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
