import type { EvaluatorDef } from '@kingdom-builder/protocol';
import type { DevelopmentIdParam } from '../actionEffectGroups';
import { ParamsBuilder } from '../../builderShared';
import type { Params } from '../../builderShared';

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
			throw new Error('Evaluator already has a type(). Remove the extra type() call.');
		}
		this.config.type = type;
		return this;
	}

	param(key: string, value: unknown) {
		if (this.paramsSet) {
			throw new Error('You already supplied params(...) for this evaluator. Remove params(...) before calling param().');
		}
		if (this.paramKeys.has(key)) {
			throw new Error(`Evaluator already has a value for "${key}". Remove the duplicate param('${key}', ...) call.`);
		}
		this.config.params = this.config.params || ({} as Params);
		(this.config.params as Params)[key] = value;
		this.paramKeys.add(key);
		return this;
	}

	params(params: P | ParamsBuilder<P>) {
		if (this.paramsSet) {
			throw new Error('Evaluator params(...) was already provided. Remove the duplicate params() call.');
		}
		if (this.paramKeys.size) {
			throw new Error('Evaluator already has individual param() values. Remove them before ' + 'calling params(...).');
		}
		this.config.params = params instanceof ParamsBuilder ? params.build() : params;
		this.paramsSet = true;
		return this;
	}

	build(): EvaluatorDef {
		if (!this.config.type) {
			throw new Error('Evaluator is missing type(). Call type("your-evaluator") to describe what ' + 'should be evaluated.');
		}
		return this.config;
	}
}

class ResourceEvaluatorBuilder extends EvaluatorBuilder<{
	resourceId?: string;
	id?: string;
}> {
	constructor() {
		super('resource');
	}

	resourceId(resourceId: string) {
		return this.param('resourceId', resourceId);
	}

	/** Set an evaluation ID for modifier targeting */
	id(evaluationId: string) {
		return this.param('id', evaluationId);
	}
}

export function resourceEvaluator() {
	return new ResourceEvaluatorBuilder();
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

class LandEvaluatorBuilder extends EvaluatorBuilder {
	constructor() {
		super('land');
	}
}

export function landEvaluator() {
	return new LandEvaluatorBuilder();
}

export type CompareValue = number | EvaluatorDef | EvaluatorBuilder;

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
