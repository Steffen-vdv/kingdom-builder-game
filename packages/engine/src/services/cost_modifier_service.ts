import type { EngineContext } from '../context';
import type { CostBag, CostModifier } from './passive_types';

export class CostModifierService {
	private modifiers: Map<string, CostModifier> = new Map();

	register(id: string, modifier: CostModifier) {
		this.modifiers.set(id, modifier);
	}

	unregister(id: string) {
		this.modifiers.delete(id);
	}

	apply(actionId: string, base: CostBag, context: EngineContext): CostBag {
		const running: CostBag = { ...base };
		const percentTotals: Partial<Record<string, number>> = {};
		for (const modifier of this.modifiers.values()) {
			const result = modifier(actionId, running, context);
			if (!result) {
				continue;
			}
			if (result.flat) {
				for (const [key, delta] of Object.entries(result.flat)) {
					if (typeof delta !== 'number') {
						continue;
					}
					const current = running[key] ?? 0;
					running[key] = current + delta;
				}
			}
			if (result.percent) {
				for (const [key, percent] of Object.entries(result.percent)) {
					if (typeof percent !== 'number') {
						continue;
					}
					percentTotals[key] = (percentTotals[key] ?? 0) + percent;
				}
			}
		}
		for (const [key, percent] of Object.entries(percentTotals)) {
			if (typeof percent !== 'number') {
				continue;
			}
			const current = running[key] ?? 0;
			running[key] = current + current * percent;
		}
		return running;
	}

	clone(): CostModifierService {
		const cloned = new CostModifierService();
		cloned.modifiers = new Map(this.modifiers);
		return cloned;
	}
}
