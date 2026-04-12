import type { EffectDef } from '@boardsmith/protocol';
import type {
	ResourceBoundType,
	ResourceBoundValue,
	ResourceDefinition,
	ResourceDisplayHint,
	ResourceSection,
	ResourceTierTrack,
} from './types';
import type {
	ResourceBuilder,
	ResourceGroupOptions,
} from './resourceBuilderTypes';
import {
	assertInteger,
	assertPositiveInteger,
	assertValidBoundValue,
} from './resourceBuilderValidators';

export type { ResourceBuilder, ResourceGroupOptions };

const builderName = 'Resource builder';

class ResourceBuilderImpl implements ResourceBuilder {
	private readonly definition: Partial<ResourceDefinition> & { id: string };
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
	private boundOfSet = false;
	private upkeepSet = false;
	private onPayUpkeepStepSet = false;
	private onGainIncomeStepSet = false;
	private onGainAPStepSet = false;

	constructor(id: string) {
		if (!id) {
			throw new Error('Resource builder requires a non-empty id.');
		}
		this.definition = { id };
	}

	private setOnce<K extends keyof ResourceDefinition>(
		key: K,
		value: ResourceDefinition[K],
	) {
		if (this.setKeys.has(key as string)) {
			throw new Error(
				`${builderName} already has ${String(key)}() set. ` +
					'Remove the duplicate call.',
			);
		}
		this.definition[key] = value;
		this.setKeys.add(key as string);
	}

	private setToggle(
		key:
			| 'displayAsPercent'
			| 'allowDecimal'
			| 'trackValueBreakdown'
			| 'trackBoundBreakdown',
		value: boolean,
	) {
		if (this.setToggles.has(key)) {
			throw new Error(
				`${builderName} already toggled ${key}(). ` +
					'Remove the duplicate call.',
			);
		}
		this.definition[key] = value;
		this.setToggles.add(key);
	}

