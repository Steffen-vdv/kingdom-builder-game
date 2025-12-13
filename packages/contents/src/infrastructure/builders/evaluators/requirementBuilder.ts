import type { RequirementConfig } from '@kingdom-builder/protocol';
import { RequirementTypes } from '../../builderShared';
import type { Params } from '../../builderShared';
import { EvaluatorBuilder, type CompareValue } from './evaluatorBuilder';

export class RequirementBuilder<P extends Params = Params> {
	private config: RequirementConfig = {} as RequirementConfig;
	private paramsSet = false;
	private readonly paramKeys = new Set<string>();
	private typeSet = false;
	private methodSet = false;

	type(type: string) {
		if (this.typeSet) {
			throw new Error('Requirement already has type(). Remove the extra type() call.');
		}
		this.config.type = type;
		this.typeSet = true;
		return this;
	}

	method(method: string) {
		if (this.methodSet) {
			throw new Error('Requirement already has method(). Remove the extra method() call.');
		}
		this.config.method = method;
		this.methodSet = true;
		return this;
	}

	param(key: string, value: unknown) {
		if (this.paramsSet) {
			throw new Error('Requirement params(...) was already provided. Remove params(...) before calling param().');
		}
		if (this.paramKeys.has(key)) {
			throw new Error(`Requirement already has a value for "${key}". Remove the duplicate param('${key}', ...) call.`);
		}
		this.config.params = this.config.params || {};
		(this.config.params as Params)[key] = value;
		this.paramKeys.add(key);
		return this;
	}

	params(params: P) {
		if (this.paramsSet) {
			throw new Error('Requirement params(...) was already provided. Remove the duplicate params() call.');
		}
		if (this.paramKeys.size) {
			throw new Error('Requirement already has individual param() values. Remove them before calling params(...).');
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
			throw new Error('Requirement is missing type(). Call type("your-requirement") before build().');
		}
		if (!this.methodSet) {
			throw new Error('Requirement is missing method(). Call method("your-method") before build().');
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
			throw new Error('Compare requirement already set left(). Remove the extra left() call.');
		}
		super.param('left', this.normalize(value));
		this.leftSet = true;
		return this;
	}

	right(value: CompareValue) {
		if (this.rightSet) {
			throw new Error('Compare requirement already set right(). Remove the extra right() call.');
		}
		super.param('right', this.normalize(value));
		this.rightSet = true;
		return this;
	}

	operator(op: 'lt' | 'lte' | 'gt' | 'gte' | 'eq' | 'ne') {
		if (this.operatorSet) {
			throw new Error('Compare requirement already set operator(). Remove the extra operator() call.');
		}
		super.param('operator', op);
		this.operatorSet = true;
		return this;
	}

	override build(): RequirementConfig {
		if (!this.leftSet) {
			throw new Error('Compare requirement is missing left(). Call left(...) before build().');
		}
		if (!this.rightSet) {
			throw new Error('Compare requirement is missing right(). Call right(...) before build().');
		}
		if (!this.operatorSet) {
			throw new Error('Compare requirement is missing operator(). Call operator(...) before build().');
		}
		return super.build();
	}
}
