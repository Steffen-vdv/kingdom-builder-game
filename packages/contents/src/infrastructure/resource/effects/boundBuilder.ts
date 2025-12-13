import type { ResourcePlayerScope, ResourceUpperBoundIncreaseParams } from './types';

const BUILDER_NAME = 'Resource upper-bound builder';

export interface ResourceUpperBoundIncreaseBuilder {
	player(scope: ResourcePlayerScope): this;
	delta(amount: number): this;
	build(): ResourceUpperBoundIncreaseParams;
}

class ResourceUpperBoundIncreaseBuilderImpl implements ResourceUpperBoundIncreaseBuilder {
	private readonly resourceId: string;
	private playerScope?: ResourcePlayerScope;
	private deltaValue?: number;

	constructor(resourceId: string) {
		if (!resourceId) {
			throw new Error(`${BUILDER_NAME} requires a non-empty resourceId.`);
		}
		this.resourceId = resourceId;
	}

	player(scope: ResourcePlayerScope): this {
		this.playerScope = scope;
		return this;
	}

	delta(amount: number): this {
		if (!Number.isFinite(amount)) {
			throw new Error(`${BUILDER_NAME} expected delta() to receive a finite number but received ${amount}.`);
		}
		if (!Number.isInteger(amount)) {
			throw new Error(`${BUILDER_NAME} expected delta() to receive an integer but received ${amount}.`);
		}
		if (amount <= 0) {
			throw new Error(`${BUILDER_NAME} expected delta() to be greater than 0 but received ${amount}.`);
		}

		this.deltaValue = amount;
		return this;
	}

	build(): ResourceUpperBoundIncreaseParams {
		if (this.deltaValue === undefined) {
			throw new Error(`${BUILDER_NAME} requires delta() before build().`);
		}

		return {
			resourceId: this.resourceId,
			delta: this.deltaValue,
			...(this.playerScope ? { player: this.playerScope } : {}),
		};
	}
}

export function increaseUpperBound(resourceId: string): ResourceUpperBoundIncreaseBuilder {
	return new ResourceUpperBoundIncreaseBuilderImpl(resourceId);
}
