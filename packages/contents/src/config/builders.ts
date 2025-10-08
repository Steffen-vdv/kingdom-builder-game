import type {
	ActionEffect,
	AttackTarget,
	EffectConfig,
	EffectDef,
	EvaluatorDef,
	PopulationConfig,
	RequirementConfig,
	WinConditionDefinition,
	WinConditionDisplay,
	WinConditionResult,
	WinConditionTrigger,
	WinConditionOutcome,
	PlayerStartConfig,
	StartConfig,
	StartModeConfig,
} from '@kingdom-builder/protocol';
import type { ResourceKey } from '../resources';
import type { StatKey } from '../stats';
import type { PopulationRoleId } from '../populationRoles';
import type { BuildingDef, DevelopmentDef, Focus, TriggerKey } from '../defs';
import type { ActionCategory, ActionDef, ActionId } from '../actions';
import type {
	PhaseId as PhaseIdentifier,
	PhaseStepId as PhaseStepIdentifier,
} from '../phases';
import {
	Types,
	RequirementTypes,
	ParamsBuilder,
	StatMethods,
} from './builderShared';
import type { Params } from './builderShared';
import { resolveEffectConfig, statParams } from './builders/effectParams';
import { ActionEffectGroupBuilder } from './builders/actionEffectGroups';
export {
	happinessTier,
	tierDisplay,
	tierPassiveText,
} from './builders/tierBuilders';
import type {
	ActionEffectGroupDef,
	DevelopmentIdParam,
} from './builders/actionEffectGroups';

export {
	ActionEffectGroupBuilder,
	ActionEffectGroupOptionBuilder,
	ActionEffectGroupOptionParamsBuilder,
	actionEffectGroup,
	actionEffectGroupOption,
	actionEffectGroupOptionParams,
} from './builders/actionEffectGroups';

export {
	actionParams,
	buildingParams,
	developmentParams,
	landParams,
	passiveParams,
	resourceParams,
	statParams,
} from './builders/effectParams';

export type {
	ActionEffectGroupDef,
	ActionEffectGroupOptionDef,
	DevelopmentIdParam,
} from './builders/actionEffectGroups';

