import { runEffects, type EffectDef } from '../effects';
import type { EngineContext } from '../context';
import type { PlayerId } from '../state';
import { withStatSourceFrames } from '../stat_sources';
import type { StatSourceFrame } from '../stat_sources';
import { ModifierRegistry } from './modifier_registry';
import {
	clonePassiveMetadata,
	clonePassiveRecord,
	type PassiveOptions,
	type PassiveSummary,
	type PassiveRecord,
} from './passive_types';

function reverseEffect(effect: EffectDef): EffectDef {
	const reversed: EffectDef = { ...effect };
	if (effect.effects) {
		reversed.effects = effect.effects.map(reverseEffect);
	}
	if (effect.method === 'add') {
		reversed.method = 'remove';
	} else if (effect.method === 'remove') {
		reversed.method = 'add';
	}
	return reversed;
}

type PassiveDefinition = {
	id: string;
	name?: string | undefined;
	icon?: string | undefined;
	effects?: EffectDef[] | undefined;
	onGrowthPhase?: EffectDef[] | undefined;
	onUpkeepPhase?: EffectDef[] | undefined;
	onBeforeAttacked?: EffectDef[] | undefined;
	onAttackResolved?: EffectDef[] | undefined;
};

export class PassiveManager extends ModifierRegistry {
	private passives: Map<string, PassiveRecord> = new Map();

	private makeKey(id: string, owner: PlayerId) {
		return `${id}_${owner}`;
	}

	private ensureFrameList(
		frames?: StatSourceFrame | StatSourceFrame[],
	): StatSourceFrame[] {
		if (!frames) {
			return [];
		}
		return Array.isArray(frames) ? [...frames] : [frames];
	}

	addPassive(
		passive: PassiveDefinition,
		context: EngineContext,
		options?: PassiveOptions,
	) {
		const key = this.makeKey(passive.id, context.activePlayer.id);
		const providedFrames = this.ensureFrameList(options?.frames);
		const passiveFrame: StatSourceFrame = (_effect, _context, statKey) => ({
			key: `passive:${key}:${statKey}`,
			instance: key,
			detail: options?.detail ?? passive.name ?? 'Passive',
			longevity: 'ongoing',
		});
		const frames = [...providedFrames, passiveFrame];
		const stored: PassiveRecord = {
			...passive,
			owner: context.activePlayer.id,
			frames,
		};
		if (options?.detail) {
			stored.detail = options.detail;
		}
		if (options?.meta) {
			stored.meta = options.meta;
		}
		this.passives.set(key, stored);
		const setupEffects = passive.effects;
		if (setupEffects && setupEffects.length > 0) {
			withStatSourceFrames(context, frames, () =>
				runEffects(setupEffects, context),
			);
		}
	}

	removePassive(id: string, context: EngineContext) {
		const key = this.makeKey(id, context.activePlayer.id);
		const passive = this.passives.get(key);
		if (!passive) {
			return;
		}
		const teardownEffects = passive.effects;
		if (teardownEffects && teardownEffects.length > 0) {
			withStatSourceFrames(context, passive.frames, () =>
				runEffects(teardownEffects.map(reverseEffect), context),
			);
		}
		this.passives.delete(key);
	}

	list(owner?: PlayerId): PassiveSummary[] {
		const entries = owner
			? Array.from(this.passives.entries()).filter((entry) =>
					entry[0].endsWith(`_${owner}`),
				)
			: Array.from(this.passives.entries());
		return entries.map(([, value]) => {
			const summary: PassiveSummary = { id: value.id };
			if (value.name !== undefined) {
				summary.name = value.name;
			}
			if (value.icon !== undefined) {
				summary.icon = value.icon;
			}
			if (value.detail !== undefined) {
				summary.detail = value.detail;
			}
			const metadata = clonePassiveMetadata(value.meta);
			if (metadata) {
				summary.meta = metadata;
			}
			return summary;
		});
	}

	values(owner: PlayerId): PassiveRecord[] {
		const suffix = `_${owner}`;
		return Array.from(this.passives.entries())
			.filter(([key]) => key.endsWith(suffix))
			.map(([, value]) => value);
	}

	get(id: string, owner: PlayerId): PassiveRecord | undefined {
		return this.passives.get(this.makeKey(id, owner));
	}

	clone(): PassiveManager {
		const cloned = new PassiveManager();
		cloned.costModifiers = new Map(this.costModifiers);
		cloned.resultModifiers = new Map(this.resultModifiers);
		cloned.evaluationIndex = new Map(this.evaluationIndex);
		cloned.evaluationModifiers = new Map(
			Array.from(this.evaluationModifiers.entries()).map(
				([target, modifiers]) => [target, new Map(modifiers)],
			),
		);
		cloned.passives = new Map(
			Array.from(this.passives.entries()).map(([key, value]) => [
				key,
				clonePassiveRecord(value),
			]),
		);
		return cloned;
	}
}

export type {
	CostBag,
	CostModifier,
	CostModifierFlat,
	CostModifierPercent,
	CostModifierResult,
	ResultModifier,
	ResourceGain,
	EvaluationModifierPercent,
	EvaluationModifierResult,
	EvaluationModifier,
} from './modifier_registry';

export type {
	PassiveMetadata,
	PassiveOptions,
	PassiveRemovalMetadata,
	PassiveSourceMetadata,
	PassiveSummary,
} from './passive_types';
