import type {
	ActionEffect,
	ActionEffectGroup,
	ActionEffectGroupOption,
	AttackTarget,
	EffectConfig,
	EffectDef,
	EvaluatorDef,
	HappinessTierDefinition,
	PassiveMetadata,
	PhaseSkipConfig,
	PopulationConfig,
	RequirementConfig,
	TierDisplayMetadata,
	TierEffect,
	TierPassivePreview,
	TierPassiveTextTokens,
	TierRange,
	PlayerStartConfig,
	StartConfig,
} from '@kingdom-builder/protocol';
import type { ResourceKey } from '../resources';
import type { StatKey } from '../stats';
import type { PopulationRoleId } from '../populationRoles';
import type { DevelopmentId } from '../developments';
import type { BuildingDef, DevelopmentDef, Focus, TriggerKey } from '../defs';
import type { ActionCategory, ActionDef, ActionId } from '../actions';
import type {
	PhaseId as PhaseIdentifier,
	PhaseStepId as PhaseStepIdentifier,
} from '../phases';
import {
	Types,
	PassiveMethods,
	RequirementTypes,
	ParamsBuilder,
} from './builderShared';
import type { Params } from './builderShared';

type DevelopmentIdParam =
	| DevelopmentId
	| (string & { __developmentIdParam?: never });

export function populationAssignmentPassiveId(role: PopulationRoleId) {
	return `${role}_$player_$index`;
}

function resolveEffectConfig(effect: EffectConfig | EffectBuilder) {
	return effect instanceof EffectBuilder ? effect.build() : effect;
}

export type ActionEffectGroupOptionDef = ActionEffectGroupOption;

class ActionEffectGroupOptionBuilder {
	private readonly config: Partial<ActionEffectGroupOptionDef> = {};
	private readonly assigned = new Set<keyof ActionEffectGroupOptionDef>();
	private paramsConfig: Params | undefined;
	private paramsSet = false;
	private readonly paramKeys = new Set<string>();

	constructor(id?: string) {
		if (id) {
			this.id(id);
		}
	}

	private set<K extends keyof ActionEffectGroupOptionDef>(
		key: K,
		value: ActionEffectGroupOptionDef[K],
		message: string,
	) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	private wasSet(key: keyof ActionEffectGroupOptionDef) {
		return this.assigned.has(key);
	}

	id(id: string) {
		return this.set(
			'id',
			id,
			'Action effect group option already has an id(). Remove the extra id() call.',
		);
	}

	label(label: string) {
		return this.set(
			'label',
			label,
			'Action effect group option already set label(). Remove the duplicate label() call.',
		);
	}

	icon(icon: string) {
		return this.set(
			'icon',
			icon,
			'Action effect group option already set icon(). Remove the duplicate icon() call.',
		);
	}

	summary(summary: string) {
		return this.set(
			'summary',
			summary,
			'Action effect group option already set summary(). Remove the duplicate summary() call.',
		);
	}

	description(description: string) {
		return this.set(
			'description',
			description,
			'Action effect group option already set description(). Remove the duplicate description() call.',
		);
	}

	action(actionId: ActionId) {
		return this.set(
			'actionId',
			actionId,
			'Action effect group option already set action(). Remove the duplicate action() call.',
		);
	}

	param(key: string, value: unknown) {
		if (this.paramsSet) {
			throw new Error(
				'Action effect group option already set params(...). Remove params(...) before calling param().',
			);
		}
		if (this.paramKeys.has(key)) {
			throw new Error(
				`Action effect group option already set param "${key}". Remove the duplicate param() call.`,
			);
		}
		this.paramsConfig = this.paramsConfig || {};
		this.paramsConfig[key] = value;
		this.paramKeys.add(key);
		return this;
	}

	paramActionId(actionId: ActionId): this;
	paramActionId(actionId: string): this;
	paramActionId(actionId: string) {
		return this.param('actionId', actionId);
	}

	paramDevelopmentId(developmentId: DevelopmentIdParam) {
		return this.param('developmentId', developmentId);
	}

	paramLandId(landId: string) {
		return this.param('landId', landId);
	}

	params(params: Params | ParamsBuilder) {
		if (this.paramsSet) {
			throw new Error(
				'Action effect group option already set params(...). Remove the duplicate params() call.',
			);
		}
		if (this.paramKeys.size) {
			throw new Error(
				'Action effect group option already set individual param() values. Remove them before calling params(...).',
			);
		}
		this.paramsConfig =
			params instanceof ParamsBuilder ? params.build() : params;
		this.paramsSet = true;
		return this;
	}

	build(): ActionEffectGroupOptionDef {
		if (!this.wasSet('id')) {
			throw new Error(
				'Action effect group option is missing id(). Call id("your-option-id") before build().',
			);
		}
		if (!this.wasSet('actionId')) {
			throw new Error(
				'Action effect group option is missing action(). Call action("action-id") before build().',
			);
		}

		const built: ActionEffectGroupOptionDef = {
			id: this.config.id as string,
			actionId: this.config.actionId as string,
		};

		if (this.wasSet('label')) {
			built.label = this.config.label as string;
		}

		if (this.wasSet('icon')) {
			built.icon = this.config.icon;
		}
		if (this.wasSet('summary')) {
			built.summary = this.config.summary;
		}
		if (this.wasSet('description')) {
			built.description = this.config.description;
		}
		if (this.paramsConfig) {
			built.params = this.paramsConfig;
		}

		return built;
	}
}

export function actionEffectGroupOption(id?: string) {
	return new ActionEffectGroupOptionBuilder(id);
}

