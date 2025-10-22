import type { ResourceV2GroupDefinition, ResourceV2GroupParent } from './types';

const builderName = 'ResourceV2 group builder';

type ParentMetadata = Pick<
	ResourceV2GroupParent,
	'id' | 'label' | 'icon' | 'description'
>;

function assertInteger(value: number, field: 'order') {
	if (!Number.isInteger(value)) {
		throw new Error(
			`${builderName} expected ${field} to be an integer but received ${value}.`,
		);
	}
}

export interface ResourceGroupBuilder {
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

	constructor(id: string) {
		if (!id) {
			throw new Error('ResourceV2 group builder requires a non-empty id.');
		}
		this.definition = { id };
	}

	order(order: number) {
		if (this.orderSet) {
			throw new Error(
				`${builderName} already has order() set. Remove the duplicate call.`,
			);
		}
		assertInteger(order, 'order');
		this.definition.order = order;
		this.orderSet = true;
		return this;
	}

	parent(metadata: ParentMetadata) {
		if (this.parentSet) {
			throw new Error(
				`${builderName} already has parent() set. Remove the duplicate call.`,
			);
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
		this.definition.parent = description
			? { id, label, icon, description }
			: { id, label, icon };
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
