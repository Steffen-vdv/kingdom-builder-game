import type {
	ResourceV2GroupMetadata,
	ResourceV2GroupParent,
} from '@kingdom-builder/protocol';

import { ResourceV2GroupParentBuilder } from './definition';

export class ResourceV2GroupBuilder {
	private readonly config: Partial<ResourceV2GroupMetadata> = { children: [] };
	private readonly assigned = new Set<string>();
	private readonly childIds = new Set<string>();
	private parentSet = false;

	constructor(id: string) {
		this.config.id = id;
		this.assigned.add('id');
	}

	private set<K extends keyof ResourceV2GroupMetadata>(
		key: K,
		value: ResourceV2GroupMetadata[K],
		message: string,
	) {
		const keyName = String(key);
		if (this.assigned.has(keyName)) {
			throw new Error(message);
		}
		this.config[key] = value;
		this.assigned.add(keyName);
		return this;
	}

	id(id: string) {
		if (this.assigned.has('id')) {
			throw new Error(
				'ResourceV2 group already set id(). Remove the duplicate id() call.',
			);
		}
		this.config.id = id;
		this.assigned.add('id');
		return this;
	}

	name(name: string) {
		return this.set(
			'name',
			name,
			'ResourceV2 group already set name(). Remove the duplicate name() call.',
		);
	}

	icon(icon: string) {
		return this.set(
			'icon',
			icon,
			'ResourceV2 group already set icon(). Remove the duplicate icon() call.',
		);
	}

	description(description: string) {
		return this.set(
			'description',
			description,
			'ResourceV2 group already set description(). Remove the duplicate call.',
		);
	}

	order(order: number) {
		return this.set(
			'order',
			order,
			'ResourceV2 group already set order(). Remove the duplicate order() call.',
		);
	}

	metadata(metadata: Record<string, unknown>) {
		return this.set(
			'metadata',
			{ ...(metadata || {}) },
			'ResourceV2 group already set metadata(). Remove the duplicate call.',
		);
	}

	parent(parent: ResourceV2GroupParent | ResourceV2GroupParentBuilder) {
		if (this.parentSet) {
			throw new Error(
				'ResourceV2 group already set parent(). Remove the duplicate parent() call.',
			);
		}
		this.config.parent =
			parent instanceof ResourceV2GroupParentBuilder ? parent.build() : parent;
		this.parentSet = true;
		return this;
	}

	child(resourceId: string) {
		if (this.childIds.has(resourceId)) {
			throw new Error(
				`ResourceV2 group already lists child "${resourceId}". Remove the duplicate child() call.`,
			);
		}
		const children = this.config.children || [];
		children.push(resourceId);
		this.config.children = children;
		this.childIds.add(resourceId);
		return this;
	}

	children(resourceIds: string[]) {
		for (const id of resourceIds) {
			this.child(id);
		}
		return this;
	}

	build(): ResourceV2GroupMetadata {
		if (!this.assigned.has('name')) {
			throw new Error(
				"ResourceV2 group is missing name(). Call name('Group name') before build().",
			);
		}
		if (!this.assigned.has('order')) {
			throw new Error(
				'ResourceV2 group is missing order(). Call order(n) before build().',
			);
		}
		if (!this.parentSet) {
			throw new Error(
				'ResourceV2 group must define parent() during MVP scope.',
			);
		}
		const children = this.config.children || [];
		if (!children.length) {
			throw new Error(
				'ResourceV2 group must list at least one child() before build().',
			);
		}
		return this.config as ResourceV2GroupMetadata;
	}
}
