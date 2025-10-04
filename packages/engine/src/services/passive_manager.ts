import type { EngineContext } from '../context';
import type { PlayerId } from '../state';
import { runEffects, type EffectDef } from '../effects';
import { withStatSourceFrames } from '../stat_sources';
import type { StatSourceFrame } from '../stat_sources';
import type {
	CostBag,
	CostModifier,
	EvaluationModifier,
	PassiveMetadata,
	PassiveSummary,
	ResourceGain,
	ResultModifier,
} from './passive_types';
import { CostModifierService } from './cost_modifier_service';
import { EvaluationModifierService } from './evaluation_modifier_service';
import { ResultModifierService } from './result_modifier_service';
import {
	clonePassiveMetadata,
	clonePassiveRecord,
	reverseEffect,
	type PassiveRecord,
} from './passive_manager_helpers';

type EvaluationModifierLookup = Map<string, Map<string, EvaluationModifier>>;

export class PassiveManager {
	private costService: CostModifierService;
	private resultService: ResultModifierService;
	private evaluationService: EvaluationModifierService;
	private passives: Map<string, PassiveRecord>;

	constructor(
		costService?: CostModifierService,
		resultService?: ResultModifierService,
		evaluationService?: EvaluationModifierService,
		passives?: Map<string, PassiveRecord>,
	) {
		this.costService = costService ?? new CostModifierService();
		this.resultService = resultService ?? new ResultModifierService();
		this.evaluationService =
			evaluationService ?? new EvaluationModifierService();
		this.passives = passives
			? new Map<string, PassiveRecord>(passives)
			: new Map<string, PassiveRecord>();
	}

	get evaluationMods(): EvaluationModifierLookup {
		return this.evaluationService.modifiers;
	}

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

	registerCostModifier(id: string, modifier: CostModifier) {
		this.costService.register(id, modifier);
	}

	unregisterCostModifier(id: string) {
		this.costService.unregister(id);
	}

	registerResultModifier(id: string, modifier: ResultModifier) {
		this.resultService.register(id, modifier);
	}

	unregisterResultModifier(id: string) {
		this.resultService.unregister(id);
	}

	registerEvaluationModifier(
		id: string,
		target: string,
		modifier: EvaluationModifier,
	) {
		this.evaluationService.register(id, target, modifier);
	}

	unregisterEvaluationModifier(id: string) {
		this.evaluationService.unregister(id);
	}

	// prettier-ignore
	applyCostMods(
                actionId: string,
                base: CostBag,
                ctx: EngineContext,
        ): CostBag {
                return this.costService.apply(actionId, base, ctx);
        }

	runResultMods(actionId: string, ctx: EngineContext) {
		this.resultService.run(actionId, ctx);
	}

	// prettier-ignore
	runEvaluationMods(
                target: string,
                ctx: EngineContext,
                gains: ResourceGain[],
        ) {
                this.evaluationService.run(target, ctx, gains);
        }

	addPassive(
		passive: {
			id: string;
			name?: string;
			icon?: string;
			effects?: EffectDef[];
			onGrowthPhase?: EffectDef[];
			onUpkeepPhase?: EffectDef[];
			onBeforeAttacked?: EffectDef[];
			onAttackResolved?: EffectDef[];
		},
		ctx: EngineContext,
		options?: {
			frames?: StatSourceFrame | StatSourceFrame[];
			detail?: string;
			meta?: PassiveMetadata;
		},
	) {
		const key = this.makeKey(passive.id, ctx.activePlayer.id);
		const providedFrames = this.ensureFrameList(options?.frames);
		// prettier-ignore
		const passiveFrame: StatSourceFrame = (
                        _effect,
                        _ctx,
                        statKey,
                ) => ({
                        key: `passive:${key}:${statKey}`,
                        instance: key,
                        detail: options?.detail ?? passive.name ?? 'Passive',
                        longevity: 'ongoing' as const,
                });
		const frames = [...providedFrames, passiveFrame];
		this.passives.set(key, {
			...passive,
			owner: ctx.activePlayer.id,
			frames,
			...(options?.detail ? { detail: options.detail } : {}),
			...(options?.meta ? { meta: options.meta } : {}),
		});
		const setupEffects = passive.effects;
		if (setupEffects && setupEffects.length > 0) {
			// prettier-ignore
			withStatSourceFrames(ctx, frames, () =>
                                runEffects(setupEffects, ctx),
                        );
		}
	}

	removePassive(id: string, ctx: EngineContext) {
		const key = this.makeKey(id, ctx.activePlayer.id);
		const passive = this.passives.get(key);
		if (!passive) {
			return;
		}
		const teardownEffects = passive.effects;
		if (teardownEffects && teardownEffects.length > 0) {
			// prettier-ignore
			withStatSourceFrames(ctx, passive.frames, () =>
                                runEffects(
                                        teardownEffects.map(reverseEffect),
                                        ctx,
                                ),
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
			const summary: PassiveSummary = {
				id: value.id,
				...(value.name !== undefined ? { name: value.name } : {}),
				...(value.icon !== undefined ? { icon: value.icon } : {}),
				...(value.detail !== undefined ? { detail: value.detail } : {}),
			};
			const meta = clonePassiveMetadata(value.meta);
			return meta ? { ...summary, meta } : summary;
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
		const clonedPassives = new Map(
			Array.from(this.passives.entries()).map(([key, value]) => [
				key,
				clonePassiveRecord(value),
			]),
		);
		return new PassiveManager(
			this.costService.clone(),
			this.resultService.clone(),
			this.evaluationService.clone(),
			clonedPassives,
		);
	}
}
