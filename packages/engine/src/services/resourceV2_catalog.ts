import { getResourceV2Catalog } from '../state';
import type { ResourceV2Key } from '../state';
import type {
	ResourceV2RuntimeCatalog,
	ResourceV2RuntimeGroupParent,
} from '../resourcesV2';

export class ResourceV2CatalogCache {
	private catalog: ResourceV2RuntimeCatalog | undefined;
	private parentChildren: Map<ResourceV2Key, ResourceV2Key[]> = new Map();

	ensure(): ResourceV2RuntimeCatalog | undefined {
		const catalog = getResourceV2Catalog();
		if (catalog === this.catalog) {
			return catalog;
		}
		this.catalog = catalog;
		this.parentChildren = new Map();
		if (!catalog) {
			return catalog;
		}
		for (const group of Object.values(catalog.groupsById)) {
			if (!group.parent) {
				continue;
			}
			const existing = this.parentChildren.get(group.parent.id) ?? [];
			existing.push(...group.children);
			this.parentChildren.set(group.parent.id, existing);
		}
		return catalog;
	}

	childrenOf(parentId: ResourceV2Key): ResourceV2Key[] {
		this.ensure();
		return this.parentChildren.get(parentId) ?? [];
	}

	parentDefinition(
		parentId: ResourceV2Key,
	): ResourceV2RuntimeGroupParent | undefined {
		return this.ensure()?.parentsById[parentId];
	}
}
