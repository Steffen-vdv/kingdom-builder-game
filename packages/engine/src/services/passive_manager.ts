import { runEffects } from '../effects';
import type { EngineContext } from '../context';
import type { PlayerId } from '../state';
import { withResourceSourceFrames } from '../resource_sources';
import type { ResourceSourceFrame } from '../resource_sources';
import { CostModifierService } from './cost_modifier_service';
import { ResultModifierService } from './result_modifier_service';
import { EvaluationModifierService } from './evaluation_modifier_service';
import {
	type PassiveMetadata,
	type PassiveRecord,
	type PassiveSummary,
	type CostBag,
	type CostModifier,
	type EvaluationModifier,
	type ResourceGain,
	type ResultModifier,
	type PhaseSkipConfig,
} from './passive_types';
import {
	clonePassiveMetadata,
	clonePassiveRecord,
	reverseEffect,
	registerSkipFlags,
	clearSkipFlags,
} from './passive_helpers';

type PassivePayload = {
	id: string;
	name?: string | undefined;
	icon?: string | undefined;
	detail?: string | undefined;
	meta?: PassiveMetadata | undefined;
	effects?: PassiveRecord['effects'];
	onPayUpkeepStep?: PassiveRecord['onPayUpkeepStep'];
	onGainIncomeStep?: PassiveRecord['onGainIncomeStep'];
	onGainAPStep?: PassiveRecord['onGainAPStep'];
	onBeforeAttacked?: PassiveRecord['onBeforeAttacked'];
	onAttackResolved?: PassiveRecord['onAttackResolved'];
	skip?: PhaseSkipConfig;
	[trigger: string]: unknown;
};

export class PassiveManager {
	private costModifiers = new CostModifierService();
	private resultModifiers = new ResultModifierService();
	private evaluationModifiers = new EvaluationModifierService();
	private passives: Map<string, PassiveRecord> = new Map();

	private makeKey(id: string, owner: PlayerId) {
		return `${id}_${owner}`;
	}

	private ensureFrameList(
		frames?: ResourceSourceFrame | ResourceSourceFrame[],
	): ResourceSourceFrame[] {
		if (!frames) {
			return [];
		}
		return Array.isArray(frames) ? [...frames] : [frames];
	}

	registerCostModifier(id: string, modifier: CostModifier) {
		this.costModifiers.register(id, modifier);
	}

	unregisterCostModifier(id: string) {
		this.costModifiers.unregister(id);
	}

	registerResultModifier(id: string, modifier: ResultModifier) {
		this.resultModifiers.register(id, modifier);
	}

	unregisterResultModifier(id: string) {
		this.resultModifiers.unregister(id);
	}

	registerEvaluationModifier(
		id: string,
		target: string,
		modifier: EvaluationModifier,
	) {
		this.evaluationModifiers.register(id, target, modifier);
	}

	unregisterEvaluationModifier(id: string) {
		this.evaluationModifiers.unregister(id);
	}

	get evaluationMods(): ReadonlyMap<string, Map<string, EvaluationModifier>> {
		return this.evaluationModifiers.getMap();
	}

	applyCostModifiers(
		actionId: string,
		base: CostBag,
		context: EngineContext,
	): CostBag {
		return this.costModifiers.apply(actionId, base, context);
	}

	applyCostMods(
		actionId: string,
		base: CostBag,
		context: EngineContext,
	): CostBag {
		return this.applyCostModifiers(actionId, base, context);
	}

	runResultModifiers(actionId: string, context: EngineContext) {
		this.resultModifiers.run(actionId, context);
	}

	runResultMods(actionId: string, context: EngineContext) {
		this.runResultModifiers(actionId, context);
	}

	runEvaluationModifiers(
		target: string,
		context: EngineContext,
		gains: ResourceGain[],
	) {
		this.evaluationModifiers.run(target, context, gains);
	}

	runEvaluationMods(
		target: string,
		context: EngineContext,
		gains: ResourceGain[],
	) {
		this.runEvaluationModifiers(target, context, gains);
	}

	addPassive(
		passive: PassivePayload,
		context: EngineContext,
		options?: {
			frames?: ResourceSourceFrame | ResourceSourceFrame[];
			detail?: string;
			meta?: PassiveMetadata;
		},
	) {
		const key = this.makeKey(passive.id, context.activePlayer.id);
		const providedFrames = this.ensureFrameList(options?.frames);
		const passiveFrame: ResourceSourceFrame = (
			_effect,
			_context,
			resourceKey,
		) => ({
			key: `passive:${key}:${resourceKey}`,
			instance: key,
			detail: options?.detail ?? passive.name ?? 'Passive',
			longevity: 'ongoing' as const,
		});
		const frames = [...providedFrames, passiveFrame];
		const record = {
			...passive,
			owner: context.activePlayer.id,
			frames,
		} as PassiveRecord;
		if (options?.detail !== undefined) {
			record.detail = options.detail;
		}
		if (options?.meta !== undefined) {
			record.meta = options.meta;
		}
		registerSkipFlags(context.activePlayer, record.id, record.skip);
		this.passives.set(key, record);
		const setupEffects = record.effects;
		if (setupEffects && setupEffects.length > 0) {
			withResourceSourceFrames(context, frames, () =>
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
		clearSkipFlags(context.activePlayer, passive.id, passive.skip);
		const teardownEffects = passive.effects;
		if (teardownEffects && teardownEffects.length > 0) {
			withResourceSourceFrames(context, passive.frames, () =>
				runEffects(teardownEffects.map(reverseEffect), context),
			);
		}
		this.passives.delete(key);
	}

	list(owner?: PlayerId): PassiveSummary[] {
		const entries = owner
			? Array.from(this.passives.entries()).filter(([key]) =>
					key.endsWith(`_${owner}`),
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
		cloned.costModifiers = this.costModifiers.clone();
		cloned.resultModifiers = this.resultModifiers.clone();
		cloned.evaluationModifiers = this.evaluationModifiers.clone();
		cloned.passives = new Map(
			Array.from(this.passives.entries()).map(([key, value]) => [
				key,
				clonePassiveRecord(value),
			]),
		);
		return cloned;
	}
}
