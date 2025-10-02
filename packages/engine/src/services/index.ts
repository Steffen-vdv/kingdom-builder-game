import type { ResourceKey, PlayerState, PlayerId } from '../state';
import type { EngineContext } from '../context';
import { runEffects, type EffectDef } from '../effects';
import type { StatSourceFrame } from '../stat_sources';
import { withStatSourceFrames } from '../stat_sources';
import type { DevelopmentConfig } from '../config/schema';
import type { Registry } from '../registry';

export interface PassiveSummary {
	id: string;
	name?: string | undefined;
	icon?: string | undefined;
}

type PassiveRecord = PassiveSummary & {
	effects?: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	owner: PlayerId;
	frames: StatSourceFrame[];
  meta?: PassiveMetadata;
};

export type TierRange = {
	/** Inclusive lower bound for the tier. */
	min: number;
	/** Inclusive upper bound for the tier. Undefined means open ended. */
	max?: number;
};

export type TierPassiveSkipStep = {
	phaseId: string;
	stepId: string;
};

export type TierPassiveSkipConfig = {
	phases?: string[];
	steps?: TierPassiveSkipStep[];
};

export type TierPassiveTextTokens = {
	summary?: string;
	description?: string;
	removal?: string;
};

export type TierPassivePayload = {
	id: string;
	effects?: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	onPayUpkeepStep?: EffectDef[];
	onGainIncomeStep?: EffectDef[];
	onGainAPStep?: EffectDef[];
	skip?: TierPassiveSkipConfig;
	text?: TierPassiveTextTokens;
};

export type TierDisplayMetadata = {
	removalCondition?: string;
	icon?: string;
	summaryToken?: string;
};

export type TierEffect = {
	incomeMultiplier: number;
	buildingDiscountPct?: number; // 0.2 = 20%
	growthBonusPct?: number;
	upkeepCouncilReduction?: number; // if present, e.g., 1 instead of 2
	halveCouncilAPInUpkeep?: boolean;
	disableGrowth?: boolean;
};

export type HappinessTierDefinition = {
	id: string;
	range: TierRange;
	effect: TierEffect;
	passive: TierPassivePayload;
	display?: TierDisplayMetadata;
};

export type PassiveSourceMetadata = {
	type: string;
	id: string;
	icon?: string;
	labelToken?: string;
};

export type PassiveRemovalMetadata = {
	token?: string;
	text?: string;
};

export type PassiveMetadata = {
	source?: PassiveSourceMetadata;
	removal?: PassiveRemovalMetadata;
};

export type RuleSet = {
	defaultActionAPCost: number;
	absorptionCapPct: number;
	absorptionRounding: 'down' | 'up' | 'nearest';
	tieredResourceKey: ResourceKey;
	tierDefinitions: HappinessTierDefinition[];
	slotsPerNewLand: number;
	maxSlotsPerLand: number;
	basePopulationCap: number;
};

class TieredResourceService {
	resourceKey: ResourceKey;
	constructor(private rules: RuleSet) {
		this.resourceKey = rules.tieredResourceKey;
	}
	definition(value: number): HappinessTierDefinition | undefined {
		let match: HappinessTierDefinition | undefined;
		for (const tier of this.rules.tierDefinitions) {
			if (value < tier.range.min) break;
			if (tier.range.max !== undefined && value > tier.range.max) continue;
			match = tier;
		}
		return match;
	}
	tier(value: number): TierEffect | undefined {
		return this.definition(value)?.effect;
	}
}

// PopCap policy (placeholder — data-driven later)
class PopCapService {
	constructor(
		private rules: RuleSet,
		private developments: Registry<DevelopmentConfig>,
	) {}
	getCap(player: PlayerState): number {
		let cap = this.rules.basePopulationCap;
		for (const land of player.lands) {
			for (const id of land.developments) {
				const def = this.developments.get(id);
				cap += def.populationCap ?? 0;
			}
		}
		return cap;
	}
}

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
	ctx: EngineContext,
) => CostModifierResult | void;
export type ResultModifier = (actionId: string, ctx: EngineContext) => void;
export type ResourceGain = { key: string; amount: number };
export type EvaluationModifierPercent =
	| number
	| Partial<Record<string, number>>;
export type EvaluationModifierResult = {
	percent?: EvaluationModifierPercent;
};
export type EvaluationModifier = (
	ctx: EngineContext,
	gains: ResourceGain[],
) => EvaluationModifierResult | void;

export class PassiveManager {
	private costMods: Map<string, CostModifier> = new Map();
	private resultMods: Map<string, ResultModifier> = new Map();
	private evaluationMods: Map<string, Map<string, EvaluationModifier>> =
		new Map();
	private evaluationIndex: Map<string, string> = new Map();

