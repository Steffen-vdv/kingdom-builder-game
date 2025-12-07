import type { EffectDef } from '@kingdom-builder/protocol';
import type { ResourceBoundType, ResourceBoundValue, ResourceDefinition, ResourceTierTrack } from './types';

interface ResourceGroupOptions {
	order?: number;
}

const builderName = 'Resource builder';

type NumericField = 'order' | 'lowerBound' | 'upperBound' | 'groupOrder' | 'globalCost.amount';

function assertInteger(value: number, field: NumericField) {
	if (!Number.isInteger(value)) {
		throw new Error(`${builderName} expected ${field} to be an integer but received ${value}.`);
	}
}

function assertValidBoundValue(value: ResourceBoundValue, field: NumericField) {
	if (typeof value === 'number') {
		assertInteger(value, field);
		return;
	}
	// It's a ResourceBoundReference
	if (!value.resourceId) {
		throw new Error(`${builderName} ${field}() requires a non-empty resourceId.`);
	}
}

function assertPositiveInteger(value: number, field: NumericField) {
	assertInteger(value, field);
	if (value <= 0) {
		throw new Error(`${builderName} expected ${field} to be greater than 0 but received ${value}.`);
	}
}

export interface ResourceBuilder {
	icon(icon: string): this;
	label(label: string): this;
	description(description: string): this;
	order(order: number): this;
	displayAsPercent(enabled?: boolean): this;
	allowDecimal(enabled?: boolean): this;
	/**
	 * Sets the lower bound for this resource.
	 * @param value - A static number or a ResourceBoundReference (use boundTo())
	 * @example
	 * .lowerBound(0)  // Static: can't go below 0
	 * .lowerBound(boundTo(Stat.minGold))  // Dynamic: bound to another resource
	 */
	lowerBound(value: ResourceBoundValue): this;
	/**
	 * Sets the upper bound for this resource.
	 * @param value - A static number or a ResourceBoundReference (use boundTo())
	 * @example
	 * .upperBound(100)  // Static: can't exceed 100
	 * .upperBound(boundTo(Stat.populationMax))  // Dynamic: bound to another resource
	 */
	upperBound(value: ResourceBoundValue): this;
	trackValueBreakdown(enabled?: boolean): this;
	trackBoundBreakdown(enabled?: boolean): this;
	group(id: string, options?: ResourceGroupOptions): this;
	tags(...tags: ReadonlyArray<string | readonly string[]>): this;
	tierTrack(track: ResourceTierTrack): this;
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
	build(): ResourceDefinition;
}

class ResourceBuilderImpl implements ResourceBuilder {
	private readonly definition: Partial<ResourceDefinition> & {
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
			throw new Error('Resource builder requires a non-empty id.');
		}
		this.definition = { id };
	}

	private setOnce<K extends keyof ResourceDefinition>(key: K, value: ResourceDefinition[K]) {
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
		// Only validate static numeric bounds against each other
		if (typeof lowerBound === 'number' && typeof upperBound === 'number' && lowerBound > upperBound) {
			throw new Error(`${builderName} lowerBound must be <= upperBound (${lowerBound} > ${upperBound}).`);
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

	lowerBound(value: ResourceBoundValue) {
		if (this.lowerBoundSet) {
			throw new Error(`${builderName} already has lowerBound() set. Remove the duplicate call.`);
		}
		assertValidBoundValue(value, 'lowerBound');
		this.definition.lowerBound = value;
		this.lowerBoundSet = true;
		this.validateBounds();
		return this;
	}

	upperBound(value: ResourceBoundValue) {
		if (this.upperBoundSet) {
			throw new Error(`${builderName} already has upperBound() set. Remove the duplicate call.`);
		}
		assertValidBoundValue(value, 'upperBound');
		this.definition.upperBound = value;
		this.upperBoundSet = true;
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

	tierTrack(track: ResourceTierTrack) {
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

	boundOf(resourceId: string, boundType: ResourceBoundType) {
		if (this.boundOfSet) {
			throw new Error(`${builderName} already configured boundOf(). Remove the duplicate call.`);
		}
		if (!resourceId) {
			throw new Error(`${builderName} boundOf() requires a non-empty resourceId.`);
		}
		if (boundType !== 'upper' && boundType !== 'lower') {
			throw new Error(`${builderName} boundOf() requires boundType to be 'upper' or 'lower'.`);
		}
		this.definition.boundOf = { resourceId, boundType };
		this.boundOfSet = true;
		return this;
	}

	build(): ResourceDefinition {
		if (!this.definition.label) {
			throw new Error(`${builderName} is missing label(). Call label('Readable label') before build().`);
		}
		if (!this.definition.icon) {
			throw new Error(`${builderName} is missing icon(). Call icon('icon-id') before build().`);
		}
		return this.definition as ResourceDefinition;
	}
}

export function resource(id: string): ResourceBuilder {
	return new ResourceBuilderImpl(id);
}
