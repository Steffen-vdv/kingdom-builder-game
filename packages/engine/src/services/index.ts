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

type PassiveDefinition = {
	id: string;
	effects: EffectDef[];
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
	onPayUpkeepStep?: EffectDef[];
	onGainIncomeStep?: EffectDef[];
	onGainAPStep?: EffectDef[];
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
	private definitions: HappinessTierDefinition[];
	constructor(private rules: RuleSet) {
		this.resourceKey = rules.tieredResourceKey;
		this.definitions = [...rules.tierDefinitions].sort(
			(a, b) => a.range.min - b.range.min,
		);
	}
	definition(value: number): HappinessTierDefinition | undefined {
		let last: HappinessTierDefinition | undefined;
		for (const tier of this.definitions) {
			if (value < tier.range.min) break;
			if (tier.range.max !== undefined && value > tier.range.max) continue;
			last = tier;
		}
		return last;
	}
	tier(value: number): TierEffect | undefined {
		return this.definition(value)?.effect;
	}
}

type AppliedSkipRecord = {
	phases: Record<string, number>;
	steps: Record<string, Record<string, number>>;
};

class HappinessThresholdController {
	private activeTier: Map<PlayerId, string> = new Map();
	private activePassive: Map<PlayerId, string> = new Map();
	private skipRecords: Map<PlayerId, AppliedSkipRecord> = new Map();

	constructor(
		private rules: RuleSet,
		private tieredResource: TieredResourceService,
	) {}

	syncPlayer(ctx: EngineContext, player: PlayerState) {
		const key = this.rules.tieredResourceKey;
		const value = player.resources[key] ?? 0;
		const nextTier = this.tieredResource.definition(value);
		this.updateTier(ctx, player, nextTier);
	}

	handleResourceChange(
		ctx: EngineContext,
		player: PlayerState,
		key: ResourceKey,
		previous: number,
		next: number,
	) {
		if (key !== this.rules.tieredResourceKey || previous === next) {
			return;
		}
		const nextTier = this.tieredResource.definition(next);
		this.updateTier(ctx, player, nextTier);
	}

	private updateTier(
		ctx: EngineContext,
		player: PlayerState,
		nextTier: HappinessTierDefinition | undefined,
	) {
		const currentTierId = this.activeTier.get(player.id);
		if (!nextTier) {
			if (currentTierId) this.removePassive(ctx, player);
			return;
		}
		if (currentTierId === nextTier.id) return;
		if (currentTierId) this.removePassive(ctx, player);
		this.applyPassive(ctx, player, nextTier);
	}

	private applyPassive(
		ctx: EngineContext,
		player: PlayerState,
		tier: HappinessTierDefinition,
	) {
		const { passive, display } = tier;
		const passiveDef: PassiveDefinition = {
			id: passive.id,
			effects: passive.effects ?? [],
		};
		if (passive.onGrowthPhase) passiveDef.onGrowthPhase = passive.onGrowthPhase;
		if (passive.onUpkeepPhase) passiveDef.onUpkeepPhase = passive.onUpkeepPhase;
		if (passive.onBeforeAttacked)
			passiveDef.onBeforeAttacked = passive.onBeforeAttacked;
		if (passive.onAttackResolved)
			passiveDef.onAttackResolved = passive.onAttackResolved;
		if (passive.onPayUpkeepStep)
			passiveDef.onPayUpkeepStep = passive.onPayUpkeepStep;
		if (passive.onGainIncomeStep)
			passiveDef.onGainIncomeStep = passive.onGainIncomeStep;
		if (passive.onGainAPStep) passiveDef.onGainAPStep = passive.onGainAPStep;

		const sourceMeta: PassiveSourceMetadata = {
			type: 'happiness-tier',
			id: tier.id,
		};
		const icon = display?.icon;
		if (icon !== undefined) sourceMeta.icon = icon;
		const summaryToken = display?.summaryToken;
		if (summaryToken !== undefined) sourceMeta.summaryToken = summaryToken;

		const removalMeta: PassiveRemovalMetadata = {};
		const removalText = passive.text?.removal;
		if (removalText !== undefined) removalMeta.text = removalText;
		const removalCondition = display?.removalCondition;
		if (removalCondition !== undefined)
			removalMeta.condition = removalCondition;

		const meta: PassiveMetadata = { source: sourceMeta };
		if (Object.keys(removalMeta).length > 0) meta.removal = removalMeta;
		if (passive.text) meta.text = passive.text;
		if (display) meta.display = display;

		const detail = passive.text?.summary || 'Passive';
		ctx.passives.addPassive(passiveDef, ctx, {
			owner: player,
			detail,
			meta,
		});
		this.applySkip(player, passive.skip);
		this.activeTier.set(player.id, tier.id);
		this.activePassive.set(player.id, passive.id);
		player.happinessTierId = tier.id;
		player.happinessPassiveId = passive.id;
	}

