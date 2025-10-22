import type { PlayerState } from '../state';
import type {
	RuntimeResourceCatalog,
	RuntimeResourceDefinition,
	RuntimeResourceGroupParent,
	RuntimeResourceTierDefinition,
} from './types';

export interface ResourceNodeBase {
	readonly id: string;
	readonly tiers: readonly RuntimeResourceTierDefinition[];
}

export interface ResourceNodeResource extends ResourceNodeBase {
	readonly kind: 'resource';
	readonly definition: RuntimeResourceDefinition;
	readonly groupId: string | null;
	parentId: string | null;
}

export interface ResourceNodeParent extends ResourceNodeBase {
	readonly kind: 'parent';
	readonly definition: RuntimeResourceGroupParent;
	readonly groupId: string;
	readonly childIds: readonly string[];
}

export type ResourceNode = ResourceNodeResource | ResourceNodeParent;

export type ResourceNodeMap = Map<string, ResourceNode>;

export type ChildToParentIndex = Map<string, string>;

export interface NodeIndex {
	readonly nodes: ResourceNodeMap;
	readonly childToParent: ChildToParentIndex;
	readonly resourceNodes: readonly ResourceNodeResource[];
	readonly parentNodes: readonly ResourceNodeParent[];
}

function sortTiers(
	track: readonly RuntimeResourceTierDefinition[] | undefined,
): readonly RuntimeResourceTierDefinition[] {
	if (!track || track.length === 0) {
		return [];
	}
	return [...track].sort(
		(first, second) => first.resolvedOrder - second.resolvedOrder,
	);
}

export function buildNodeIndex(catalog: RuntimeResourceCatalog): NodeIndex {
	const nodes: ResourceNodeMap = new Map();
	const childToParent: ChildToParentIndex = new Map();
	const resourceNodes: ResourceNodeResource[] = [];
	const parentNodes: ResourceNodeParent[] = [];
	const groupChildren = new Map<string, string[]>();

	for (const resource of catalog.resources.ordered) {
		const tiers = sortTiers(resource.tierTrack?.tiers);
		const node: ResourceNodeResource = {
			id: resource.id,
			kind: 'resource',
			definition: resource,
			tiers,
			groupId: resource.groupId,
			parentId: null,
		};
		nodes.set(resource.id, node);
		resourceNodes.push(node);
		if (resource.groupId) {
			const children = groupChildren.get(resource.groupId) ?? [];
			children.push(resource.id);
			groupChildren.set(resource.groupId, children);
		}
	}

	for (const group of catalog.groups.ordered) {
		const parent = group.parent;
		if (!parent) {
			continue;
		}
		const tiers = sortTiers(parent.tierTrack?.tiers);
		const childIds = Object.freeze([...(groupChildren.get(group.id) ?? [])]);
		const node: ResourceNodeParent = {
			id: parent.id,
			kind: 'parent',
			definition: parent,
			tiers,
			groupId: group.id,
			childIds,
		};
		nodes.set(parent.id, node);
		parentNodes.push(node);
		for (const childId of childIds) {
			childToParent.set(childId, parent.id);
			const childNode = nodes.get(childId);
			if (childNode && childNode.kind === 'resource') {
				childNode.parentId = parent.id;
			}
		}
	}

	return {
		nodes,
		childToParent,
		resourceNodes: Object.freeze(resourceNodes),
		parentNodes: Object.freeze(parentNodes),
	};
}

export function getDefaultBounds(node: ResourceNode): {
	lower: number | null;
	upper: number | null;
} {
	return {
		lower: node.definition.lowerBound,
		upper: node.definition.upperBound,
	};
}

export function sumChildValues(
	player: PlayerState,
	childIds: readonly string[],
): number {
	let total = 0;
	for (const childId of childIds) {
		total += player.resourceValues[childId] ?? 0;
	}
	return total;
}
