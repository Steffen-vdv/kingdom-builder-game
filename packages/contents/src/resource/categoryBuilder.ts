import type { ResourceCategoryDefinition, ResourceCategoryItem } from './types';

const builderName = 'Resource category builder';

function assertInteger(value: number, field: 'order') {
	if (!Number.isInteger(value)) {
		throw new Error(`${builderName} expected ${field} to be an integer but received ${value}.`);
	}
}

export interface ResourceCategoryBuilder {
	label(label: string): this;
	icon(icon: string): this;
	description(description: string): this;
	order(order: number): this;
	/**
	 * Marks this category as primary. Primary categories always show all their
	 * resources. Non-primary categories only show resources that have been
	 * "touched" (value has ever been non-zero).
	 */
	primary(): this;
	resource(id: string): this;
	group(id: string): this;
	build(): ResourceCategoryDefinition;
}

class ResourceCategoryBuilderImpl implements ResourceCategoryBuilder {
	private readonly definition: Partial<ResourceCategoryDefinition> & {
		id: string;
	};
	private readonly contents: ResourceCategoryItem[] = [];
	private labelSet = false;
	private iconSet = false;
	private descriptionSet = false;
	private orderSet = false;
	private primarySet = false;

	constructor(id: string) {
		if (!id) {
			throw new Error('Resource category builder requires a non-empty id.');
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
		this.definition.icon = icon;
		this.iconSet = true;
		return this;
	}

	description(description: string) {
		if (this.descriptionSet) {
			throw new Error(`${builderName} already has description() set. Remove the duplicate call.`);
		}
		this.definition.description = description;
		this.descriptionSet = true;
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

	primary() {
		if (this.primarySet) {
			throw new Error(`${builderName} already has primary() set. Remove the duplicate call.`);
		}
		this.definition.isPrimary = true;
		this.primarySet = true;
		return this;
	}

	resource(id: string) {
		if (!id) {
			throw new Error(`${builderName} resource() requires a non-empty id.`);
		}
		this.contents.push({ type: 'resource', id });
		return this;
	}

	group(id: string) {
		if (!id) {
			throw new Error(`${builderName} group() requires a non-empty id.`);
		}
		this.contents.push({ type: 'group', id });
		return this;
	}

	build(): ResourceCategoryDefinition {
		if (!this.definition.label) {
			throw new Error(`${builderName} is missing label(). Call label('Readable label') before build().`);
		}
		if (this.contents.length === 0) {
			throw new Error(`${builderName} has no contents. ` + `Call resource() or group() at least once before build().`);
		}
		return {
			...this.definition,
			contents: Object.freeze([...this.contents]),
		} as ResourceCategoryDefinition;
	}
}

export function resourceCategory(id: string): ResourceCategoryBuilder {
	return new ResourceCategoryBuilderImpl(id);
}
