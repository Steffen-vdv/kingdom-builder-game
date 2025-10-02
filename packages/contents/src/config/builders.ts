import type {
	ActionConfig,
	BuildingConfig,
	DevelopmentConfig,
	PopulationConfig,
	RequirementConfig,
	EffectConfig,
} from '@kingdom-builder/engine/config/schema';
import type { ResourceKey } from '../resources';
import type { StatKey } from '../stats';
import type { PopulationRoleId } from '../populationRoles';
import type { TriggerKey } from '../defs';
import type { EvaluatorDef } from '@kingdom-builder/engine/evaluators';
import type { EffectDef } from '@kingdom-builder/engine/effects';
import type { AttackTarget } from '@kingdom-builder/engine/effects/attack';
import type {
	TierPassivePayload,
	TierDisplayMetadata,
	TierPassiveTextTokens,
	TierRange,
	TierPassiveSkipConfig,
	HappinessTierDefinition,
	TierEffect,
} from '@kingdom-builder/engine/services';

export const Types = {
	Land: 'land',
	Resource: 'resource',
	Building: 'building',
	Development: 'development',
	Passive: 'passive',
	CostMod: 'cost_mod',
	ResultMod: 'result_mod',
	Population: 'population',
	Action: 'action',
	Stat: 'stat',
} as const;

export const LandMethods = {
	ADD: 'add',
	TILL: 'till',
} as const;

export const ResourceMethods = {
	ADD: 'add',
	REMOVE: 'remove',
	TRANSFER: 'transfer',
} as const;

export const BuildingMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const DevelopmentMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const PassiveMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const CostModMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const ResultModMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const PopulationMethods = {
	ADD: 'add',
	REMOVE: 'remove',
} as const;

export const ActionMethods = {
	ADD: 'add',
	REMOVE: 'remove',
	PERFORM: 'perform',
} as const;

export const StatMethods = {
	ADD: 'add',
	ADD_PCT: 'add_pct',
	REMOVE: 'remove',
} as const;

type Params = Record<string, unknown>;

abstract class ParamsBuilder<P extends Params = Params> {
	protected params: P;
	private readonly assigned = new Set<keyof P>();

	constructor(initial?: P) {
		this.params = initial ?? ({} as P);
	}

	protected wasSet(key: keyof P) {
		return this.assigned.has(key);
	}

	protected set<K extends keyof P>(key: K, value: P[K], message?: string) {
		if (this.assigned.has(key)) {
			throw new Error(
				message ??
					`You already set ${String(
						key,
					)} for this configuration. Remove the extra ${String(key)} call.`,
			);
		}
		this.params[key] = value;
		this.assigned.add(key);
		return this;
	}

	build(): P {
		return this.params;
	}
}

function resolveEffectConfig(effect: EffectConfig | EffectBuilder) {
	return effect instanceof EffectBuilder ? effect.build() : effect;
}

class ResourceEffectParamsBuilder extends ParamsBuilder<{
	key?: ResourceKey;
	amount?: number;
	percent?: number;
}> {
	key(key: ResourceKey) {
		return this.set(
			'key',
			key,
			'You already chose a resource with key(). Remove the extra key() call.',
		);
	}
	amount(amount: number) {
		if (this.wasSet('percent'))
			throw new Error(
				'Resource change cannot use both amount() and percent(). Choose one of them.',
			);
		return this.set(
			'amount',
			amount,
			'You already set amount() for this resource change. Remove the duplicate amount() call.',
		);
	}
	percent(percent: number) {
		if (this.wasSet('amount'))
			throw new Error(
				'Resource change cannot use both amount() and percent(). Choose one of them.',
			);
		return this.set(
			'percent',
			percent,
			'You already set percent() for this resource change. Remove the duplicate percent() call.',
		);
	}

	override build() {
		if (!this.wasSet('key'))
			throw new Error(
				'Resource change is missing key(). Call key(Resource.yourChoice) to choose what should change.',
			);
		if (!this.wasSet('amount') && !this.wasSet('percent'))
			throw new Error(
				'Resource change needs exactly one of amount() or percent(). Pick how much the resource should change.',
			);
		return super.build();
	}
}

export function resourceParams() {
	return new ResourceEffectParamsBuilder();
}

class StatEffectParamsBuilder extends ParamsBuilder<{
	key?: StatKey;
	amount?: number;
	percent?: number;
	percentStat?: StatKey;
}> {
	key(key: StatKey) {
		return this.set(
			'key',
			key,
			'You already chose a stat with key(). Remove the extra key() call.',
		);
	}
	amount(amount: number) {
		if (this.wasSet('percent') || this.wasSet('percentStat'))
			throw new Error(
				'Stat change cannot mix amount() with percent() or percentFromStat(). Pick one approach to describe the change.',
			);
		return this.set(
			'amount',
			amount,
			'You already set amount() for this stat change. Remove the duplicate amount() call.',
		);
	}
	percent(percent: number) {
		if (this.wasSet('amount') || this.wasSet('percentStat'))
			throw new Error(
				'Stat change cannot mix percent() with amount() or percentFromStat(). Pick one approach to describe the change.',
			);
		return this.set(
			'percent',
			percent,
			'You already set percent() for this stat change. Remove the duplicate percent() call.',
		);
	}
	percentFromStat(stat: StatKey) {
		if (this.wasSet('amount') || this.wasSet('percent'))
			throw new Error(
				'Stat change cannot mix percentFromStat() with amount() or percent(). Pick one approach to describe the change.',
			);
		return this.set(
			'percentStat',
			stat,
			'You already chose a stat source with percentFromStat(). Remove the duplicate percentFromStat() call.',
		);
	}

	override build() {
		if (!this.wasSet('key'))
			throw new Error(
				'Stat change is missing key(). Call key(Stat.yourChoice) to decide which stat should change.',
			);
		if (
			!this.wasSet('amount') &&
			!this.wasSet('percent') &&
			!this.wasSet('percentStat')
		)
			throw new Error(
				'Stat change needs amount(), percent(), or percentFromStat(). Choose one to describe how the stat should change.',
			);
		return super.build();
	}
}

