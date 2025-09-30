import type { ResourceKey, PlayerState, PlayerId } from '../state';
import type { EngineContext } from '../context';
import { runEffects, type EffectDef } from '../effects';
import type { StatSourceFrame } from '../stat_sources';
import { withStatSourceFrames } from '../stat_sources';
import type { DevelopmentConfig } from '../config/schema';
import type { Registry } from '../registry';

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
	tier(value: number): TierEffect | undefined {
		let last: TierEffect | undefined;
		for (const tier of this.rules.tierDefinitions) {
			if (value < tier.range.min) break;
			if (tier.range.max !== undefined && value > tier.range.max) continue;
			last = tier.effect;
		}
		return last;
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
	private passives: Map<
		string,
		{
			effects: EffectDef[];
			onGrowthPhase?: EffectDef[];
			onUpkeepPhase?: EffectDef[];
			onBeforeAttacked?: EffectDef[];
			onAttackResolved?: EffectDef[];
			owner: PlayerId;
			frames: StatSourceFrame[];
		}
	> = new Map();

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
			effects: EffectDef[];
			onGrowthPhase?: EffectDef[];
			onUpkeepPhase?: EffectDef[];
			onBeforeAttacked?: EffectDef[];
			onAttackResolved?: EffectDef[];
		},
		ctx: EngineContext,
		options?: {
			frames?: StatSourceFrame | StatSourceFrame[];
			detail?: string;
		},
	) {
		const key = `${passive.id}_${ctx.activePlayer.id}`;
		const providedFrames = this.ensureFrameList(options?.frames);
		const passiveFrame: StatSourceFrame = (_effect, _ctx, statKey) => ({
			key: `passive:${key}:${statKey}`,
			instance: key,
			detail: options?.detail ?? 'Passive',
			longevity: 'ongoing' as const,
		});
		const frames = [...providedFrames, passiveFrame];
		this.passives.set(key, { ...passive, owner: ctx.activePlayer.id, frames });
		withStatSourceFrames(ctx, frames, () => runEffects(passive.effects, ctx));
	}

	removePassive(id: string, ctx: EngineContext) {
		const key = `${id}_${ctx.activePlayer.id}`;
		const passive = this.passives.get(key);
		if (!passive) return;
		withStatSourceFrames(ctx, passive.frames, () =>
			runEffects(passive.effects.map(reverseEffect), ctx),
		);
		this.passives.delete(key);
	}

	list(owner?: PlayerId) {
		if (!owner) return Array.from(this.passives.keys());
		const suffix = `_${owner}`;
		return Array.from(this.passives.keys())
			.filter((k) => k.endsWith(suffix))
			.map((k) => k.slice(0, -suffix.length));
	}

	values(owner: PlayerId) {
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
	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.popcap = new PopCapService(rules, developments);
	}
}
