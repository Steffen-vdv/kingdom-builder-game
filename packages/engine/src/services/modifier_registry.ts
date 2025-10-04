import type { EngineContext } from '../context';
import type { ResourceKey } from '../state';

export type CostBag = { [resourceKey in ResourceKey]?: number };
export type CostModifierFlat = Partial<Record<ResourceKey, number>>;
export type CostModifierPercent = Partial<Record<ResourceKey, number>>;
export type CostModifierResult = {
	flat?: CostModifierFlat;
	percent?: CostModifierPercent;
};
export type CostModifier = (
	actionId: string,
	cost: CostBag,
	context: EngineContext,
) => CostModifierResult | void;
export type ResultModifier = (actionId: string, context: EngineContext) => void;
export type ResourceGain = { key: string; amount: number };
export type EvaluationModifierPercent =
	| number
	| Partial<Record<string, number>>;
export type EvaluationModifierResult = {
	percent?: EvaluationModifierPercent;
};
export type EvaluationModifier = (
	context: EngineContext,
	gains: ResourceGain[],
) => EvaluationModifierResult | void;

type CostModifierMap = Map<string, CostModifier>;
type ResultModifierMap = Map<string, ResultModifier>;
type EvaluationModifierMap = Map<string, EvaluationModifier>;
type EvaluationRegistry = Map<string, EvaluationModifierMap>;

export class ModifierRegistry {
	protected costModifiers: CostModifierMap = new Map();
	protected resultModifiers: ResultModifierMap = new Map();
	protected evaluationModifiers: EvaluationRegistry = new Map();
	protected evaluationIndex: Map<string, string> = new Map();

	registerCostModifier(id: string, modifier: CostModifier) {
		this.costModifiers.set(id, modifier);
	}

	unregisterCostModifier(id: string) {
		this.costModifiers.delete(id);
	}

	registerResultModifier(id: string, modifier: ResultModifier) {
		this.resultModifiers.set(id, modifier);
	}

	unregisterResultModifier(id: string) {
		this.resultModifiers.delete(id);
	}

	registerEvaluationModifier(
		id: string,
		target: string,
		modifier: EvaluationModifier,
	) {
		if (!this.evaluationModifiers.has(target)) {
			this.evaluationModifiers.set(target, new Map());
		}
		this.evaluationModifiers.get(target)!.set(id, modifier);
		this.evaluationIndex.set(id, target);
	}

	unregisterEvaluationModifier(id: string) {
		const target = this.evaluationIndex.get(id);
		if (!target) {
			return;
		}
		const modifiers = this.evaluationModifiers.get(target);
		modifiers?.delete(id);
		if (modifiers && modifiers.size === 0) {
			this.evaluationModifiers.delete(target);
		}
		this.evaluationIndex.delete(id);
	}

	applyCostModifiers(
		actionId: string,
		base: CostBag,
		context: EngineContext,
	): CostBag {
		const running: CostBag = { ...base };
		const percentTotals: Partial<Record<ResourceKey, number>> = {};
		for (const modifier of this.costModifiers.values()) {
			const result = modifier(actionId, running, context);
			if (!result) {
				continue;
			}
			if (result.flat) {
				const flatEntries = Object.entries(result.flat);
				for (const entry of flatEntries) {
					const [resourceKey, delta] = entry;
					if (typeof delta !== 'number') {
						continue;
					}
					const current = running[resourceKey] ?? 0;
					running[resourceKey] = current + delta;
				}
			}
			if (result.percent) {
				const percentEntries = Object.entries(result.percent);
				for (const entry of percentEntries) {
					const [resourceKey, percentage] = entry;
					if (typeof percentage !== 'number') {
						continue;
					}
					const runningPercent = percentTotals[resourceKey] ?? 0;
					percentTotals[resourceKey] = runningPercent + percentage;
				}
			}
		}
		const totalEntries = Object.entries(percentTotals);
		for (const entry of totalEntries) {
			const [resourceKey, percentage] = entry;
			if (typeof percentage !== 'number') {
				continue;
			}
			const current = running[resourceKey] ?? 0;
			running[resourceKey] = current + current * percentage;
		}
		return running;
	}

	runResultModifiers(actionId: string, context: EngineContext) {
		for (const modifier of this.resultModifiers.values()) {
			modifier(actionId, context);
		}
	}

	runEvaluationModifiers(
		target: string,
		context: EngineContext,
		gains: ResourceGain[],
	) {
		const modifiers = this.evaluationModifiers.get(target);
		if (!modifiers) {
			return;
		}
		let globalPercent = 0;
		const perResourcePercentages: Partial<Record<string, number>> = {};
		for (const modifier of modifiers.values()) {
			const result = modifier(context, gains);
			if (!result || result.percent === undefined) {
				continue;
			}
			const percent = result.percent;
			if (typeof percent === 'number') {
				globalPercent += percent;
			} else {
				const resourceEntries = Object.entries(percent);
				for (const entry of resourceEntries) {
					const [resourceKey, percentage] = entry;
					if (typeof percentage !== 'number') {
						continue;
					}
					const percentages = perResourcePercentages;
					const previous = percentages[resourceKey] ?? 0;
					percentages[resourceKey] = previous + percentage;
				}
			}
		}
		if (
			globalPercent === 0 &&
			Object.keys(perResourcePercentages).length === 0
		) {
			return;
		}
		for (const gain of gains) {
			const keyed = perResourcePercentages[gain.key] ?? 0;
			const total = globalPercent + keyed;
			if (total === 0) {
				continue;
			}
			gain.amount += gain.amount * total;
		}
	}
}