export function statParams() {
	return new StatEffectParamsBuilder();
}

class DevelopmentEffectParamsBuilder extends ParamsBuilder<{
	id?: string;
	landId?: string;
}> {
	id(id: string) {
		return this.set(
			'id',
			id,
			'You already set id() for this development effect. Remove the duplicate id() call.',
		);
	}
	landId(landId: string) {
		return this.set(
			'landId',
			landId,
			'You already chose a landId() for this development effect. Remove the duplicate landId() call.',
		);
	}

	override build() {
		if (!this.wasSet('id'))
			throw new Error(
				'Development effect is missing id(). Call id("your-development-id") so the engine knows which development to reference.',
			);
		return super.build();
	}
}

export function developmentParams() {
	return new DevelopmentEffectParamsBuilder();
}

class LandEffectParamsBuilder extends ParamsBuilder<{
	count?: number;
	landId?: string;
}> {
	count(count: number) {
		return this.set('count', count);
	}
	landId(landId: string) {
		return this.set('landId', landId);
	}
}

export function landParams() {
	return new LandEffectParamsBuilder();
}

class PassiveEffectParamsBuilder extends ParamsBuilder<{
	id?: string;
	name?: string;
	icon?: string;
	onGrowthPhase?: EffectDef[];
	onUpkeepPhase?: EffectDef[];
	onBeforeAttacked?: EffectDef[];
	onAttackResolved?: EffectDef[];
}> {
	id(id: string) {
		return this.set(
			'id',
			id,
			'You already set id() for this passive. Remove the duplicate id() call.',
		);
	}
	name(name: string) {
		return this.set(
			'name',
			name,
			'You already set name() for this passive. Remove the duplicate name() call.',
		);
	}
	icon(icon: string) {
		return this.set(
			'icon',
			icon,
			'You already set icon() for this passive. Remove the duplicate icon() call.',
		);
	}
	onGrowthPhase(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onGrowthPhase = this.params.onGrowthPhase || [];
		this.params.onGrowthPhase.push(
			...effects.map((item) => resolveEffectConfig(item)),
		);
		return this;
	}
	onUpkeepPhase(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onUpkeepPhase = this.params.onUpkeepPhase || [];
		this.params.onUpkeepPhase.push(
			...effects.map((item) => resolveEffectConfig(item)),
		);
		return this;
	}
	onBeforeAttacked(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onBeforeAttacked = this.params.onBeforeAttacked || [];
		this.params.onBeforeAttacked.push(
			...effects.map((item) => resolveEffectConfig(item)),
		);
		return this;
	}
	onAttackResolved(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onAttackResolved = this.params.onAttackResolved || [];
		this.params.onAttackResolved.push(
			...effects.map((item) => resolveEffectConfig(item)),
		);
		return this;
	}

	override build() {
		if (!this.wasSet('id'))
			throw new Error(
				'Passive effect is missing id(). Call id("your-passive-id") so it can be referenced later.',
			);
		return super.build();
	}
}

export function passiveParams() {
	return new PassiveEffectParamsBuilder();
}

class TierPassiveTextBuilder {
	private tokens: TierPassiveTextTokens = {};

	summary(token: string) {
		this.tokens.summary = token;
		return this;
	}

	description(token: string) {
		this.tokens.description = token;
		return this;
	}

	removal(token: string) {
		this.tokens.removal = token;
		return this;
	}

	build(): TierPassiveTextTokens {
		return this.tokens;
	}
}

export function tierPassiveText() {
	return new TierPassiveTextBuilder();
}

class TierPassiveBuilder {
	private config: TierPassivePayload;
	private idSet = false;

	constructor() {
		this.config = { id: '' } as TierPassivePayload;
	}

	id(id: string) {
		if (this.idSet)
			throw new Error(
				'Happiness tier passive already has an id(). Remove the extra id() call.',
			);
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	effect(effect: EffectConfig | EffectBuilder) {
		this.config.effects = this.config.effects || [];
		this.config.effects.push(resolveEffectConfig(effect));
		return this;
	}

	onGrowthPhase(...effects: Array<EffectConfig | EffectBuilder>) {
		this.config.onGrowthPhase = this.config.onGrowthPhase || [];
		this.config.onGrowthPhase.push(...effects.map(resolveEffectConfig));
		return this;
	}

	onUpkeepPhase(...effects: Array<EffectConfig | EffectBuilder>) {
		this.config.onUpkeepPhase = this.config.onUpkeepPhase || [];
		this.config.onUpkeepPhase.push(...effects.map(resolveEffectConfig));
		return this;
	}

	onBeforeAttacked(...effects: Array<EffectConfig | EffectBuilder>) {
		this.config.onBeforeAttacked = this.config.onBeforeAttacked || [];
		this.config.onBeforeAttacked.push(...effects.map(resolveEffectConfig));
		return this;
	}

	onAttackResolved(...effects: Array<EffectConfig | EffectBuilder>) {
		this.config.onAttackResolved = this.config.onAttackResolved || [];
		this.config.onAttackResolved.push(...effects.map(resolveEffectConfig));
		return this;
	}

	onPayUpkeepStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.config.onPayUpkeepStep = this.config.onPayUpkeepStep || [];
		this.config.onPayUpkeepStep.push(...effects.map(resolveEffectConfig));
		return this;
	}

	onGainIncomeStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.config.onGainIncomeStep = this.config.onGainIncomeStep || [];
		this.config.onGainIncomeStep.push(...effects.map(resolveEffectConfig));
		return this;
	}

	onGainAPStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.config.onGainAPStep = this.config.onGainAPStep || [];
		this.config.onGainAPStep.push(...effects.map(resolveEffectConfig));
		return this;
	}

	skipPhase(phaseId: string) {
		this.config.skip = this.config.skip || ({} as TierPassiveSkipConfig);
		this.config.skip.phases = this.config.skip.phases || [];
		this.config.skip.phases.push(phaseId);
		return this;
	}

	skipPhases(...phaseIds: string[]) {
		phaseIds.forEach((id) => this.skipPhase(id));
		return this;
	}

	skipStep(phaseId: string, stepId: string) {
		if (!phaseId || !stepId)
			throw new Error(
				'Happiness tier passive skipStep(...) requires both phaseId and stepId. Provide both values when calling skipStep().',
			);
		this.config.skip = this.config.skip || ({} as TierPassiveSkipConfig);
		this.config.skip.steps = this.config.skip.steps || [];
		this.config.skip.steps.push({ phaseId, stepId });
		return this;
	}

	text(
		value:
			| TierPassiveTextTokens
			| TierPassiveTextBuilder
			| ((builder: TierPassiveTextBuilder) => TierPassiveTextBuilder),
	) {
		let tokens: TierPassiveTextTokens;
		if (typeof value === 'function') tokens = value(tierPassiveText()).build();
		else if (value instanceof TierPassiveTextBuilder) tokens = value.build();
		else tokens = value;
		this.config.text = { ...this.config.text, ...tokens };
		return this;
	}

	build(): TierPassivePayload {
		if (!this.idSet)
			throw new Error(
				'Happiness tier passive is missing id(). Call id("your-passive-id") before build().',
			);
		return this.config;
	}
}

export function tierPassive(id?: string) {
	const builder = new TierPassiveBuilder();
	if (id) builder.id(id);
	return builder;
}

class TierDisplayBuilder {
	private config: TierDisplayMetadata = {};

	removalCondition(token: string) {
		this.config.removalCondition = token;
		return this;
	}

	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}

	summaryToken(token: string) {
		this.config.summaryToken = token;
		return this;
	}

	build(): TierDisplayMetadata {
		return this.config;
	}
}

export function tierDisplay() {
	return new TierDisplayBuilder();
}

class HappinessTierBuilder {
	private config: Partial<HappinessTierDefinition> & {
		effect: TierEffect;
	};
	private idSet = false;
	private rangeSet = false;
	private passiveSet = false;

	constructor() {
		this.config = {
			effect: { incomeMultiplier: 1 },
		} as Partial<HappinessTierDefinition> & { effect: TierEffect };
	}

