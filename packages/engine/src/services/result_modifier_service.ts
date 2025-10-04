import type { EngineContext } from '../context';
import type { ResultModifier } from './passive_types';

export class ResultModifierService {
	private modifiers: Map<string, ResultModifier> = new Map();

	register(id: string, modifier: ResultModifier) {
		this.modifiers.set(id, modifier);
	}

	unregister(id: string) {
		this.modifiers.delete(id);
	}

	run(actionId: string, ctx: EngineContext) {
		for (const modifier of this.modifiers.values()) {
			modifier(actionId, ctx);
		}
	}

	clone(): ResultModifierService {
		const cloned = new ResultModifierService();
		cloned.modifiers = new Map(this.modifiers);
		return cloned;
	}
}