	private passives: Map<string, PassiveRecord> = new Map();

	private ensureFrameList(
		frames?: StatSourceFrame | StatSourceFrame[],
	): StatSourceFrame[] {
		if (!frames) return [];
		return Array.isArray(frames) ? [...frames] : [frames];
	}

	registerCostModifier(id: string, mod: CostModifier) {
		this.costMods.set(id, mod);
	}
	unregisterCostModifier(id: string) {
		this.costMods.delete(id);
	}
	registerResultModifier(id: string, mod: ResultModifier) {
		this.resultMods.set(id, mod);
	}
	unregisterResultModifier(id: string) {
		this.resultMods.delete(id);
	}

	registerEvaluationModifier(
		id: string,
		target: string,
		mod: EvaluationModifier,
	) {
		if (!this.evaluationMods.has(target))
			this.evaluationMods.set(target, new Map());
		this.evaluationMods.get(target)!.set(id, mod);
		this.evaluationIndex.set(id, target);
	}
	unregisterEvaluationModifier(id: string) {
		const target = this.evaluationIndex.get(id);
		if (!target) return;
		const mods = this.evaluationMods.get(target);
		mods?.delete(id);
		if (mods && mods.size === 0) this.evaluationMods.delete(target);
		this.evaluationIndex.delete(id);
	}

	applyCostMods(actionId: string, base: CostBag, ctx: EngineContext): CostBag {
		const running: CostBag = { ...base };
		const percentTotals: Partial<Record<ResourceKey, number>> = {};
		for (const modifier of this.costMods.values()) {
			const result = modifier(actionId, running, ctx);
			if (!result) continue;
			if (result.flat) {
				for (const [key, delta] of Object.entries(result.flat)) {
					if (typeof delta !== 'number') continue;
					const current = running[key] ?? 0;
					running[key] = current + delta;
				}
			}
			if (result.percent) {
				for (const [key, pct] of Object.entries(result.percent)) {
					if (typeof pct !== 'number') continue;
					percentTotals[key] = (percentTotals[key] ?? 0) + pct;
				}
			}
		}
		for (const [key, pct] of Object.entries(percentTotals)) {
			if (typeof pct !== 'number') continue;
			const current = running[key] ?? 0;
			running[key] = current + current * pct;
		}
		return running;
	}

	runResultMods(actionId: string, ctx: EngineContext) {
		for (const modifier of this.resultMods.values()) modifier(actionId, ctx);
	}

	runEvaluationMods(target: string, ctx: EngineContext, gains: ResourceGain[]) {
		const mods = this.evaluationMods.get(target);
		if (!mods) return;
		let globalPercent = 0;
		const perResourcePercent: Partial<Record<string, number>> = {};
		for (const mod of mods.values()) {
			const result = mod(ctx, gains);
			if (!result || result.percent === undefined) continue;
			const percent = result.percent;
			if (typeof percent === 'number') {
				globalPercent += percent;
			} else {
				for (const [key, value] of Object.entries(percent)) {
					if (typeof value !== 'number') continue;
					perResourcePercent[key] = (perResourcePercent[key] ?? 0) + value;
				}
			}
		}
		if (globalPercent === 0 && Object.keys(perResourcePercent).length === 0)
			return;
		for (const gain of gains) {
			const keyed = perResourcePercent[gain.key] ?? 0;
			const total = globalPercent + keyed;
			if (total === 0) continue;
			gain.amount += gain.amount * total;
		}
	}

	addPassive(
		passive: {
			id: string;
			name?: string | undefined;
			icon?: string | undefined;
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
		const key = `${passive.id}_${ctx.activePlayer.id}`;
		const providedFrames = this.ensureFrameList(options?.frames);
		const passiveFrame: StatSourceFrame = (_effect, _ctx, statKey) => ({
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
      ...(options?.meta ? { meta: options.meta } : {}),
		});
		const setupEffects = passive.effects;
		if (setupEffects && setupEffects.length > 0) {
			withStatSourceFrames(ctx, frames, () => runEffects(setupEffects, ctx));
		}
	}

	removePassive(id: string, ctx: EngineContext) {
		const key = `${id}_${ctx.activePlayer.id}`;
		const passive = this.passives.get(key);
		if (!passive) return;
		const teardownEffects = passive.effects;
		if (teardownEffects && teardownEffects.length > 0) {
			withStatSourceFrames(ctx, passive.frames, () =>
				runEffects(teardownEffects.map(reverseEffect), ctx),
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
			if (value.name !== undefined) summary.name = value.name;
			if (value.icon !== undefined) summary.icon = value.icon;
			return summary;
		});
	}

	values(owner: PlayerId): PassiveRecord[] {
		const suffix = `_${owner}`;
		return Array.from(this.passives.entries())
			.filter(([k]) => k.endsWith(suffix))
			.map(([, v]) => v);
	}
}

function reverseEffect(effect: EffectDef): EffectDef {
	const reversed: EffectDef = { ...effect };
	if (effect.effects) reversed.effects = effect.effects.map(reverseEffect);
	if (effect.method === 'add') reversed.method = 'remove';
	else if (effect.method === 'remove') reversed.method = 'add';
	return reversed;
}

export class Services {
	tieredResource: TieredResourceService;
	popcap: PopCapService;
	private activeTiers: Map<PlayerId, HappinessTierDefinition> = new Map();
	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.popcap = new PopCapService(rules, developments);
	}