	id(id: string) {
		if (this.idSet)
			throw new Error(
				'Happiness tier already has an id(). Remove the extra id() call.',
			);
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	range(min: number, max?: number) {
		if (this.rangeSet)
			throw new Error(
				'Happiness tier already has range(). Remove the extra range() call.',
			);
		if (max !== undefined && max < min)
			throw new Error(
				'Happiness tier range(min, max?) requires max to be greater than or equal to min.',
			);
		this.config.range =
			max === undefined ? ({ min } as TierRange) : ({ min, max } as TierRange);
		this.rangeSet = true;
		return this;
	}

	effect(effect: TierEffect) {
		this.config.effect = { ...effect };
		return this;
	}

	incomeMultiplier(value: number) {
		this.config.effect.incomeMultiplier = value;
		return this;
	}

	buildingDiscountPct(value: number) {
		this.config.effect.buildingDiscountPct = value;
		return this;
	}

	growthBonusPct(value: number) {
		this.config.effect.growthBonusPct = value;
		return this;
	}

	upkeepCouncilReduction(value: number) {
		this.config.effect.upkeepCouncilReduction = value;
		return this;
	}

	halveCouncilAPInUpkeep(flag = true) {
		this.config.effect.halveCouncilAPInUpkeep = flag;
		return this;
	}

	disableGrowth(flag = true) {
		this.config.effect.disableGrowth = flag;
		return this;
	}

	passive(
		value:
			| TierPassivePayload
			| TierPassiveBuilder
			| ((builder: TierPassiveBuilder) => TierPassiveBuilder),
	) {
		if (this.passiveSet)
			throw new Error(
				'Happiness tier already has passive(). Remove the extra passive() call.',
			);
		let passive: TierPassivePayload;
		if (typeof value === 'function') passive = value(tierPassive()).build();
		else if (value instanceof TierPassiveBuilder) passive = value.build();
		else passive = value;
		this.config.passive = passive;
		this.passiveSet = true;
		return this;
	}

	display(
		value:
			| TierDisplayMetadata
			| TierDisplayBuilder
			| ((builder: TierDisplayBuilder) => TierDisplayBuilder),
	) {
		let display: TierDisplayMetadata;
		if (typeof value === 'function') display = value(tierDisplay()).build();
		else if (value instanceof TierDisplayBuilder) display = value.build();
		else display = value;
		this.config.display = display;
		return this;
	}

	build(): HappinessTierDefinition {
		if (!this.idSet)
			throw new Error(
				"Happiness tier is missing id(). Call id('your-tier-id') before build().",
			);
		if (!this.rangeSet)
			throw new Error(
				'Happiness tier is missing range(). Call range(min, max?) before build().',
			);
		if (!this.passiveSet)
			throw new Error(
				'Happiness tier is missing passive(). Call passive(...) with tierPassive(...) before build().',
			);
		return {
			id: this.config.id!,
			range: this.config.range!,
			effect: this.config.effect,
			passive: this.config.passive!,
			...(this.config.display ? { display: this.config.display } : {}),
		};
	}
}

export function happinessTier(id?: string) {
	const builder = new HappinessTierBuilder();
	if (id) builder.id(id);
	return builder;
}

class CostModParamsBuilder extends ParamsBuilder<{
	id?: string;
	actionId?: string;
	key?: ResourceKey;
	amount?: number;
	percent?: number;
}> {
	id(id: string) {
		return this.set('id', id);
	}
	actionId(actionId: string) {
		return this.set('actionId', actionId);
	}
	key(key: ResourceKey) {
		return this.set('key', key);
	}
	amount(amount: number) {
		return this.set('amount', amount);
	}
	percent(percent: number) {
		return this.set('percent', percent);
	}
}

export function costModParams() {
	return new CostModParamsBuilder();
}

class EvaluationTargetBuilder extends ParamsBuilder<{
	type: string;
	id?: string;
}> {
	constructor(type: string) {
		super();
		this.set('type', type);
	}
	id(id: string) {
		return this.set('id', id);
	}
}

export function evaluationTarget(type: string) {
	return new EvaluationTargetBuilder(type);
}

class ResultModParamsBuilder extends ParamsBuilder<{
	id?: string;
	actionId?: string;
	evaluation?: { type: string; id?: string };
	amount?: number;
	adjust?: number;
	percent?: number;
}> {
	id(id: string) {
		return this.set('id', id);
	}
	actionId(actionId: string) {
		return this.set('actionId', actionId);
	}
	evaluation(target: EvaluationTargetBuilder | { type: string; id?: string }) {
		return this.set(
			'evaluation',
			target instanceof EvaluationTargetBuilder ? target.build() : target,
		);
	}
	amount(amount: number) {
		return this.set('amount', amount);
	}
	adjust(amount: number) {
		return this.set('adjust', amount);
	}
	percent(percent: number) {
		return this.set('percent', percent);
	}
}

export function resultModParams() {
	return new ResultModParamsBuilder();
}

class PopulationEffectParamsBuilder extends ParamsBuilder<{
	role?: PopulationRoleId;
}> {
	role(role: PopulationRoleId) {
		return this.set(
			'role',
			role,
			'You already chose a role() for this population effect. Remove the duplicate call.',
		);
	}

	override build() {
		if (!this.wasSet('role'))
			throw new Error(
				'Population effect is missing role(). Call role(PopulationRole.yourChoice) to choose who is affected.',
			);
		return super.build();
	}
}

export function populationParams() {
	return new PopulationEffectParamsBuilder();
}

class AttackParamsBuilder extends ParamsBuilder<{
	target?: AttackTarget;
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
	onDamage?: {
		attacker?: EffectDef[];
		defender?: EffectDef[];
	};
}> {
	private ensureOnDamage() {
		if (!this.params.onDamage) this.params.onDamage = {};
		return this.params.onDamage;
	}
	targetResource(key: ResourceKey) {
		return this.set('target', { type: 'resource', key });
	}
	targetStat(key: StatKey) {
		return this.set('target', { type: 'stat', key });
	}
	targetBuilding(id: string) {
		return this.set('target', { type: 'building', id });
	}
	ignoreAbsorption(flag = true) {
		return this.set('ignoreAbsorption', flag);
	}
	ignoreFortification(flag = true) {
		return this.set('ignoreFortification', flag);
	}
	onDamageAttacker(...effects: Array<EffectConfig | EffectBuilder>) {
		const onDamage = this.ensureOnDamage();
		onDamage.attacker = onDamage.attacker || [];
		onDamage.attacker.push(...effects.map((item) => resolveEffectConfig(item)));
		return this;
	}
	onDamageDefender(...effects: Array<EffectConfig | EffectBuilder>) {
		const onDamage = this.ensureOnDamage();
		onDamage.defender = onDamage.defender || [];
		onDamage.defender.push(...effects.map((item) => resolveEffectConfig(item)));
		return this;
	}

	override build() {
		if (!this.wasSet('target'))
			throw new Error(
				'Attack effect is missing a target. Call targetResource(...), targetStat(...), or targetBuilding(...) once.',
			);
		return super.build();
	}
}

export function attackParams() {
	return new AttackParamsBuilder();
}

class TransferParamsBuilder extends ParamsBuilder<{
	key?: ResourceKey;
	percent?: number;
}> {
	key(key: ResourceKey) {
		return this.set(
			'key',
			key,
			'You already chose a resource with key(). Remove the extra key() call.',
		);
	}
	percent(percent: number) {
		return this.set(
			'percent',
			percent,
			'You already set percent() for this transfer. Remove the duplicate percent() call.',
		);
	}

	override build() {
		if (!this.wasSet('key'))
			throw new Error(
				'Resource transfer is missing key(). Call key(Resource.yourChoice) to pick the resource to move.',
			);
		if (!this.wasSet('percent'))
			throw new Error(
				'Resource transfer is missing percent(). Call percent(amount) to choose how much to move.',
			);
		return super.build();
	}
}

export function transferParams() {
	return new TransferParamsBuilder();
}

export class EvaluatorBuilder<P extends Params = Params> {
	protected config: EvaluatorDef = { type: '' };
	private paramsSet = false;
	private readonly paramKeys = new Set<string>();