class ActionEffectGroupOptionParamsBuilder extends ParamsBuilder<{
	actionId?: string;
	developmentId?: DevelopmentIdParam;
	landId?: string;
}> {
	actionId(actionId: ActionId): this;
	actionId(actionId: string): this;
	actionId(actionId: string) {
		return this.set(
			'actionId',
			actionId,
			'Action effect group option params already set actionId(). Remove the extra actionId() call.',
		);
	}

	developmentId(developmentId: DevelopmentIdParam) {
		return this.set(
			'developmentId',
			developmentId,
			'Action effect group option params already set developmentId(). Remove the extra developmentId() call.',
		);
	}

	landId(landId: string) {
		return this.set(
			'landId',
			landId,
			'Action effect group option params already set landId(). Remove the extra landId() call.',
		);
	}
}

export function actionEffectGroupOptionParams() {
	return new ActionEffectGroupOptionParamsBuilder();
}

export type ActionEffectGroupDef = ActionEffectGroup;

class ActionEffectGroupBuilder {
	private config: Partial<ActionEffectGroupDef> & {
		options: ActionEffectGroupOptionDef[];
	};
	private readonly optionIds = new Set<string>();
	private idSet = false;
	private titleSet = false;

	constructor(id?: string) {
		this.config = { options: [], title: 'Choose one:' };
		if (id) {
			this.id(id);
		}
	}