	private removePassive(ctx: EngineContext, player: PlayerState) {
		const passiveId = this.activePassive.get(player.id);
		if (!passiveId) {
			return;
		}
		ctx.passives.removePassive(passiveId, ctx, player);
		this.clearSkip(player);
		this.activePassive.delete(player.id);
		this.activeTier.delete(player.id);
		delete player.happinessTierId;
		delete player.happinessPassiveId;
	}

	private applySkip(player: PlayerState, skip?: TierPassiveSkipConfig) {
		if (!skip) {
			this.skipRecords.delete(player.id);
			return;
		}
		const record: AppliedSkipRecord = { phases: {}, steps: {} };
		if (skip.phases) {
			for (const phaseId of skip.phases) {
				player.skipPhases[phaseId] = (player.skipPhases[phaseId] ?? 0) + 1;
				record.phases[phaseId] = (record.phases[phaseId] ?? 0) + 1;
			}
		}
		if (skip.steps) {
			for (const step of skip.steps) {
				const { phaseId, stepId } = step;
				if (!phaseId || !stepId) continue;
				const phaseRecord = (player.skipSteps[phaseId] =
					player.skipSteps[phaseId] || {});
				phaseRecord[stepId] = (phaseRecord[stepId] ?? 0) + 1;
				const recordPhase = (record.steps[phaseId] =
					record.steps[phaseId] || {});
				recordPhase[stepId] = (recordPhase[stepId] ?? 0) + 1;
			}
		}
		this.skipRecords.set(player.id, record);
	}