	constructor(type?: string) {
		if (type) this.config.type = type;
	}

	type(type: string) {
		if (this.config.type && this.config.type.length)
			throw new Error(
				'Evaluator already has a type(). Remove the extra type() call.',
			);
		this.config.type = type;
		return this;
	}

	param(key: string, value: unknown) {
		if (this.paramsSet)
			throw new Error(
				'You already supplied params(...) for this evaluator. Remove params(...) before calling param().',
			);
		if (this.paramKeys.has(key))
			throw new Error(
				`Evaluator already has a value for "${key}". Remove the duplicate param('${key}', ...) call.`,
			);
		this.config.params = this.config.params || ({} as Params);
		(this.config.params as Params)[key] = value;
		this.paramKeys.add(key);
		return this;
	}

	params(params: P | ParamsBuilder<P>) {
		if (this.paramsSet)
			throw new Error(
				'Evaluator params(...) was already provided. Remove the duplicate params() call.',
			);
		if (this.paramKeys.size)
			throw new Error(
				'Evaluator already has individual param() values. Remove them before calling params(...).',
			);
		this.config.params =
			params instanceof ParamsBuilder ? params.build() : params;
		this.paramsSet = true;
		return this;
	}

	build(): EvaluatorDef {
		if (!this.config.type)
			throw new Error(
				'Evaluator is missing type(). Call type("your-evaluator") to describe what should be evaluated.',
			);
		return this.config;
	}
}

class PopulationEvaluatorBuilder extends EvaluatorBuilder<{
	role?: PopulationRoleId;
}> {
	constructor() {
		super('population');
	}
	role(role: PopulationRoleId) {
		return this.param('role', role);
	}
}

export function populationEvaluator() {
	return new PopulationEvaluatorBuilder();
}

class StatEvaluatorBuilder extends EvaluatorBuilder<{ key?: StatKey }> {
	constructor() {
		super('stat');
	}
	key(key: StatKey) {
		return this.param('key', key);
	}
}

export function statEvaluator() {
	return new StatEvaluatorBuilder();
}

class DevelopmentEvaluatorBuilder extends EvaluatorBuilder<{ id?: string }> {
	constructor() {
		super('development');
	}
	id(id: string) {
		return this.param('id', id);
	}
}

export function developmentEvaluator() {
	return new DevelopmentEvaluatorBuilder();
}

type CompareValue = number | EvaluatorDef | EvaluatorBuilder;

class CompareEvaluatorBuilder extends EvaluatorBuilder<{
	left?: CompareValue;
	right?: CompareValue;
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
}> {
	constructor() {
		super('compare');
	}

	private normalize(value: CompareValue) {
		if (value instanceof EvaluatorBuilder) return value.build();
		return value;
	}

	left(value: CompareValue) {
		return this.param('left', this.normalize(value));
	}

	right(value: CompareValue) {
		return this.param('right', this.normalize(value));
	}

	operator(op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne') {
		return this.param('operator', op);
	}
}

export function compareEvaluator() {
	return new CompareEvaluatorBuilder();
}

export class EffectBuilder<P extends Params = Params> {
	private config: EffectConfig = {};
	private paramsSet = false;
	private readonly paramKeys = new Set<string>();
	private evaluatorSet = false;
	private roundSet = false;
	private typeSet = false;
	private methodSet = false;
	type(type: string) {
		if (this.typeSet)
			throw new Error(
				'Effect already has type(). Remove the extra type() call.',
			);
		this.config.type = type;
		this.typeSet = true;
		return this;
	}
	method(method: string) {
		if (this.methodSet)
			throw new Error(
				'Effect already has method(). Remove the extra method() call.',
			);
		this.config.method = method;
		this.methodSet = true;
		return this;
	}
	param(key: string, value: unknown) {
		if (this.paramsSet)
			throw new Error(
				'Effect params(...) was already provided. Remove params(...) before calling param().',
			);
		if (this.paramKeys.has(key))
			throw new Error(
				`Effect already has a value for "${key}". Remove the duplicate param('${key}', ...) call.`,
			);
		this.config.params = this.config.params || {};
		(this.config.params as Params)[key] = value;
		this.paramKeys.add(key);
		return this;
	}
	params(params: P | ParamsBuilder<P>) {
		if (this.paramsSet)
			throw new Error(
				'Effect params(...) was already provided. Remove the duplicate params() call.',
			);
		if (this.paramKeys.size)
			throw new Error(
				'Effect already has individual param() values. Remove them before calling params(...).',
			);
		this.config.params =
			params instanceof ParamsBuilder ? params.build() : params;
		this.paramsSet = true;
		return this;
	}
	effect(effect: EffectConfig) {
		this.config.effects = this.config.effects || [];
		this.config.effects.push(effect);
		return this;
	}
	evaluator(type: string, params?: Params | ParamsBuilder): this;
	evaluator(builder: EvaluatorBuilder): this;
	evaluator(
		typeOrBuilder: string | EvaluatorBuilder,
		params?: Params | ParamsBuilder,
	) {
		if (this.evaluatorSet)
			throw new Error(
				'Effect already has an evaluator(). Remove the duplicate evaluator() call.',
			);
		if (typeOrBuilder instanceof EvaluatorBuilder)
			this.config.evaluator = typeOrBuilder.build();
		else
			this.config.evaluator = {
				type: typeOrBuilder,
				params:
					params instanceof ParamsBuilder ? params.build() : (params as Params),
			} as EvaluatorDef;
		this.evaluatorSet = true;
		return this;
	}
	round(mode: 'up' | 'down') {
		if (this.roundSet)
			throw new Error('Effect already has round(). Remove the duplicate call.');
		this.config.round = mode;
		this.roundSet = true;
		return this;
	}
	build(): EffectConfig {
		if (!this.typeSet && !this.methodSet) {
			const hasNestedEffects = Array.isArray(this.config.effects)
				? this.config.effects.length > 0
				: false;
			if (!hasNestedEffects)
				throw new Error(
					'Effect is missing type() and method(). Call effect(Types.X, Methods.Y) or add nested effect(...) calls before build().',
				);
		}
		return this.config;
	}
}

export function effect(type?: string, method?: string) {
	const builder = new EffectBuilder();
	if (type) builder.type(type);
	if (method) builder.method(method);
	return builder;
}

export class RequirementBuilder<P extends Params = Params> {
	private config: RequirementConfig = {} as RequirementConfig;
	private paramsSet = false;
	private readonly paramKeys = new Set<string>();
	private typeSet = false;
	private methodSet = false;
	type(type: string) {
		if (this.typeSet)
			throw new Error(
				'Requirement already has type(). Remove the extra type() call.',
			);
		this.config.type = type;
		this.typeSet = true;
		return this;
	}
	method(method: string) {
		if (this.methodSet)
			throw new Error(
				'Requirement already has method(). Remove the extra method() call.',
			);
		this.config.method = method;
		this.methodSet = true;
		return this;
	}
	param(key: string, value: unknown) {
		if (this.paramsSet)
			throw new Error(
				'Requirement params(...) was already provided. Remove params(...) before calling param().',
			);
		if (this.paramKeys.has(key))
			throw new Error(
				`Requirement already has a value for "${key}". Remove the duplicate param('${key}', ...) call.`,
			);
		this.config.params = this.config.params || {};
		(this.config.params as Params)[key] = value;
		this.paramKeys.add(key);
		return this;
	}
	params(params: P) {
		if (this.paramsSet)
			throw new Error(
				'Requirement params(...) was already provided. Remove the duplicate params() call.',
			);
		if (this.paramKeys.size)
			throw new Error(
				'Requirement already has individual param() values. Remove them before calling params(...).',
			);
		this.config.params = params;
		this.paramsSet = true;
		return this;
	}
	message(message: string) {
		this.config.message = message;
		return this;
	}
	build(): RequirementConfig {
		if (!this.typeSet)
			throw new Error(
				'Requirement is missing type(). Call type("your-requirement") before build().',
			);
		if (!this.methodSet)
			throw new Error(
				'Requirement is missing method(). Call method("your-method") before build().',
			);
		return this.config;
	}
}

export function requirement(type?: string, method?: string) {
	const builder = new RequirementBuilder();
	if (type) builder.type(type);
	if (method) builder.method(method);
	return builder;
}

class BaseBuilder<T extends { id: string; name: string }> {
	protected config: Omit<T, 'id' | 'name'> &
		Partial<Pick<T, 'id' | 'name'>> & { icon?: string };
	private readonly kind: string;
	private idSet = false;
	private nameSet = false;
	private iconSet = false;
	constructor(base: Omit<T, 'id' | 'name'>, kind: string) {
		this.kind = kind;
		this.config = {
			...base,
		} as Omit<T, 'id' | 'name'> &
			Partial<Pick<T, 'id' | 'name'>> & {
				icon?: string;
			};
	}
	id(id: string) {
		if (this.idSet)
			throw new Error(
				`${this.kind} already has an id(). Remove the extra id() call.`,
			);
		this.config.id = id;
		this.idSet = true;
		return this;
	}
	name(name: string) {
		if (this.nameSet)
			throw new Error(
				`${this.kind} already has a name(). Remove the extra name() call.`,
			);
		this.config.name = name;
		this.nameSet = true;
		return this;
	}
	icon(icon: string) {
		if (this.iconSet)
			throw new Error(
				`${this.kind} already has an icon(). Remove the extra icon() call.`,
			);
		this.config.icon = icon;
		this.iconSet = true;
		return this;
	}
	build(): T {
		if (!this.idSet)
			throw new Error(
				`${this.kind} is missing id(). Call id('unique-id') before build().`,
			);
		if (!this.nameSet)
			throw new Error(
				`${this.kind} is missing name(). Call name('Readable name') before build().`,
			);
		return this.config as T;
	}
}

export class ActionBuilder extends BaseBuilder<ActionConfig> {
	constructor() {
		super({ effects: [], effectGroups: [] }, 'Action');
	}
	cost(key: ResourceKey, amount: number) {
		this.config.baseCosts = this.config.baseCosts || {};
		this.config.baseCosts[key] = amount;
		return this;
	}
	requirement(req: RequirementConfig | RequirementBuilder) {
		const built = req instanceof RequirementBuilder ? req.build() : req;
		this.config.requirements = this.config.requirements || [];
		this.config.requirements.push(built);
		return this;
	}
	effect(effect: EffectConfig) {
		this.config.effects.push(effect);
		return this;
	}
	effectGroup(
		first: string | EffectConfig | EffectBuilder,
		...rest: (EffectConfig | EffectBuilder)[]
	) {
		let label: string | undefined;
		let options: (EffectConfig | EffectBuilder)[];
		if (typeof first === 'string') {
			label = first;
			options = rest;
		} else {
			options = [first, ...rest];
		}
		if (options.length < 2)
			throw new Error(
				'Action effectGroup() requires at least two effect options to choose from.',
			);
		const effects = options.map((option) => resolveEffectConfig(option));
		const group = {
			...(label ? { title: label } : {}),
			effects,
		};
		this.config.effectGroups = this.config.effectGroups || [];
		this.config.effectGroups.push(group);
		return this;
	}
	system(flag = true) {
		this.config.system = flag;
		return this;
	}
}

export class BuildingBuilder extends BaseBuilder<BuildingConfig> {
	constructor() {
		super(
			{ costs: {} as Record<ResourceKey, number>, onBuild: [] },
			'Building',
		);
		(this.config.costs as Record<ResourceKey, number>)['ap' as ResourceKey] = 1;
	}
	cost(key: ResourceKey, amount: number) {
		this.config.costs[key] = amount;
		return this;
	}
	upkeep(key: ResourceKey, amount: number) {
		this.config.upkeep = this.config.upkeep || {};
		(this.config.upkeep as Record<ResourceKey, number>)[key] = amount;
		return this;
	}
	onBuild(effect: EffectConfig) {
		this.config.onBuild = this.config.onBuild || [];
		this.config.onBuild.push(effect);
		return this;
	}
	onGrowthPhase(effect: EffectConfig) {
		this.config.onGrowthPhase = this.config.onGrowthPhase || [];
		this.config.onGrowthPhase.push(effect);
		return this;
	}
	onUpkeepPhase(effect: EffectConfig) {
		this.config.onUpkeepPhase = this.config.onUpkeepPhase || [];
		this.config.onUpkeepPhase.push(effect);
		return this;
	}
	onPayUpkeepStep(effect: EffectConfig) {
		this.config.onPayUpkeepStep = this.config.onPayUpkeepStep || [];
		this.config.onPayUpkeepStep.push(effect);
		return this;
	}
	onGainIncomeStep(effect: EffectConfig) {
		this.config.onGainIncomeStep = this.config.onGainIncomeStep || [];
		this.config.onGainIncomeStep.push(effect);
		return this;
	}
	onGainAPStep(effect: EffectConfig) {
		this.config.onGainAPStep = this.config.onGainAPStep || [];
		this.config.onGainAPStep.push(effect);
		return this;
	}
	onBeforeAttacked(effect: EffectConfig) {
		this.config.onBeforeAttacked = this.config.onBeforeAttacked || [];
		this.config.onBeforeAttacked.push(effect);
		return this;
	}
	onAttackResolved(effect: EffectConfig) {
		this.config.onAttackResolved = this.config.onAttackResolved || [];
		this.config.onAttackResolved.push(effect);
		return this;
	}
}

export class DevelopmentBuilder extends BaseBuilder<DevelopmentConfig> {
	constructor() {
		super({}, 'Development');
	}
	upkeep(key: ResourceKey, amount: number) {
		this.config.upkeep = this.config.upkeep || {};
		(this.config.upkeep as Record<ResourceKey, number>)[key] = amount;
		return this;
	}
	populationCap(amount: number) {
		this.config.populationCap = amount;
		return this;
	}
	onBuild(effect: EffectConfig) {
		this.config.onBuild = this.config.onBuild || [];
		this.config.onBuild.push(effect);
		return this;
	}
	onGrowthPhase(effect: EffectConfig) {
		this.config.onGrowthPhase = this.config.onGrowthPhase || [];
		this.config.onGrowthPhase.push(effect);
		return this;
	}
	onPayUpkeepStep(effect: EffectConfig) {
		this.config.onPayUpkeepStep = this.config.onPayUpkeepStep || [];
		this.config.onPayUpkeepStep.push(effect);
		return this;
	}
	onGainIncomeStep(effect: EffectConfig) {
		this.config.onGainIncomeStep = this.config.onGainIncomeStep || [];
		this.config.onGainIncomeStep.push(effect);
		return this;
	}
	onGainAPStep(effect: EffectConfig) {
		this.config.onGainAPStep = this.config.onGainAPStep || [];
		this.config.onGainAPStep.push(effect);
		return this;
	}
	onBeforeAttacked(effect: EffectConfig) {
		this.config.onBeforeAttacked = this.config.onBeforeAttacked || [];
		this.config.onBeforeAttacked.push(effect);
		return this;
	}
	onAttackResolved(effect: EffectConfig) {
		this.config.onAttackResolved = this.config.onAttackResolved || [];
		this.config.onAttackResolved.push(effect);
		return this;
	}
	system(flag = true) {
		this.config.system = flag;
		return this;
	}
}

export class PopulationBuilder extends BaseBuilder<PopulationConfig> {
	constructor() {
		super({}, 'Population');
	}
	upkeep(key: ResourceKey, amount: number) {
		this.config.upkeep = this.config.upkeep || {};
		(this.config.upkeep as Record<ResourceKey, number>)[key] = amount;
		return this;
	}
	onAssigned(effect: EffectConfig) {
		this.config.onAssigned = this.config.onAssigned || [];
		this.config.onAssigned.push(effect);
		return this;
	}
	onUnassigned(effect: EffectConfig) {
		this.config.onUnassigned = this.config.onUnassigned || [];
		this.config.onUnassigned.push(effect);
		return this;
	}
	onGrowthPhase(effect: EffectConfig) {
		this.config.onGrowthPhase = this.config.onGrowthPhase || [];
		this.config.onGrowthPhase.push(effect);
		return this;
	}
	onUpkeepPhase(effect: EffectConfig) {
		this.config.onUpkeepPhase = this.config.onUpkeepPhase || [];
		this.config.onUpkeepPhase.push(effect);
		return this;
	}
	onPayUpkeepStep(effect: EffectConfig) {
		this.config.onPayUpkeepStep = this.config.onPayUpkeepStep || [];
		this.config.onPayUpkeepStep.push(effect);
		return this;
	}
	onGainIncomeStep(effect: EffectConfig) {
		this.config.onGainIncomeStep = this.config.onGainIncomeStep || [];
		this.config.onGainIncomeStep.push(effect);
		return this;
	}
	onGainAPStep(effect: EffectConfig) {
		this.config.onGainAPStep = this.config.onGainAPStep || [];
		this.config.onGainAPStep.push(effect);
		return this;
	}
}

export interface InfoDef {
	key: string;
	icon: string;
	label: string;
	description: string;
}

class InfoBuilder<T extends InfoDef> {
	protected config: T;
	constructor(key: string) {
		this.config = { key, icon: '', label: '', description: '' } as T;
	}
	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}
	label(label: string) {
		this.config.label = label;
		return this;
	}
	description(description: string) {
		this.config.description = description;
		return this;
	}
	build(): T {
		return this.config;
	}
}