	id(id: string) {
		if (this.idSet) {
			throw new Error(
				'Action effect group already has an id(). Remove the extra id() call.',
			);
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	title(title: string) {
		if (this.titleSet) {
			throw new Error(
				'Action effect group already has a title(). Remove the extra title() call.',
			);
		}
		this.config.title = title;
		this.titleSet = true;
		return this;
	}

	icon(icon: string) {
		this.config.icon = icon;
		return this;
	}

	summary(summary: string) {
		this.config.summary = summary;
		return this;
	}

	description(description: string) {
		this.config.description = description;
		return this;
	}

	layout(layout: 'default' | 'compact') {
		this.config.layout = layout;
		return this;
	}

	option(option: ActionEffectGroupOptionBuilder | ActionEffectGroupOptionDef) {
		const built =
			option instanceof ActionEffectGroupOptionBuilder
				? option.build()
				: option;
		if (this.optionIds.has(built.id)) {
			throw new Error(
				`Action effect group option id "${built.id}" already exists. Use unique option ids within a group.`,
			);
		}
		this.optionIds.add(built.id);
		this.config.options.push(built);
		return this;
	}

	build(): ActionEffectGroupDef {
		if (!this.idSet) {
			throw new Error(
				"Action effect group is missing id(). Call id('your-group-id') before build().",
			);
		}
		this.config.title = this.config.title || 'Choose one:';
		if (this.config.options.length === 0) {
			throw new Error(
				'Action effect group needs at least one option(). Add option(...) before build().',
			);
		}
		return this.config as ActionEffectGroupDef;
	}
}

export function actionEffectGroup(id?: string) {
	return new ActionEffectGroupBuilder(id);
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
		if (this.wasSet('percent')) {
			throw new Error(
				'Resource change cannot use both amount() and percent(). Choose one of them.',
			);
		}
		return this.set(
			'amount',
			amount,
			'You already set amount() for this resource change. Remove the duplicate amount() call.',
		);
	}
	percent(percent: number) {
		if (this.wasSet('amount')) {
			throw new Error(
				'Resource change cannot use both amount() and percent(). Choose one of them.',
			);
		}
		return this.set(
			'percent',
			percent,
			'You already set percent() for this resource change. Remove the duplicate percent() call.',
		);
	}

	override build() {
		if (!this.wasSet('key')) {
			throw new Error(
				'Resource change is missing key(). Call key(Resource.yourChoice) to choose what should change.',
			);
		}
		if (!this.wasSet('amount') && !this.wasSet('percent')) {
			throw new Error(
				'Resource change needs exactly one of amount() or percent(). Pick how much the resource should change.',
			);
		}
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
		if (this.wasSet('percent') || this.wasSet('percentStat')) {
			throw new Error(
				'Stat change cannot mix amount() with percent() or percentFromStat(). Pick one approach to describe the change.',
			);
		}
		return this.set(
			'amount',
			amount,
			'You already set amount() for this stat change. Remove the duplicate amount() call.',
		);
	}
	percent(percent: number) {
		if (this.wasSet('amount') || this.wasSet('percentStat')) {
			throw new Error(
				'Stat change cannot mix percent() with amount() or percentFromStat(). Pick one approach to describe the change.',
			);
		}
		return this.set(
			'percent',
			percent,
			'You already set percent() for this stat change. Remove the duplicate percent() call.',
		);
	}
	percentFromStat(stat: StatKey) {
		if (this.wasSet('amount') || this.wasSet('percent')) {
			throw new Error(
				'Stat change cannot mix percentFromStat() with amount() or percent(). Pick one approach to describe the change.',
			);
		}
		return this.set(
			'percentStat',
			stat,
			'You already chose a stat source with percentFromStat(). Remove the duplicate percentFromStat() call.',
		);
	}

	override build() {
		if (!this.wasSet('key')) {
			throw new Error(
				'Stat change is missing key(). Call key(Stat.yourChoice) to decide which stat should change.',
			);
		}
		if (
			!this.wasSet('amount') &&
			!this.wasSet('percent') &&
			!this.wasSet('percentStat')
		) {
			throw new Error(
				'Stat change needs amount(), percent(), or percentFromStat(). Choose one to describe how the stat should change.',
			);
		}
		return super.build();
	}
}

export function statParams() {
	return new StatEffectParamsBuilder();
}

class DevelopmentEffectParamsBuilder extends ParamsBuilder<{
	id?: DevelopmentIdParam;
	landId?: string;
}> {
	id(id: DevelopmentIdParam) {
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
		if (!this.wasSet('id')) {
			throw new Error(
				'Development effect is missing id(). Call id("your-development-id") so the engine knows which development to reference.',
			);
		}
		return super.build();
	}
}

export function developmentParams() {
	return new DevelopmentEffectParamsBuilder();
}

class BuildingEffectParamsBuilder extends ParamsBuilder<{
	id?: string;
	landId?: string;
}> {
	id(id: string) {
		return this.set(
			'id',
			id,
			'Building effect params already set id(). Remove the extra id() call.',
		);
	}

	landId(landId: string) {
		return this.set(
			'landId',
			landId,
			'Building effect params already set landId(). Remove the extra landId() call.',
		);
	}

	override build() {
		if (!this.wasSet('id')) {
			throw new Error(
				'Building effect params is missing id(). Call id("your-building-id") before build().',
			);
		}
		return super.build();
	}
}

export function buildingParams() {
	return new BuildingEffectParamsBuilder();
}

class ActionEffectParamsBuilder extends ParamsBuilder<{
	id?: string;
	landId?: string;
}> {
	id(id: ActionId): this;
	id(id: string): this;
	id(id: string) {
		return this.set(
			'id',
			id,
			'Action effect params already set id(). Remove the extra id() call.',
		);
	}

	landId(landId: string) {
		return this.set(
			'landId',
			landId,
			'Action effect params already set landId(). Remove the extra landId() call.',
		);
	}

	override build() {
		if (!this.wasSet('id')) {
			throw new Error(
				'Action effect params is missing id(). Call id("your-action-id") before build().',
			);
		}
		return super.build();
	}
}

export function actionParams() {
	return new ActionEffectParamsBuilder();
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
	detail?: string;
	meta?: PassiveMetadata;
	skip?: PhaseSkipConfig;
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
	detail(detail: string) {
		return this.set(
			'detail',
			detail,
			'You already set detail() for this passive. Remove the duplicate detail() call.',
		);
	}
	meta(meta: PassiveMetadata) {
		return this.set(
			'meta',
			meta,
			'You already set meta() for this passive. Remove the duplicate meta() call.',
		);
	}
	private ensureSkip() {
		this.params.skip = this.params.skip || ({} as PhaseSkipConfig);
		return this.params.skip;
	}
	skipPhase(phaseId: PhaseIdentifier) {
		const skip = this.ensureSkip();
		skip.phases = skip.phases || [];
		skip.phases.push(phaseId);
		return this;
	}
	skipPhases(...phaseIds: PhaseIdentifier[]) {
		phaseIds.forEach((id) => this.skipPhase(id));
		return this;
	}
	skipStep(phaseId: PhaseIdentifier, stepId: PhaseStepIdentifier) {
		if (!phaseId || !stepId) {
			throw new Error(
				'Passive params skipStep(...) requires both phaseId and stepId. Provide both values when calling skipStep().',
			);
		}
		const skip = this.ensureSkip();
		skip.steps = skip.steps || [];
		skip.steps.push({ phaseId, stepId });
		return this;
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
		if (!this.wasSet('id')) {
			throw new Error(
				'Passive effect is missing id(). Call id("your-passive-id") so it can be referenced later.',
			);
		}
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

type TierDisplayBuilderConfig = TierDisplayMetadata & { title?: string };

class TierDisplayBuilder {
	private config: TierDisplayBuilderConfig = {};

	removalCondition(token: string) {
		this.config.removalCondition = token;
		return this;
	}

	title(value: string) {
		this.config.title = value;
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

type TierEffectInput =
	| EffectConfig
	| EffectBuilder
	| ((builder: EffectBuilder) => EffectBuilder);

function resolveTierEffectConfig(value: TierEffectInput) {
	if (typeof value === 'function') {
		return value(effect()).build();
	}
	return resolveEffectConfig(value);
}

class HappinessTierBuilder {
	private config: Partial<HappinessTierDefinition> & {
		effect: TierEffect;
		enterEffects?: EffectConfig[];
		exitEffects?: EffectConfig[];
		preview?: TierPassivePreview;
		text?: TierPassiveTextTokens;
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
		if (this.idSet) {
			throw new Error(
				'Happiness tier already has an id(). Remove the extra id() call.',
			);
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}

	range(min: number, max?: number) {
		if (this.rangeSet) {
			throw new Error(
				'Happiness tier already has range(). Remove the extra range() call.',
			);
		}
		if (max !== undefined && max < min) {
			throw new Error(
				'Happiness tier range(min, max?) requires max to be greater than or equal to min.',
			);
		}
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

	enterEffect(value: TierEffectInput) {
		const effectConfig = resolveTierEffectConfig(value);
		this.config.enterEffects = this.config.enterEffects || [];
		this.config.enterEffects.push(effectConfig);
		return this;
	}

	enterEffects(...values: TierEffectInput[]) {
		values.forEach((value) => this.enterEffect(value));
		return this;
	}

	exitEffect(value: TierEffectInput) {
		const effectConfig = resolveTierEffectConfig(value);
		this.config.exitEffects = this.config.exitEffects || [];
		this.config.exitEffects.push(effectConfig);
		return this;
	}

	exitEffects(...values: TierEffectInput[]) {
		values.forEach((value) => this.exitEffect(value));
		return this;
	}

	passive(value: TierEffectInput) {
		if (this.passiveSet) {
			throw new Error(
				'Happiness tier already has passive(). Remove the extra passive() call.',
			);
		}
		const effectConfig = resolveTierEffectConfig(value);
		if (
			effectConfig.type !== Types.Passive ||
			effectConfig.method !== PassiveMethods.ADD
		) {
			throw new Error(
				'Happiness tier passive(...) requires a passive:add effect. Configure it with effect().type(Types.Passive).method(PassiveMethods.ADD).',
			);
		}
		const params = effectConfig.params as { id?: string } | undefined;
		const passiveId = params?.id;
		if (!passiveId) {
			throw new Error(
				'Happiness tier passive(...) requires the passive:add effect to include params.id.',
			);
		}
		this.config.enterEffects = this.config.enterEffects || [];
		this.config.enterEffects.push(effectConfig);
		const removeEffect: EffectConfig = {
			type: Types.Passive,
			method: PassiveMethods.REMOVE,
			params: { id: passiveId },
		};
		this.config.exitEffects = this.config.exitEffects || [];
		this.config.exitEffects.push(removeEffect);
		const preview: TierPassivePreview = { id: passiveId };
		if (effectConfig.effects && effectConfig.effects.length > 0) {
			preview.effects = effectConfig.effects.map((item) =>
				structuredClone(item),
			);
		}
		this.config.preview = preview;
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
		if (typeof value === 'function') {
			display = value(tierDisplay()).build();
		} else if (value instanceof TierDisplayBuilder) {
			display = value.build();
		} else {
			display = value;
		}
		this.config.display = display;
		return this;
	}

	text(
		value:
			| TierPassiveTextTokens
			| TierPassiveTextBuilder
			| ((builder: TierPassiveTextBuilder) => TierPassiveTextBuilder),
	) {
		let tokens: TierPassiveTextTokens;
		if (typeof value === 'function') {
			tokens = value(tierPassiveText()).build();
		} else if (value instanceof TierPassiveTextBuilder) {
			tokens = value.build();
		} else {
			tokens = value;
		}
		this.config.text = { ...this.config.text, ...tokens };
		return this;
	}

	build(): HappinessTierDefinition {
		if (!this.idSet) {
			throw new Error(
				"Happiness tier is missing id(). Call id('your-tier-id') before build().",
			);
		}
		if (!this.rangeSet) {
			throw new Error(
				'Happiness tier is missing range(). Call range(min, max?) before build().',
			);
		}
		const definition: HappinessTierDefinition = {
			id: this.config.id!,
			range: this.config.range!,
			effect: this.config.effect,
		};
		if (this.config.enterEffects?.length) {
			definition.enterEffects = this.config.enterEffects;
		}
		if (this.config.exitEffects?.length) {
			definition.exitEffects = this.config.exitEffects;
		}
		if (this.config.preview) {
			definition.preview = this.config.preview;
		}
		if (this.config.text) {
			definition.text = this.config.text;
		}
		if (this.config.display) {
			definition.display = this.config.display;
		}
		return definition;
	}
}

export function happinessTier(id?: string) {
	const builder = new HappinessTierBuilder();
	if (id) {
		builder.id(id);
	}
	return builder;
}

class CostModParamsBuilder extends ParamsBuilder<{
	id?: string;
	actionId?: ActionId;
	key?: ResourceKey;
	amount?: number;
	percent?: number;
}> {
	id(id: string) {
		return this.set('id', id);
	}
	actionId(actionId: ActionId) {
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

export enum EvaluationTargetTypes {
	Development = 'development',
	Population = 'population',
}

type LooseEvaluationTargetType = string & {
	readonly __evaluationTargetBrand?: never;
};

type EvaluationTargetType = EvaluationTargetTypes | LooseEvaluationTargetType;

class EvaluationTargetBuilder extends ParamsBuilder<{
	type: EvaluationTargetType;
	id?: string;
}> {
	constructor(type: EvaluationTargetType) {
		super();
		this.set('type', type);
	}
	id(id: string) {
		return this.set('id', id);
	}
}

export function evaluationTarget(type: EvaluationTargetTypes | string) {
	return new EvaluationTargetBuilder(type);
}

export function developmentTarget() {
	return evaluationTarget(EvaluationTargetTypes.Development);
}

export function populationTarget() {
	return evaluationTarget(EvaluationTargetTypes.Population);
}

class ResultModParamsBuilder extends ParamsBuilder<{
	id?: string;
	actionId?: ActionId;
	evaluation?: { type: EvaluationTargetType; id?: string };
	amount?: number;
	adjust?: number;
	percent?: number;
}> {
	id(id: string) {
		return this.set('id', id);
	}
	actionId(actionId: ActionId) {
		return this.set('actionId', actionId);
	}
	evaluation(
		target:
			| EvaluationTargetBuilder
			| { type: EvaluationTargetType; id?: string },
	) {
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
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	role?: PopulationRoleId | string;
}> {
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	role(role: PopulationRoleId | string) {
		return this.set(
			'role',
			role,
			'You already chose a role() for this population effect. Remove the duplicate call.',
		);
	}

	override build() {
		if (!this.wasSet('role')) {
			throw new Error(
				'Population effect is missing role(). Call role(PopulationRole.yourChoice) to choose who is affected.',
			);
		}
		return super.build();
	}
}

export function populationParams() {
	return new PopulationEffectParamsBuilder();
}

type AttackStatRole = 'power' | 'absorption' | 'fortification';

type AttackStatAnnotation = {
	role: AttackStatRole;
	key: StatKey;
	label?: string;
	icon?: string;
};

class AttackParamsBuilder extends ParamsBuilder<{
	target?: AttackTarget;
	ignoreAbsorption?: boolean;
	ignoreFortification?: boolean;
	stats?: AttackStatAnnotation[];
	onDamage?: {
		attacker?: EffectDef[];
		defender?: EffectDef[];
	};
}> {
	private ensureOnDamage() {
		if (!this.params.onDamage) {
			this.params.onDamage = {};
		}
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
	stat(
		role: AttackStatRole,
		key: StatKey,
		overrides: { label?: string; icon?: string } = {},
	) {
		const stats = this.params.stats || (this.params.stats = []);
		const existingIndex = stats.findIndex((item) => item.role === role);
		const annotation: AttackStatAnnotation = {
			role,
			key,
			...overrides,
		};
		if (existingIndex >= 0) {
			stats.splice(existingIndex, 1, annotation);
		} else {
			stats.push(annotation);
		}
		return this;
	}
	powerStat(key: StatKey, overrides?: { label?: string; icon?: string }) {
		return this.stat('power', key, overrides);
	}
	absorptionStat(key: StatKey, overrides?: { label?: string; icon?: string }) {
		return this.stat('absorption', key, overrides);
	}
	fortificationStat(
		key: StatKey,
		overrides?: { label?: string; icon?: string },
	) {
		return this.stat('fortification', key, overrides);
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
		if (!this.wasSet('target')) {
			throw new Error(
				'Attack effect is missing a target. Call targetResource(...), targetStat(...), or targetBuilding(...) once.',
			);
		}
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
		if (!this.wasSet('key')) {
			throw new Error(
				'Resource transfer is missing key(). Call key(Resource.yourChoice) to pick the resource to move.',
			);
		}
		if (!this.wasSet('percent')) {
			throw new Error(
				'Resource transfer is missing percent(). Call percent(amount) to choose how much to move.',
			);
		}
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
		if (type) {
			this.config.type = type;
		}
	}

	type(type: string) {
		if (this.config.type && this.config.type.length) {
			throw new Error(
				'Evaluator already has a type(). Remove the extra type() call.',
			);
		}
		this.config.type = type;
		return this;
	}

	param(key: string, value: unknown) {
		if (this.paramsSet) {
			throw new Error(
				'You already supplied params(...) for this evaluator. Remove params(...) before calling param().',
			);
		}
		if (this.paramKeys.has(key)) {
			throw new Error(
				`Evaluator already has a value for "${key}". Remove the duplicate param('${key}', ...) call.`,
			);
		}
		this.config.params = this.config.params || ({} as Params);
		(this.config.params as Params)[key] = value;
		this.paramKeys.add(key);
		return this;
	}

	params(params: P | ParamsBuilder<P>) {
		if (this.paramsSet) {
			throw new Error(
				'Evaluator params(...) was already provided. Remove the duplicate params() call.',
			);
		}
		if (this.paramKeys.size) {
			throw new Error(
				'Evaluator already has individual param() values. Remove them before calling params(...).',
			);
		}
		this.config.params =
			params instanceof ParamsBuilder ? params.build() : params;
		this.paramsSet = true;
		return this;
	}

	build(): EvaluatorDef {
		if (!this.config.type) {
			throw new Error(
				'Evaluator is missing type(). Call type("your-evaluator") to describe what should be evaluated.',
			);
		}
		return this.config;
	}
}

class PopulationEvaluatorBuilder extends EvaluatorBuilder<{
	id?: string;
	role?: PopulationRoleId;
}> {
	constructor() {
		super('population');
	}
	// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
	id(populationId: PopulationRoleId | string) {
		return this.param('id', populationId);
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

class DevelopmentEvaluatorBuilder extends EvaluatorBuilder<{
	id?: DevelopmentIdParam;
}> {
	constructor() {
		super('development');
	}
	id(id: DevelopmentIdParam) {
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
		if (value instanceof EvaluatorBuilder) {
			return value.build();
		}
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
	private metaSet = false;
	type(type: string) {
		if (this.typeSet) {
			throw new Error(
				'Effect already has type(). Remove the extra type() call.',
			);
		}
		this.config.type = type;
		this.typeSet = true;
		return this;
	}
	method(method: string) {
		if (this.methodSet) {
			throw new Error(
				'Effect already has method(). Remove the extra method() call.',
			);
		}
		this.config.method = method;
		this.methodSet = true;
		return this;
	}
	param(key: string, value: unknown) {
		if (this.paramsSet) {
			throw new Error(
				'Effect params(...) was already provided. Remove params(...) before calling param().',
			);
		}
		if (this.paramKeys.has(key)) {
			throw new Error(
				`Effect already has a value for "${key}". Remove the duplicate param('${key}', ...) call.`,
			);
		}
		this.config.params = this.config.params || {};
		(this.config.params as Params)[key] = value;
		this.paramKeys.add(key);
		return this;
	}
	params(params: P | ParamsBuilder<P>) {
		if (this.paramsSet) {
			throw new Error(
				'Effect params(...) was already provided. Remove the duplicate params() call.',
			);
		}
		if (this.paramKeys.size) {
			throw new Error(
				'Effect already has individual param() values. Remove them before calling params(...).',
			);
		}
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
		if (this.evaluatorSet) {
			throw new Error(
				'Effect already has an evaluator(). Remove the duplicate evaluator() call.',
			);
		}
		if (typeOrBuilder instanceof EvaluatorBuilder) {
			this.config.evaluator = typeOrBuilder.build();
		} else {
			this.config.evaluator = {
				type: typeOrBuilder,
				params:
					params instanceof ParamsBuilder ? params.build() : (params as Params),
			} as EvaluatorDef;
		}
		this.evaluatorSet = true;
		return this;
	}
	round(mode: 'up' | 'down') {
		if (this.roundSet) {
			throw new Error('Effect already has round(). Remove the duplicate call.');
		}
		this.config.round = mode;
		this.roundSet = true;
		return this;
	}
	meta(meta: EffectConfig['meta']) {
		if (this.metaSet) {
			throw new Error(
				'Effect already has meta(). Remove the duplicate meta() call.',
			);
		}
		this.config.meta = meta;
		this.metaSet = true;
		return this;
	}
	allowShortfall() {
		return this.meta({ allowShortfall: true });
	}
	build(): EffectConfig {
		if (!this.typeSet && !this.methodSet) {
			const hasNestedEffects = Array.isArray(this.config.effects)
				? this.config.effects.length > 0
				: false;
			if (!hasNestedEffects) {
				throw new Error(
					'Effect is missing type() and method(). Call effect(Types.X, Methods.Y) or add nested effect(...) calls before build().',
				);
			}
		}
		return this.config;
	}
}

export function effect(type?: string, method?: string) {
	const builder = new EffectBuilder();
	if (type) {
		builder.type(type);
	}
	if (method) {
		builder.method(method);
	}
	return builder;
}

export class RequirementBuilder<P extends Params = Params> {
	private config: RequirementConfig = {} as RequirementConfig;
	private paramsSet = false;
	private readonly paramKeys = new Set<string>();
	private typeSet = false;
	private methodSet = false;
	type(type: string) {
		if (this.typeSet) {
			throw new Error(
				'Requirement already has type(). Remove the extra type() call.',
			);
		}
		this.config.type = type;
		this.typeSet = true;
		return this;
	}
	method(method: string) {
		if (this.methodSet) {
			throw new Error(
				'Requirement already has method(). Remove the extra method() call.',
			);
		}
		this.config.method = method;
		this.methodSet = true;
		return this;
	}
	param(key: string, value: unknown) {
		if (this.paramsSet) {
			throw new Error(
				'Requirement params(...) was already provided. Remove params(...) before calling param().',
			);
		}
		if (this.paramKeys.has(key)) {
			throw new Error(
				`Requirement already has a value for "${key}". Remove the duplicate param('${key}', ...) call.`,
			);
		}
		this.config.params = this.config.params || {};
		(this.config.params as Params)[key] = value;
		this.paramKeys.add(key);
		return this;
	}
	params(params: P) {
		if (this.paramsSet) {
			throw new Error(
				'Requirement params(...) was already provided. Remove the duplicate params() call.',
			);
		}
		if (this.paramKeys.size) {
			throw new Error(
				'Requirement already has individual param() values. Remove them before calling params(...).',
			);
		}
		this.config.params = params;
		this.paramsSet = true;
		return this;
	}
	message(message: string) {
		this.config.message = message;
		return this;
	}
	build(): RequirementConfig {
		if (!this.typeSet) {
			throw new Error(
				'Requirement is missing type(). Call type("your-requirement") before build().',
			);
		}
		if (!this.methodSet) {
			throw new Error(
				'Requirement is missing method(). Call method("your-method") before build().',
			);
		}
		return this.config;
	}
}

export function requirement(type?: string, method?: string) {
	const builder = new RequirementBuilder();
	if (type) {
		builder.type(type);
	}
	if (method) {
		builder.method(method);
	}
	return builder;
}

class CompareRequirementBuilder extends RequirementBuilder<{
	left?: CompareValue;
	right?: CompareValue;
	operator?: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne';
}> {
	private leftSet = false;
	private rightSet = false;
	private operatorSet = false;

	constructor() {
		super();
		this.type(RequirementTypes.Evaluator);
		this.method('compare');
	}

	private normalize(value: CompareValue) {
		if (value instanceof EvaluatorBuilder) {
			return value.build();
		}
		return value;
	}

	left(value: CompareValue) {
		if (this.leftSet) {
			throw new Error(
				'Compare requirement already set left(). Remove the extra left() call.',
			);
		}
		super.param('left', this.normalize(value));
		this.leftSet = true;
		return this;
	}

	right(value: CompareValue) {
		if (this.rightSet) {
			throw new Error(
				'Compare requirement already set right(). Remove the extra right() call.',
			);
		}
		super.param('right', this.normalize(value));
		this.rightSet = true;
		return this;
	}

	operator(op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne') {
		if (this.operatorSet) {
			throw new Error(
				'Compare requirement already set operator(). Remove the extra operator() call.',
			);
		}
		super.param('operator', op);
		this.operatorSet = true;
		return this;
	}

	override build(): RequirementConfig {
		if (!this.leftSet) {
			throw new Error(
				'Compare requirement is missing left(). Call left(...) before build().',
			);
		}
		if (!this.rightSet) {
			throw new Error(
				'Compare requirement is missing right(). Call right(...) before build().',
			);
		}
		if (!this.operatorSet) {
			throw new Error(
				'Compare requirement is missing operator(). Call operator(...) before build().',
			);
		}
		return super.build();
	}
}

export function compareRequirement() {
	return new CompareRequirementBuilder();
}

export function requirementEvaluatorCompare() {
	return compareRequirement();
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
		if (this.idSet) {
			throw new Error(
				`${this.kind} already has an id(). Remove the extra id() call.`,
			);
		}
		this.config.id = id;
		this.idSet = true;
		return this;
	}
	name(name: string) {
		if (this.nameSet) {
			throw new Error(
				`${this.kind} already has a name(). Remove the extra name() call.`,
			);
		}
		this.config.name = name;
		this.nameSet = true;
		return this;
	}
	icon(icon: string) {
		if (this.iconSet) {
			throw new Error(
				`${this.kind} already has an icon(). Remove the extra icon() call.`,
			);
		}
		this.config.icon = icon;
		this.iconSet = true;
		return this;
	}
	build(): T {
		if (!this.idSet) {
			throw new Error(
				`${this.kind} is missing id(). Call id('unique-id') before build().`,
			);
		}
		if (!this.nameSet) {
			throw new Error(
				`${this.kind} is missing name(). Call name('Readable name') before build().`,
			);
		}
		return this.config as T;
	}
}

type ActionBuilderConfig = ActionDef;

export class ActionBuilder extends BaseBuilder<ActionBuilderConfig> {
	private readonly effectGroupIds = new Set<string>();

	constructor() {
		super({ effects: [] }, 'Action');
	}

	category(category: ActionCategory) {
		this.config.category = category;
		return this;
	}

	order(order: number) {
		this.config.order = order;
		return this;
	}

	focus(focus: Focus) {
		this.config.focus = focus;
		return this;
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
	effectGroup(group: ActionEffectGroupBuilder | ActionEffectGroupDef) {
		if (!(this instanceof ActionBuilder)) {
			throw new Error(
				'Action effect groups can only be used on actions. Use action().effectGroup(...).',
			);
		}
		const built =
			group instanceof ActionEffectGroupBuilder ? group.build() : group;
		if (this.effectGroupIds.has(built.id)) {
			throw new Error(
				`Action effect group id "${built.id}" already exists on this action. Use unique group ids.`,
			);
		}
		this.effectGroupIds.add(built.id);
		this.config.effects.push(built as ActionEffect);
		return this;
	}
	system(flag = true) {
		this.config.system = flag;
		return this;
	}
}

export class BuildingBuilder extends BaseBuilder<BuildingDef> {
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

	focus(focus: Focus) {
		this.config.focus = focus;
		return this;
	}
}

export class DevelopmentBuilder extends BaseBuilder<DevelopmentDef> {
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

	order(order: number) {
		this.config.order = order;
		return this;
	}

	focus(focus: Focus) {
		this.config.focus = focus;
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
	id: PhaseStepIdentifier;
	title?: string;
	triggers?: TriggerKey[];
	effects?: EffectDef[];
	icon?: string;
}

class StepBuilder {
	private config: StepDef;
	constructor(id: PhaseStepIdentifier) {
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
	id: PhaseIdentifier;
	steps: StepDef[];
	action?: boolean;
	label: string;
	icon?: string;
}

class PhaseBuilder {
	private config: PhaseDef;
	constructor(id: PhaseIdentifier) {
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

interface PlayerStartBuilderOptions {
	requireComplete?: boolean;
}

type LandStartConfig = NonNullable<PlayerStartConfig['lands']>[number];

function cloneLandStartConfig(land: LandStartConfig): LandStartConfig {
	return {
		...land,
		developments: land.developments ? [...land.developments] : undefined,
		onPayUpkeepStep: land.onPayUpkeepStep
			? [...land.onPayUpkeepStep]
			: undefined,
		onGainIncomeStep: land.onGainIncomeStep
			? [...land.onGainIncomeStep]
			: undefined,
		onGainAPStep: land.onGainAPStep ? [...land.onGainAPStep] : undefined,
	};
}

class PlayerStartLandBuilder extends ParamsBuilder<LandStartConfig> {
	development(id: string) {
		this.params.developments = this.params.developments || [];
		this.params.developments.push(id);
		return this;
	}

	developments(...ids: string[]) {
		ids.forEach((id) => this.development(id));
		return this;
	}

	slotsMax(slots: number) {
		return this.set(
			'slotsMax',
			slots,
			'Player start land already set slotsMax(). Remove the extra slotsMax() call.',
		);
	}

	slotsUsed(slots: number) {
		return this.set(
			'slotsUsed',
			slots,
			'Player start land already set slotsUsed(). Remove the extra slotsUsed() call.',
		);
	}

	tilled(tilled = true) {
		return this.set(
			'tilled',
			tilled,
			'Player start land already set tilled(). Remove the extra tilled() call.',
		);
	}

	upkeep(costs: Record<string, number>) {
		return this.set(
			'upkeep',
			{ ...costs },
			'Player start land already set upkeep(). Remove the extra upkeep() call.',
		);
	}

	onPayUpkeepStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onPayUpkeepStep = this.params.onPayUpkeepStep || [];
		this.params.onPayUpkeepStep.push(
			...effects.map((effect) => resolveEffectConfig(effect)),
		);
		return this;
	}

	onGainIncomeStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onGainIncomeStep = this.params.onGainIncomeStep || [];
		this.params.onGainIncomeStep.push(
			...effects.map((effect) => resolveEffectConfig(effect)),
		);
		return this;
	}

	onGainAPStep(...effects: Array<EffectConfig | EffectBuilder>) {
		this.params.onGainAPStep = this.params.onGainAPStep || [];
		this.params.onGainAPStep.push(
			...effects.map((effect) => resolveEffectConfig(effect)),
		);
		return this;
	}

	override build() {
		return cloneLandStartConfig(super.build());
	}
}

class PlayerStartLandsBuilder {
	private readonly lands: LandStartConfig[] = [];

	private resolveBuilder(
		input:
			| PlayerStartLandBuilder
			| ((builder: PlayerStartLandBuilder) => PlayerStartLandBuilder),
	) {
		if (input instanceof PlayerStartLandBuilder) {
			return input;
		}
		const configured = input(new PlayerStartLandBuilder());
		if (!(configured instanceof PlayerStartLandBuilder)) {
			throw new Error(
				'Player start lands land(...) callback must return the provided builder.',
			);
		}
		return configured;
	}

	land(
		input?:
			| LandStartConfig
			| PlayerStartLandBuilder
			| ((builder: PlayerStartLandBuilder) => PlayerStartLandBuilder),
	) {
		if (!input) {
			this.lands.push({});
			return this;
		}
		if (input instanceof PlayerStartLandBuilder) {
			this.lands.push(input.build());
			return this;
		}
		if (typeof input === 'function') {
			const builder = this.resolveBuilder(input);
			this.lands.push(builder.build());
			return this;
		}
		this.lands.push(cloneLandStartConfig(input));
		return this;
	}

	build() {
		return this.lands.map((land) => cloneLandStartConfig(land));
	}
}

class PlayerStartBuilder extends ParamsBuilder<PlayerStartConfig> {
	constructor(private readonly requireComplete: boolean) {
		super();
	}

	resources(values: Record<string, number>) {
		if (!values) {
			throw new Error(
				'Player start resources() needs a record. Use {} when nothing changes.',
			);
		}
		return this.set(
			'resources',
			{ ...values },
			'Player start already set resources(). Remove the extra resources() call.',
		);
	}

	stats(values: Record<string, number>) {
		if (!values) {
			throw new Error(
				'Player start stats() needs a record. Use {} when no stats change.',
			);
		}
		return this.set(
			'stats',
			{ ...values },
			'Player start already set stats(). Remove the extra stats() call.',
		);
	}

	population(values: Record<string, number>) {
		if (!values) {
			throw new Error(
				'Player start population() needs a record. Use {} when empty.',
			);
		}
		return this.set(
			'population',
			{ ...values },
			'Player start already set population(). Remove the extra population() call.',
		);
	}

	lands(
		input:
			| NonNullable<PlayerStartConfig['lands']>
			| PlayerStartLandsBuilder
			| ((builder: PlayerStartLandsBuilder) => PlayerStartLandsBuilder),
	) {
		if (!input) {
			throw new Error(
				'Player start lands() needs configuration. Use [] when no lands are configured.',
			);
		}
		if (input instanceof PlayerStartLandsBuilder) {
			return this.set(
				'lands',
				input.build(),
				'Player start already set lands(). Remove the extra lands() call.',
			);
		}
		if (Array.isArray(input)) {
			return this.set(
				'lands',
				input.map((land) => cloneLandStartConfig(land)),
				'Player start already set lands(). Remove the extra lands() call.',
			);
		}
		const configured = input(new PlayerStartLandsBuilder());
		if (!(configured instanceof PlayerStartLandsBuilder)) {
			throw new Error(
				'Player start lands(...) callback must return the provided builder.',
			);
		}
		return this.set(
			'lands',
			configured.build(),
			'Player start already set lands(). Remove the extra lands() call.',
		);
	}

	override build(): PlayerStartConfig {
		if (this.requireComplete) {
			if (!this.wasSet('resources')) {
				throw new Error(
					'Player start is missing resources(). Call resources(...) before build().',
				);
			}
			if (!this.wasSet('stats')) {
				throw new Error(
					'Player start is missing stats(). Call stats(...) before build().',
				);
			}
			if (!this.wasSet('population')) {
				throw new Error(
					'Player start is missing population(). Call population(...) before build().',
				);
			}
			if (!this.wasSet('lands')) {
				throw new Error(
					'Player start is missing lands(). Call lands(...) before build().',
				);
			}
		}
		return super.build();
	}
}

class StartConfigBuilder {
	private playerConfig: PlayerStartConfig | undefined;
	private lastPlayerCompensationConfig: PlayerStartConfig | undefined;

	private resolveBuilder(
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
		requireComplete: boolean,
	) {
		if (input instanceof PlayerStartBuilder) {
			return input;
		}
		const configured = input(new PlayerStartBuilder(requireComplete));
		if (!(configured instanceof PlayerStartBuilder)) {
			throw new Error(
				'Start config player(...) callback must return the provided builder.',
			);
		}
		return configured;
	}

	player(
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
	) {
		if (this.playerConfig) {
			throw new Error(
				'Start config already set player(...). Remove the extra player() call.',
			);
		}
		const builder = this.resolveBuilder(input, true);
		this.playerConfig = builder.build();
		return this;
	}

	lastPlayerCompensation(
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
	) {
		if (this.lastPlayerCompensationConfig) {
			throw new Error(
				'Start config already set lastPlayerCompensation(). Remove the extra call.',
			);
		}
		const builder = this.resolveBuilder(input, false);
		this.lastPlayerCompensationConfig = builder.build();
		return this;
	}

	build(): StartConfig {
		if (!this.playerConfig) {
			throw new Error(
				'Start config is missing player(...). Configure the base player first.',
			);
		}
		const config: StartConfig = { player: this.playerConfig };
		if (this.lastPlayerCompensationConfig) {
			config.players = { B: this.lastPlayerCompensationConfig };
		}
		return config;
	}
}

export function playerStart(options?: PlayerStartBuilderOptions) {
	return new PlayerStartBuilder(options?.requireComplete ?? true);
}

export function startConfig() {
	return new StartConfigBuilder();
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
export function phase(id: PhaseIdentifier) {
	return new PhaseBuilder(id);
}
export function step(id: PhaseStepIdentifier) {
	return new StepBuilder(id);
}
