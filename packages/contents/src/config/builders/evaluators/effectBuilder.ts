import type { EffectConfig, EvaluatorDef } from '@kingdom-builder/protocol';
import type { StatKey } from '../../../stats';
import { ParamsBuilder, ResourceBoundMethods, ResourceMethods, StatMethods, Types } from '../../builderShared';
import type { Params } from '../../builderShared';
import {
	ResourceV2TransferEffectParamsBuilder,
	ResourceV2UpperBoundEffectParamsBuilder,
	ResourceV2ValueEffectParamsBuilder,
	resourceV2TransferParams,
	resourceV2UpperBoundParams,
	resourceV2ValueParams,
	statParams,
	type ResourceV2BoundAdjustmentParams,
	type ResourceV2TransferEffectParams,
	type ResourceV2ValueEffectParams,
} from '../effectParams';
import { EvaluatorBuilder } from './evaluatorBuilder';

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
			throw new Error('Effect already has type(). Remove the extra type() call.');
		}
		this.config.type = type;
		this.typeSet = true;
		return this;
	}

	method(method: string) {
		if (this.methodSet) {
			throw new Error('Effect already has method(). Remove the extra method() call.');
		}
		this.config.method = method;
		this.methodSet = true;
		return this;
	}

	param(key: string, value: unknown) {
		if (this.paramsSet) {
			throw new Error('Effect params(...) was already provided. Remove params(...) before calling param().');
		}
		if (this.paramKeys.has(key)) {
			throw new Error(`Effect already has a value for "${key}". Remove the duplicate param('${key}', ...) call.`);
		}
		this.config.params = this.config.params || {};
		(this.config.params as Params)[key] = value;
		this.paramKeys.add(key);
		return this;
	}

	params(params: P | ParamsBuilder<P>) {
		if (this.paramsSet) {
			throw new Error('Effect params(...) was already provided. Remove the duplicate params() call.');
		}
		if (this.paramKeys.size) {
			throw new Error('Effect already has individual param() values. Remove them before calling params(...).');
		}
		this.config.params = params instanceof ParamsBuilder ? params.build() : params;
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
	evaluator(typeOrBuilder: string | EvaluatorBuilder, params?: Params | ParamsBuilder) {
		if (this.evaluatorSet) {
			throw new Error('Effect already has an evaluator(). Remove the duplicate evaluator() call.');
		}
		if (typeOrBuilder instanceof EvaluatorBuilder) {
			this.config.evaluator = typeOrBuilder.build();
		} else {
			this.config.evaluator = {
				type: typeOrBuilder,
				params: params instanceof ParamsBuilder ? params.build() : (params as Params),
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
			throw new Error('Effect already has meta(). Remove the duplicate meta() call.');
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
			const hasNestedEffects = Array.isArray(this.config.effects) ? this.config.effects.length > 0 : false;
			if (!hasNestedEffects) {
				throw new Error(['Effect is missing type() and method().', 'Call effect(Types.X, Methods.Y) or add nested effect(...) calls', 'before build().'].join(' '));
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
	return effect(Types.Stat, StatMethods.ADD).params(statParams().key(stat).amount(amount).build()).build();
}

type ResourceValueParamsInput = ResourceV2ValueEffectParams | ResourceV2ValueEffectParamsBuilder | ((builder: ResourceV2ValueEffectParamsBuilder) => void | ResourceV2ValueEffectParamsBuilder);

function resolveResourceValueParams(input: ResourceValueParamsInput): ResourceV2ValueEffectParams {
	if (input instanceof ResourceV2ValueEffectParamsBuilder) {
		return input.build();
	}
	if (typeof input === 'function') {
		const builder = resourceV2ValueParams();
		const result = input(builder);
		return result instanceof ResourceV2ValueEffectParamsBuilder ? result.build() : builder.build();
	}
	return input;
}

type ResourceTransferParamsInput =
	| ResourceV2TransferEffectParams
	| ResourceV2TransferEffectParamsBuilder
	| ((builder: ResourceV2TransferEffectParamsBuilder) => void | ResourceV2TransferEffectParamsBuilder);

function resolveResourceTransferParams(input: ResourceTransferParamsInput): ResourceV2TransferEffectParams {
	if (input instanceof ResourceV2TransferEffectParamsBuilder) {
		return input.build();
	}
	if (typeof input === 'function') {
		const builder = resourceV2TransferParams();
		const result = input(builder);
		return result instanceof ResourceV2TransferEffectParamsBuilder ? result.build() : builder.build();
	}
	return input;
}

type ResourceUpperBoundParamsInput =
	| ResourceV2BoundAdjustmentParams
	| ResourceV2UpperBoundEffectParamsBuilder
	| ((builder: ResourceV2UpperBoundEffectParamsBuilder) => void | ResourceV2UpperBoundEffectParamsBuilder);

function resolveResourceUpperBoundParams(input: ResourceUpperBoundParamsInput): ResourceV2BoundAdjustmentParams {
	if (input instanceof ResourceV2UpperBoundEffectParamsBuilder) {
		return input.build();
	}
	if (typeof input === 'function') {
		const builder = resourceV2UpperBoundParams();
		const result = input(builder);
		return result instanceof ResourceV2UpperBoundEffectParamsBuilder ? result.build() : builder.build();
	}
	return input;
}

export function resourceAddEffect(params: ResourceValueParamsInput) {
	return effect(Types.Resource, ResourceMethods.ADD).params(resolveResourceValueParams(params)).build();
}

export function resourceRemoveEffect(params: ResourceValueParamsInput) {
	return effect(Types.Resource, ResourceMethods.REMOVE).params(resolveResourceValueParams(params)).build();
}

export function resourceTransferEffect(params: ResourceTransferParamsInput) {
	return effect(Types.Resource, ResourceMethods.TRANSFER).params(resolveResourceTransferParams(params)).build();
}

export function resourceUpperBoundIncreaseEffect(params: ResourceUpperBoundParamsInput) {
	return effect(Types.ResourceUpperBound, ResourceBoundMethods.INCREASE).params(resolveResourceUpperBoundParams(params)).build();
}