export function populationAssignmentPassiveId(role: PopulationRoleId) {
	return `${role}_$player_$index`;
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

export function statAddEffect(stat: StatKey, amount: number) {
	return effect(Types.Stat, StatMethods.ADD)
		.params(statParams().key(stat).amount(amount).build())
		.build();
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

class StartModeBuilder {
	private playerConfig: PlayerStartConfig | undefined;
	private readonly playerOverrides: Record<string, PlayerStartConfig> = {};
	private readonly assignedOverrides = new Set<string>();

	private resolve(
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
	) {
		if (input instanceof PlayerStartBuilder) {
			return input;
		}
		const configured = input(new PlayerStartBuilder(false));
		if (!(configured instanceof PlayerStartBuilder)) {
			throw new Error(
				'Start mode player(...) callback must return the provided builder.',
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
				'Dev mode start already set player(...). Remove the extra player() call.',
			);
		}
		const builder = this.resolve(input);
		this.playerConfig = builder.build();
		return this;
	}

	playerOverride(
		id: string,
		input:
			| PlayerStartBuilder
			| ((builder: PlayerStartBuilder) => PlayerStartBuilder),
	) {
		if (!id) {
			throw new Error(
				'Dev mode playerOverride() requires a non-empty player id.',
			);
		}
		if (this.assignedOverrides.has(id)) {
			throw new Error(
				`Dev mode already set override "${id}". Remove the extra playerOverride() call.`,
			);
		}
		const builder = this.resolve(input);
		this.playerOverrides[id] = builder.build();
		this.assignedOverrides.add(id);
		return this;
	}

	build(): StartModeConfig {
		const config: StartModeConfig = {};
		if (this.playerConfig) {
			config.player = structuredClone(this.playerConfig);
		}
		if (this.assignedOverrides.size > 0) {
			const overrides: Record<string, PlayerStartConfig> = {};
			for (const [playerId, overrideConfig] of Object.entries(
				this.playerOverrides,
			)) {
				overrides[playerId] = structuredClone(overrideConfig);
			}
			config.players = overrides;
		}
		return config;
	}
}

class StartConfigBuilder {
	private playerConfig: PlayerStartConfig | undefined;
	private lastPlayerCompensationConfig: PlayerStartConfig | undefined;
	private devModeConfig: StartModeConfig | undefined;

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

	devMode(
		input: StartModeBuilder | ((builder: StartModeBuilder) => StartModeBuilder),
	) {
		if (this.devModeConfig) {
			throw new Error(
				'Start config already set devMode(...). Remove the extra call.',
			);
		}
		if (input instanceof StartModeBuilder) {
			this.devModeConfig = input.build();
			return this;
		}
		const configured = input(new StartModeBuilder());
		if (!(configured instanceof StartModeBuilder)) {
			throw new Error(
				'Start config devMode(...) callback must return the provided builder.',
			);
		}
		this.devModeConfig = configured.build();
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
		if (this.devModeConfig) {
			config.modes = { dev: structuredClone(this.devModeConfig) };
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

export type WinConditionDef = WinConditionDefinition;

class WinConditionDisplayBuilder {
	private readonly config: Partial<WinConditionDisplay> = {};
	private readonly assigned = new Set<keyof WinConditionDisplay>();

	private set<K extends keyof WinConditionDisplay>(
		key: K,
		value: WinConditionDisplay[K],
		message: string,
	) {
		if (this.assigned.has(key)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(key);
		return this;
	}

	icon(icon: string) {
		return this.set(
			'icon',
			icon,
			'Win condition display already set icon(). Remove the extra icon() call.',
		);
	}

	victory(text: string) {
		return this.set(
			'victory',
			text,
			'Win condition display already set victory(). Remove the extra victory() call.',
		);
	}

	defeat(text: string) {
		return this.set(
			'defeat',
			text,
			'Win condition display already set defeat(). Remove the extra defeat() call.',
		);
	}

	build(): WinConditionDisplay {
		return this.config as WinConditionDisplay;
	}
}

class WinConditionBuilder {
	private readonly config: Partial<WinConditionDefinition>;
	private triggerAssigned = false;
	private resultConfig: WinConditionResult = {
		subject: 'defeat',
		opponent: 'victory',
	};
	private displayConfig: WinConditionDisplay | undefined;

	constructor(id: string) {
		this.config = { id };
	}

	private setTrigger(trigger: WinConditionTrigger) {
		if (this.triggerAssigned) {
			throw new Error(
				'Win condition already defined a trigger. Remove the duplicate trigger call.',
			);
		}
		this.config.trigger = trigger;
		this.triggerAssigned = true;
		return this;
	}

	resourceThreshold(
		resource: ResourceKey,
		comparison: WinConditionTrigger['comparison'],
		value: number,
		target: WinConditionTrigger['target'] = 'self',
	) {
		return this.setTrigger({
			type: 'resource',
			key: resource,
			comparison,
			value,
			target,
		});
	}

	resourceAtMost(
		resource: ResourceKey,
		value: number,
		target: WinConditionTrigger['target'] = 'self',
	) {
		return this.resourceThreshold(resource, 'lte', value, target);
	}

	resourceAtLeast(
		resource: ResourceKey,
		value: number,
		target: WinConditionTrigger['target'] = 'self',
	) {
		return this.resourceThreshold(resource, 'gte', value, target);
	}

	subject(outcome: WinConditionOutcome) {
		this.resultConfig = {
			...this.resultConfig,
			subject: outcome,
		};
		return this;
	}

	opponent(outcome: WinConditionOutcome) {
		this.resultConfig = {
			...this.resultConfig,
			opponent: outcome,
		};
		return this;
	}

	subjectVictory() {
		return this.subject('victory');
	}

	subjectDefeat() {
		return this.subject('defeat');
	}

	subjectNone() {
		return this.subject('none');
	}

	opponentVictory() {
		return this.opponent('victory');
	}

	opponentDefeat() {
		return this.opponent('defeat');
	}

	opponentNone() {
		return this.opponent('none');
	}

	display(
		configure:
			| WinConditionDisplayBuilder
			| ((builder: WinConditionDisplayBuilder) => WinConditionDisplayBuilder),
	) {
		if (this.displayConfig) {
			throw new Error(
				'Win condition already set display(). Remove the extra display() call.',
			);
		}
		const builder =
			configure instanceof WinConditionDisplayBuilder
				? configure
				: configure(new WinConditionDisplayBuilder());
		if (!(builder instanceof WinConditionDisplayBuilder)) {
			throw new Error(
				'Win condition display(...) callback must return the provided builder.',
			);
		}
		this.displayConfig = builder.build();
		return this;
	}

	build(): WinConditionDefinition {
		const { id } = this.config;
		if (!id) {
			throw new Error('Win condition is missing an id.');
		}
		if (!this.triggerAssigned || !this.config.trigger) {
			throw new Error(
				'Win condition is missing a trigger. Define a trigger before build().',
			);
		}
		const built: WinConditionDefinition = {
			id,
			trigger: this.config.trigger,
			result: { ...this.resultConfig },
		};
		if (this.displayConfig) {
			built.display = { ...this.displayConfig };
		}
		return built;
	}
}

export function winCondition(id: string) {
	return new WinConditionBuilder(id);
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
