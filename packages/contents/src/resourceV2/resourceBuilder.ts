import type { EffectDef } from '@kingdom-builder/protocol';
import type { ResourceV2Definition, ResourceV2TierTrack } from './types';

interface ResourceGroupOptions {
	order?: number;
}

const builderName = 'ResourceV2 builder';

type NumericField = 'order' | 'lowerBound' | 'upperBound' | 'groupOrder' | 'globalCost.amount';

function assertInteger(value: number, field: NumericField) {
	if (!Number.isInteger(value)) {
		throw new Error(`${builderName} expected ${field} to be an integer but received ${value}.`);
	}
}

function assertPositiveInteger(value: number, field: NumericField) {
	assertInteger(value, field);
	if (value <= 0) {
		throw new Error(`${builderName} expected ${field} to be greater than 0 but received ${value}.`);
	}
}

export interface ResourceV2Builder {
	icon(icon: string): this;
	label(label: string): this;
	description(description: string): this;
	order(order: number): this;
	displayAsPercent(enabled?: boolean): this;
	allowDecimal(enabled?: boolean): this;
	lowerBound(value: number): this;
	upperBound(value: number): this;
	bounds(lower?: number, upper?: number): this;
	trackValueBreakdown(enabled?: boolean): this;
	trackBoundBreakdown(enabled?: boolean): this;
	group(id: string, options?: ResourceGroupOptions): this;
	tags(...tags: ReadonlyArray<string | readonly string[]>): this;
	tierTrack(track: ResourceV2TierTrack): this;
	globalActionCost(amount: number): this;
	/**
	 * Effects to run when this resource's value increases.
	 * Runs once per unit of increase.
	 */
	onValueIncrease(...effects: EffectDef[]): this;
	/**
	 * Effects to run when this resource's value decreases.
	 * Runs once per unit of decrease.
	 */
	onValueDecrease(...effects: EffectDef[]): this;
	build(): ResourceV2Definition;
}

class ResourceV2BuilderImpl implements ResourceV2Builder {
	private readonly definition: Partial<ResourceV2Definition> & {
		id: string;
	};

	private readonly setKeys = new Set<string>();
	private readonly setToggles = new Set<string>();
	private lowerBoundSet = false;
	private upperBoundSet = false;
	private groupSet = false;
	private tagsSet = false;
	private tierTrackSet = false;
	private globalCostSet = false;
	private onValueIncreaseSet = false;
	private onValueDecreaseSet = false;

	constructor(id: string) {
		if (!id) {
			throw new Error('ResourceV2 builder requires a non-empty id.');
		}
		this.definition = { id };
	}

	private setOnce<K extends keyof ResourceV2Definition>(key: K, value: ResourceV2Definition[K]) {
		if (this.setKeys.has(key as string)) {
			throw new Error(`${builderName} already has ${String(key)}() set. Remove the duplicate call.`);
		}
		this.definition[key] = value;
		this.setKeys.add(key as string);
	}

	private setToggle(key: 'displayAsPercent' | 'allowDecimal' | 'trackValueBreakdown' | 'trackBoundBreakdown', value: boolean) {
		if (this.setToggles.has(key)) {
			throw new Error(`${builderName} already toggled ${key}(). Remove the duplicate call.`);
		}
		this.definition[key] = value;
		this.setToggles.add(key);
	}

	private validateBounds() {
		const { lowerBound, upperBound } = this.definition;
		if (typeof lowerBound === 'number' && typeof upperBound === 'number' && lowerBound > upperBound) {
			throw new Error(`${builderName} lowerBound must be less than or equal to upperBound (${lowerBound} > ${upperBound}).`);
		}
	}

	icon(icon: string) {
		this.setOnce('icon', icon);
		return this;
	}

	label(label: string) {
		this.setOnce('label', label);
		return this;
	}

	description(description: string) {
		this.setOnce('description', description);
		return this;
	}

	order(order: number) {
		assertInteger(order, 'order');
		this.setOnce('order', order);
		return this;
	}

	displayAsPercent(enabled = true) {
		const resolved = enabled ?? true;
		this.setToggle('displayAsPercent', resolved);
		return this;
	}

	allowDecimal(enabled = true) {
		const resolved = enabled ?? true;
		this.setToggle('allowDecimal', resolved);
		return this;
	}