export interface ResourceInfo extends InfoDef {
	/**
	 * Arbitrary tags to mark special behaviours or rules for the resource.
	 * These tags are interpreted by the engine or other systems at runtime.
	 */
	tags?: string[];
}

class ResourceBuilder extends InfoBuilder<ResourceInfo> {
	constructor(key: ResourceKey) {
		super(key);
	}
	tag(tag: string) {
		this.config.tags = [...(this.config.tags || []), tag];
		return this;
	}
}

export interface PopulationRoleInfo extends InfoDef {}

class PopulationRoleBuilder extends InfoBuilder<PopulationRoleInfo> {
	constructor(key: PopulationRoleId) {
		super(key);
	}
}

export interface StatInfo extends InfoDef {
	displayAsPercent?: boolean;
	addFormat?: {
		prefix?: string;
		percent?: boolean;
	};
	capacity?: boolean;
}

class StatBuilder extends InfoBuilder<StatInfo> {
	constructor(key: StatKey) {
		super(key);
	}
	displayAsPercent(flag = true) {
		this.config.displayAsPercent = flag;
		return this;
	}
	addFormat(format: { prefix?: string; percent?: boolean }) {
		this.config.addFormat = { ...this.config.addFormat, ...format };
		return this;
	}
	capacity(flag = true) {
		this.config.capacity = flag;
		return this;
	}
}

