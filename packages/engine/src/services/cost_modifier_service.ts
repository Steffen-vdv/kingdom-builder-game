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

	apply(actionId: string, base: CostBag, ctx: EngineContext): CostBag {
		const running: Record<string, number> = {};
		const baseEntries = Object.entries(base);
		for (const [key, value] of baseEntries) {
			if (typeof value === 'number') {
				running[key] = value;
			}
		}
		const percentTotals: Record<string, number> = {};
		for (const modifier of this.modifiers.values()) {
			const result = modifier(actionId, running, ctx);
			if (!result) {
				continue;
			}
			if (result.flat) {
				const entries = Object.entries(result.flat);
				for (const [key, delta] of entries) {
					if (typeof delta !== 'number') {
						continue;
					}
					const current = running[key] ?? 0;
					running[key] = current + delta;
				}
			}
			if (result.percent) {
				const percentEntries = Object.entries(result.percent);
				for (const [key, pct] of percentEntries) {
					if (typeof pct !== 'number') {
						continue;
					}
					percentTotals[key] = (percentTotals[key] ?? 0) + pct;
				}
			}
		}
		for (const [key, pct] of Object.entries(percentTotals)) {
			if (typeof pct !== 'number') {
				continue;
			}
			const current = running[key] ?? 0;
			running[key] = current + current * pct;
		}
		return running as CostBag;
	}

	clone(): CostModifierService {
		const cloned = new CostModifierService();
		cloned.modifiers = new Map(this.modifiers);
		return cloned;
	}
}