	private validateBounds() {
		const { lowerBound, upperBound } = this.definition;
		if (
			typeof lowerBound === 'number' &&
			typeof upperBound === 'number' &&
			lowerBound > upperBound
		) {
			throw new Error(
				`${builderName} lowerBound must be <= upperBound ` +
					`(${lowerBound} > ${upperBound}).`,
			);
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
		this.setToggle('displayAsPercent', enabled ?? true);
		return this;
	}

	allowDecimal(enabled = true) {
		this.setToggle('allowDecimal', enabled ?? true);
		return this;
	}

	lowerBound(value: ResourceBoundValue) {
		if (this.lowerBoundSet) {
			throw new Error(
				`${builderName} already has lowerBound() set. ` +
					'Remove the duplicate call.',
			);
		}
		assertValidBoundValue(value, 'lowerBound');
		this.definition.lowerBound = value;
		this.lowerBoundSet = true;
		this.validateBounds();
		return this;
	}

	upperBound(value: ResourceBoundValue) {
		if (this.upperBoundSet) {
			throw new Error(
				`${builderName} already has upperBound() set. ` +
					'Remove the duplicate call.',
			);
		}
		assertValidBoundValue(value, 'upperBound');
		this.definition.upperBound = value;
		this.upperBoundSet = true;
		this.validateBounds();
		return this;
	}

	trackValueBreakdown(enabled = true) {
		this.setToggle('trackValueBreakdown', enabled ?? true);
		return this;
	}

	trackBoundBreakdown(enabled = true) {
		this.setToggle('trackBoundBreakdown', enabled ?? true);
		return this;
	}

	group(id: string, options?: ResourceGroupOptions) {
		if (this.groupSet) {
			throw new Error(
				`${builderName} already configured group(). ` +
					'Remove the duplicate call.',
			);
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
			throw new Error(
				`${builderName} already configured tags(). ` +
					'Remove the duplicate call.',
			);
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
			throw new Error(
				`${builderName} already configured tierTrack(). ` +
					'Remove the duplicate call.',
			);
		}
		this.definition.tierTrack = track;
		this.tierTrackSet = true;
		return this;
	}

	globalActionCost(amount: number) {
		if (this.globalCostSet) {
			throw new Error(
				`${builderName} already configured globalActionCost(). ` +
					'Remove the duplicate call.',
			);
		}
		assertPositiveInteger(amount, 'globalCost.amount');
		this.definition.globalCost = { amount };
		this.globalCostSet = true;
		return this;
	}

	onValueIncrease(...effects: EffectDef[]) {
		if (this.onValueIncreaseSet) {
			throw new Error(
				`${builderName} already configured onValueIncrease(). ` +
					'Remove the duplicate call.',
			);
		}
		this.definition.onValueIncrease = effects;
		this.onValueIncreaseSet = true;
		return this;
	}

	onValueDecrease(...effects: EffectDef[]) {
		if (this.onValueDecreaseSet) {
			throw new Error(
				`${builderName} already configured onValueDecrease(). ` +
					'Remove the duplicate call.',
			);
		}
		this.definition.onValueDecrease = effects;
		this.onValueDecreaseSet = true;
		return this;
	}

	boundOf(resourceId: string, boundType: ResourceBoundType) {
		if (this.boundOfSet) {
			throw new Error(
				`${builderName} already configured boundOf(). ` +
					'Remove the duplicate call.',
			);
		}
		if (!resourceId) {
			throw new Error(
				`${builderName} boundOf() requires a non-empty resourceId.`,
			);
		}
		if (boundType !== 'upper' && boundType !== 'lower') {
			throw new Error(
				`${builderName} boundOf() requires boundType 'upper' or 'lower'.`,
			);
		}
		this.definition.boundOf = { resourceId, boundType };
		this.boundOfSet = true;
		return this;
	}

	upkeep(resourceId: string, amount: number) {
		if (this.upkeepSet) {
			throw new Error(
				`${builderName} already configured upkeep(). ` +
					'Remove the duplicate call.',
			);
		}
		if (!resourceId) {
			throw new Error(
				`${builderName} upkeep() requires a non-empty resourceId.`,
			);
		}
		if (typeof amount !== 'number' || amount <= 0) {
			throw new Error(`${builderName} upkeep() requires a positive amount.`);
		}
		this.definition.upkeep = { resourceId, amount };
		this.upkeepSet = true;
		return this;
	}

	onPayUpkeepStep(...effects: EffectDef[]) {
		if (this.onPayUpkeepStepSet) {
			throw new Error(
				`${builderName} already configured onPayUpkeepStep(). ` +
					'Remove the duplicate call.',
			);
		}
		this.definition.onPayUpkeepStep = effects;
		this.onPayUpkeepStepSet = true;
		return this;
	}

	onGainIncomeStep(...effects: EffectDef[]) {
		if (this.onGainIncomeStepSet) {
			throw new Error(
				`${builderName} already configured onGainIncomeStep(). ` +
					'Remove the duplicate call.',
			);
		}
		this.definition.onGainIncomeStep = effects;
		this.onGainIncomeStepSet = true;
		return this;
	}

	onGainAPStep(...effects: EffectDef[]) {
		if (this.onGainAPStepSet) {
			throw new Error(
				`${builderName} already configured onGainAPStep(). ` +
					'Remove the duplicate call.',
			);
		}
		this.definition.onGainAPStep = effects;
		this.onGainAPStepSet = true;
		return this;
	}

	section(section: ResourceSection) {
		if (section !== 'economy' && section !== 'combat') {
			throw new Error(
				`${builderName} section() requires 'economy' or 'combat'.`,
			);
		}
		this.setOnce('section', section);
		return this;
	}

	secondary(enabled = true) {
		this.setOnce('secondary', enabled ?? true);
		return this;
	}

	displayHint(hint: ResourceDisplayHint) {
		if (!hint || typeof hint !== 'string') {
			throw new Error(
				`${builderName} displayHint() requires a valid CSS color string.`,
			);
		}
		this.setOnce('displayHint', hint);
		return this;
	}

	build(): ResourceDefinition {
		if (!this.definition.label) {
			throw new Error(
				`${builderName} is missing label(). ` +
					"Call label('Readable label') before build().",
			);
		}
		if (!this.definition.icon) {
			throw new Error(
				`${builderName} is missing icon(). ` +
					"Call icon('icon-id') before build().",
			);
		}
		return this.definition as ResourceDefinition;
	}
}

export function resource(id: string): ResourceBuilder {
	return new ResourceBuilderImpl(id);
}