export interface StepDef {
	id: string;
	title?: string;
	triggers?: TriggerKey[];
	effects?: EffectDef[];
	icon?: string;
}

class StepBuilder {
	private config: StepDef;
	constructor(id: string) {
		this.config = { id };
	}
	title(title: string) {
		this.config.title = title;
		return this;
	}
	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}
	trigger(trigger: TriggerKey) {
		this.config.triggers = this.config.triggers || [];
		this.config.triggers.push(trigger);
		return this;
	}
	triggers(...triggers: TriggerKey[]) {
		this.config.triggers = this.config.triggers || [];
		this.config.triggers.push(...triggers);
		return this;
	}
	effect(effect: EffectDef) {
		this.config.effects = this.config.effects || [];
		this.config.effects.push(effect);
		return this;
	}
	build(): StepDef {
		return this.config;
	}
}

export interface PhaseDef {
	id: string;
	steps: StepDef[];
	action?: boolean;
	label: string;
	icon?: string;
}

class PhaseBuilder {
	private config: PhaseDef;
	constructor(id: string) {
		this.config = { id, steps: [], label: '' };
	}
	label(label: string) {
		this.config.label = label;
		return this;
	}
	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}
	action(flag = true) {
		this.config.action = flag;
		return this;
	}
	step(step: StepDef | StepBuilder) {
		const built = step instanceof StepBuilder ? step.build() : step;
		this.config.steps.push(built);
		return this;
	}
	build(): PhaseDef {
		return this.config;
	}
}

export function toRecord<T extends { key: string }>(items: T[]) {
	return Object.fromEntries(items.map((i) => [i.key, i])) as Record<string, T>;
}

export function action() {
	return new ActionBuilder();
}
export function building() {
	return new BuildingBuilder();
}
export function development() {
	return new DevelopmentBuilder();
}
export function population() {
	return new PopulationBuilder();
}
export function resource(key: ResourceKey) {
	return new ResourceBuilder(key);
}
export function stat(key: StatKey) {
	return new StatBuilder(key);
}
export function populationRole(key: PopulationRoleId) {
	return new PopulationRoleBuilder(key);
}
export function phase(id: string) {
	return new PhaseBuilder(id);
}
export function step(id: string) {
	return new StepBuilder(id);
}