	lowerBound(value: number) {
		if (this.lowerBoundSet) {
			throw new Error(`${builderName} already has lowerBound() set. Remove the duplicate call.`);
		}
		assertInteger(value, 'lowerBound');
		this.definition.lowerBound = value;
		this.lowerBoundSet = true;
		this.validateBounds();
		return this;
	}

	upperBound(value: number) {
		if (this.upperBoundSet) {
			throw new Error(`${builderName} already has upperBound() set. Remove the duplicate call.`);
		}
		assertInteger(value, 'upperBound');
		this.definition.upperBound = value;
		this.upperBoundSet = true;
		this.validateBounds();
		return this;
	}

	bounds(lower?: number, upper?: number) {
		if (typeof lower === 'number') {
			if (this.lowerBoundSet) {
				throw new Error(`${builderName} already has lowerBound() set. Remove the duplicate call.`);
			}
			assertInteger(lower, 'lowerBound');
			this.definition.lowerBound = lower;
			this.lowerBoundSet = true;
		}
		if (typeof upper === 'number') {
			if (this.upperBoundSet) {
				throw new Error(`${builderName} already has upperBound() set. Remove the duplicate call.`);
			}
			assertInteger(upper, 'upperBound');
			this.definition.upperBound = upper;
			this.upperBoundSet = true;
		}
		this.validateBounds();
		return this;
	}

	trackValueBreakdown(enabled = true) {
		const resolved = enabled ?? true;
		this.setToggle('trackValueBreakdown', resolved);
		return this;
	}

	trackBoundBreakdown(enabled = true) {
		const resolved = enabled ?? true;
		this.setToggle('trackBoundBreakdown', resolved);
		return this;
	}

	group(id: string, options?: ResourceGroupOptions) {
		if (this.groupSet) {
			throw new Error(`${builderName} already configured group(). Remove the duplicate call.`);
		}
		if (!id) {
			throw new Error(`${builderName} group() requires a non-empty id.`);
		}
		this.definition.groupId = id;
		if (options?.order !== undefined) {
			assertInteger(options.order, 'groupOrder');
			this.definition.groupOrder = options.order;
		}
		this.groupSet = true;
		return this;
	}

	tags(...tags: ReadonlyArray<string | readonly string[]>) {
		if (this.tagsSet) {
			throw new Error(`${builderName} already configured tags(). Remove the duplicate call.`);
		}
		const flattened: string[] = [];
		for (const entry of tags) {
			if (typeof entry === 'string') {
				flattened.push(entry);
				continue;
			}
			for (const tag of entry) {
				flattened.push(tag);
			}
		}
		this.definition.tags = Array.from(new Set(flattened));
		this.tagsSet = true;
		return this;
	}

	tierTrack(track: ResourceV2TierTrack) {
		if (this.tierTrackSet) {
			throw new Error(`${builderName} already configured tierTrack(). Remove the duplicate call.`);
		}
		this.definition.tierTrack = track;
		this.tierTrackSet = true;
		return this;
	}

	globalActionCost(amount: number) {
		if (this.globalCostSet) {
			throw new Error(`${builderName} already configured globalActionCost(). Remove the duplicate call.`);
		}
		assertPositiveInteger(amount, 'globalCost.amount');
		this.definition.globalCost = { amount };
		this.globalCostSet = true;
		return this;
	}

	onValueIncrease(...effects: EffectDef[]) {
		if (this.onValueIncreaseSet) {
			throw new Error(`${builderName} already configured onValueIncrease(). ` + 'Remove the duplicate call.');
		}
		this.definition.onValueIncrease = effects;
		this.onValueIncreaseSet = true;
		return this;
	}

	onValueDecrease(...effects: EffectDef[]) {
		if (this.onValueDecreaseSet) {
			throw new Error(`${builderName} already configured onValueDecrease(). ` + 'Remove the duplicate call.');
		}
		this.definition.onValueDecrease = effects;
		this.onValueDecreaseSet = true;
		return this;
	}

	build(): ResourceV2Definition {
		if (!this.definition.label) {
			throw new Error(`${builderName} is missing label(). Call label('Readable label') before build().`);
		}
		if (!this.definition.icon) {
			throw new Error(`${builderName} is missing icon(). Call icon('icon-id') before build().`);
		}
		return this.definition as ResourceV2Definition;
	}
}

export function resourceV2(id: string): ResourceV2Builder {
	return new ResourceV2BuilderImpl(id);
}
