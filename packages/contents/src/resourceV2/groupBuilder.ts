import type { ResourceV2GroupDefinition, ResourceV2GroupParent } from './types';

const builderName = 'ResourceV2 group builder';

type ParentMetadata = Pick<ResourceV2GroupParent, 'id' | 'label' | 'icon' | 'description'>;

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
	build(): ResourceV2GroupDefinition;
}

class ResourceGroupBuilderImpl implements ResourceGroupBuilder {
	private readonly definition: Partial<ResourceV2GroupDefinition> & {
		id: string;
	};
	private parentSet = false;
	private orderSet = false;
	private labelSet = false;
	private iconSet = false;

	constructor(id: string) {
		if (!id) {
			throw new Error('ResourceV2 group builder requires a non-empty id.');
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

		const { id, label, icon, description } = metadata;
		this.definition.parent = description ? { id, label, icon, description } : { id, label, icon };
		this.parentSet = true;
		return this;
	}

	build(): ResourceV2GroupDefinition {
		return this.definition;
	}
}

export function resourceGroup(id: string): ResourceGroupBuilder {
	return new ResourceGroupBuilderImpl(id);
}