	private clearSkip(player: PlayerState) {
		const record = this.skipRecords.get(player.id);
		if (!record) return;
		for (const [phaseId, count] of Object.entries(record.phases)) {
			const current = player.skipPhases[phaseId] ?? 0;
			const next = current - count;
			if (next > 0) player.skipPhases[phaseId] = next;
			else delete player.skipPhases[phaseId];
		}
		for (const [phaseId, steps] of Object.entries(record.steps)) {
			const phaseMap = player.skipSteps[phaseId];
			if (!phaseMap) continue;
			for (const [stepId, count] of Object.entries(steps)) {
				const current = phaseMap[stepId] ?? 0;
				const next = current - count;
				if (next > 0) phaseMap[stepId] = next;
				else delete phaseMap[stepId];
			}
			if (Object.keys(phaseMap).length === 0) {
				delete player.skipSteps[phaseId];
			}
		}
		this.skipRecords.delete(player.id);
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

export type PassiveSourceMetadata = {
	type: string;
	id: string;
	icon?: string;
	summaryToken?: string;
};

export type PassiveRemovalMetadata = {
	text?: string;
	condition?: string;
};

export type PassiveMetadata = {
	source?: PassiveSourceMetadata;
	removal?: PassiveRemovalMetadata;
	text?: TierPassiveTextTokens;
	display?: TierDisplayMetadata;
};

export class PassiveManager {
	private costMods: Map<string, CostModifier> = new Map();
	private resultMods: Map<string, ResultModifier> = new Map();
	private evaluationMods: Map<string, Map<string, EvaluationModifier>> =
		new Map();
	private evaluationIndex: Map<string, string> = new Map();
	private passives: Map<
		string,
		PassiveDefinition & {
			owner: PlayerId;
			frames: StatSourceFrame[];
			meta?: PassiveMetadata;
		}
	> = new Map();

	private ensureFrameList(
		frames?: StatSourceFrame | StatSourceFrame[],
	): StatSourceFrame[] {
		if (!frames) return [];
		return Array.isArray(frames) ? [...frames] : [frames];
	}

	private withOwner<T>(
		ctx: EngineContext,
		owner: PlayerState,
		action: () => T,
	): T {
		const current = ctx.game.players[ctx.game.currentPlayerIndex]!;
		if (current === owner) return action();
		const ownerIndex = ctx.game.players.findIndex((p) => p.id === owner.id);
		if (ownerIndex === -1) throw new Error(`Unknown passive owner ${owner.id}`);
		const previousIndex = ctx.game.currentPlayerIndex;
		ctx.game.currentPlayerIndex = ownerIndex;
		try {
			return action();
		} finally {
			ctx.game.currentPlayerIndex = previousIndex;
		}
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
		passive: PassiveDefinition,
		ctx: EngineContext,
		options?: {
			frames?: StatSourceFrame | StatSourceFrame[];
			detail?: string;
			owner?: PlayerState;
			meta?: PassiveMetadata;
		},
	) {
		const owner = options?.owner ?? ctx.activePlayer;
		const key = `${passive.id}_${owner.id}`;
		const providedFrames = this.ensureFrameList(options?.frames);
		const passiveFrame: StatSourceFrame = (_effect, _ctx, statKey) => ({
			key: `passive:${key}:${statKey}`,
			instance: key,
			detail: options?.detail ?? 'Passive',
			longevity: 'ongoing' as const,
		});
		const frames = [...providedFrames, passiveFrame];
		const storedPassive: PassiveDefinition & {
			owner: PlayerId;
			frames: StatSourceFrame[];
			meta?: PassiveMetadata;
		} = {
			id: passive.id,
			effects: passive.effects,
			owner: owner.id,
			frames,
		};
		if (passive.onGrowthPhase)
			storedPassive.onGrowthPhase = passive.onGrowthPhase;
		if (passive.onUpkeepPhase)
			storedPassive.onUpkeepPhase = passive.onUpkeepPhase;
		if (passive.onBeforeAttacked)
			storedPassive.onBeforeAttacked = passive.onBeforeAttacked;
		if (passive.onAttackResolved)
			storedPassive.onAttackResolved = passive.onAttackResolved;
		if (passive.onPayUpkeepStep)
			storedPassive.onPayUpkeepStep = passive.onPayUpkeepStep;
		if (passive.onGainIncomeStep)
			storedPassive.onGainIncomeStep = passive.onGainIncomeStep;
		if (passive.onGainAPStep) storedPassive.onGainAPStep = passive.onGainAPStep;
		if (options?.meta) storedPassive.meta = options.meta;
		this.withOwner(ctx, owner, () =>
			withStatSourceFrames(ctx, frames, () =>
				runEffects(storedPassive.effects, ctx),
			),
		);
		this.passives.set(key, storedPassive);
	}

	removePassive(id: string, ctx: EngineContext, owner?: PlayerState) {
		const actualOwner = owner ?? ctx.activePlayer;
		const key = `${id}_${actualOwner.id}`;
		const passive = this.passives.get(key);
		if (!passive) return;
		this.withOwner(ctx, actualOwner, () =>
			withStatSourceFrames(ctx, passive.frames, () =>
				runEffects(passive.effects.map(reverseEffect), ctx),
			),
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
	happinessThresholds: HappinessThresholdController;
	constructor(
		public rules: RuleSet,
		developments: Registry<DevelopmentConfig>,
	) {
		this.tieredResource = new TieredResourceService(rules);
		this.popcap = new PopCapService(rules, developments);
		this.happinessThresholds = new HappinessThresholdController(
			rules,
			this.tieredResource,
		);
	}
}