	private registerSkipFlags(player: PlayerState, passive: TierPassivePayload) {
		const skip = passive.skip;
		if (!skip) return;
		const sourceId = passive.id;
		if (skip.phases) {
			for (const phaseId of skip.phases) {
				const phaseBucket = player.skipPhases[phaseId] ?? {};
				phaseBucket[sourceId] = true;
				player.skipPhases[phaseId] = phaseBucket;
			}
		}
		if (skip.steps) {
			for (const { phaseId, stepId } of skip.steps) {
				const phaseBucket = player.skipSteps[phaseId] ?? {};
				const stepBucket = phaseBucket[stepId] ?? {};
				stepBucket[sourceId] = true;
				phaseBucket[stepId] = stepBucket;
				player.skipSteps[phaseId] = phaseBucket;
			}
		}
	}

	private clearSkipFlags(player: PlayerState, passive: TierPassivePayload) {
		const skip = passive.skip;
		if (!skip) return;
		const sourceId = passive.id;
		if (skip.phases) {
			for (const phaseId of skip.phases) {
				const bucket = player.skipPhases[phaseId];
				if (!bucket) continue;
				delete bucket[sourceId];
				if (Object.keys(bucket).length === 0) delete player.skipPhases[phaseId];
			}
		}
		if (skip.steps) {
			for (const { phaseId, stepId } of skip.steps) {
				const phaseBucket = player.skipSteps[phaseId];
				if (!phaseBucket) continue;
				const stepBucket = phaseBucket[stepId];
				if (!stepBucket) continue;
				delete stepBucket[sourceId];
				if (Object.keys(stepBucket).length === 0) delete phaseBucket[stepId];
				if (Object.keys(phaseBucket).length === 0)
					delete player.skipSteps[phaseId];
			}
		}
	}

	handleTieredResourceChange(ctx: EngineContext, resourceKey: ResourceKey) {
		if (resourceKey !== this.tieredResource.resourceKey) return;
		const player = ctx.activePlayer;
		const value = player.resources[resourceKey] ?? 0;
		const nextTier = this.tieredResource.definition(value);
		const currentTier = this.activeTiers.get(player.id);
		if (currentTier?.id === nextTier?.id) return;
		if (currentTier) {
			this.clearSkipFlags(player, currentTier.passive);
			ctx.passives.removePassive(currentTier.passive.id, ctx);
			this.activeTiers.delete(player.id);
		}
		if (nextTier) {
			const sourceMeta: PassiveSourceMetadata = {
				type: 'tiered-resource',
				id: nextTier.id,
			};
			if (nextTier.display?.icon) sourceMeta.icon = nextTier.display.icon;
			if (nextTier.display?.summaryToken)
				sourceMeta.labelToken = nextTier.display.summaryToken;
			const removalMeta: PassiveRemovalMetadata = {};
			if (nextTier.display?.removalCondition)
				removalMeta.token = nextTier.display.removalCondition;
			if (nextTier.passive.text?.removal)
				removalMeta.text = nextTier.passive.text.removal;
			const metadata: PassiveMetadata = { source: sourceMeta };
			if (Object.keys(removalMeta).length > 0) metadata.removal = removalMeta;
			ctx.passives.addPassive(nextTier.passive, ctx, {
				detail: nextTier.passive.text?.summary ?? nextTier.id,
				meta: metadata,
			});
			this.registerSkipFlags(player, nextTier.passive);
			this.activeTiers.set(player.id, nextTier);
		}
	}

	initializeTierPassives(ctx: EngineContext) {
		const resourceKey = this.tieredResource.resourceKey;
		const previousIndex = ctx.game.currentPlayerIndex;
		ctx.game.players.forEach((_player, index) => {
			ctx.game.currentPlayerIndex = index;
			this.handleTieredResourceChange(ctx, resourceKey);
		});
		ctx.game.currentPlayerIndex = previousIndex;
	}
}
