import type { ResourceGroupDefinition, ResourceGroupParent } from './types';

const builderName = 'Resource group builder';

/**
 * Parent metadata including optional bounds.
 * Bounds can be static numbers or dynamic references to other resources.
 */
type ParentMetadata = Pick<ResourceGroupParent, 'id' | 'label' | 'icon' | 'description' | 'lowerBound' | 'upperBound'>;

function assertInteger(value: number, field: 'order') {
	if (!Number.isInteger(value)) {
		throw new Error(`${builderName} expected ${field} to be an integer but received ${value}.`);
	}
}

export interface ResourceGroupBuilder {
	/** Display label for the group in the resource bar (falls back to parent.label) */
	label(label: string): this;
	/** Display icon for the group in the resource bar (falls back to parent.icon) */
	icon(icon: string): this;
	order(order: number): this;
	parent(metadata: ParentMetadata): this;
	build(): ResourceGroupDefinition;
}

class ResourceGroupBuilderImpl implements ResourceGroupBuilder {
	private readonly definition: Partial<ResourceGroupDefinition> & {
		id: string;
	};
	private parentSet = false;
	private orderSet = false;
	private labelSet = false;
	private iconSet = false;

	constructor(id: string) {
		if (!id) {
			throw new Error('Resource group builder requires a non-empty id.');
		}
		this.definition = { id };
	}

	label(label: string) {
		if (this.labelSet) {
			throw new Error(`${builderName} already has label() set. Remove the duplicate call.`);
		}
		if (!label) {
			throw new Error(`${builderName} label() requires a non-empty string.`);
		}
		this.definition.label = label;
		this.labelSet = true;
		return this;
	}

	icon(icon: string) {
		if (this.iconSet) {
			throw new Error(`${builderName} already has icon() set. Remove the duplicate call.`);
		}
		if (!icon) {
			throw new Error(`${builderName} icon() requires a non-empty string.`);
		}
		this.definition.icon = icon;
		this.iconSet = true;
		return this;
	}

	order(order: number) {
		if (this.orderSet) {
			throw new Error(`${builderName} already has order() set. Remove the duplicate call.`);
		}
		assertInteger(order, 'order');
		this.definition.order = order;
		this.orderSet = true;
		return this;
	}

	parent(metadata: ParentMetadata) {
		if (this.parentSet) {
			throw new Error(`${builderName} already has parent() set. Remove the duplicate call.`);
		}
		if (!metadata?.id) {
			throw new Error(`${builderName} parent() requires a non-empty id.`);
		}
		if (!metadata?.label) {
			throw new Error(`${builderName} parent() requires a non-empty label.`);
		}
		if (!metadata?.icon) {
			throw new Error(`${builderName} parent() requires a non-empty icon.`);
		}

		const { id, label, icon, description, lowerBound, upperBound } = metadata;
		const parent: ResourceGroupParent = { id, label, icon };
		if (description !== undefined) {
			parent.description = description;
		}
		if (lowerBound !== undefined) {
			parent.lowerBound = lowerBound;
		}
		if (upperBound !== undefined) {
			parent.upperBound = upperBound;
		}
		this.definition.parent = parent;
		this.parentSet = true;
		return this;
	}

	build(): ResourceGroupDefinition {
		return this.definition;
	}
}

export function resourceGroup(id: string): ResourceGroupBuilder {
	return new ResourceGroupBuilderImpl(id);
}
