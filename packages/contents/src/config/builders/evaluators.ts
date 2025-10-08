/* eslint-disable max-lines */

import type {
	EffectConfig,
	EvaluatorDef,
	RequirementConfig,
} from '@kingdom-builder/protocol';
import type { PopulationRoleId } from '../../populationRoles';
import type { StatKey } from '../../stats';
import type { DevelopmentIdParam } from './actionEffectGroups';
import {
	ParamsBuilder,
	RequirementTypes,
	StatMethods,
	Types,
} from '../builderShared';
import type { Params } from '../builderShared';
import { statParams } from './effectParams';

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

/* eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents */
type PopulationEvaluatorId = PopulationRoleId | string;

class PopulationEvaluatorBuilder extends EvaluatorBuilder<{
	id?: PopulationEvaluatorId;
	role?: PopulationRoleId;
}> {
	constructor() {
		super('population');
	}
	id(populationId: PopulationEvaluatorId) {
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

export class CompareRequirementBuilder extends RequirementBuilder<{
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
