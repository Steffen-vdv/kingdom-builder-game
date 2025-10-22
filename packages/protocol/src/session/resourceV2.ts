import type {
	ResourceV2BoundsConfig,
	ResourceV2DefinitionConfig,
	ResourceV2GroupDefinitionConfig,
	ResourceV2GroupParentConfig,
	ResourceV2TierStepConfig,
	ResourceV2TierTrackConfig,
} from '../resourceV2/definitions';

export interface SessionResourceValueBoundsSnapshot {
	lower?: number;
	upper?: number;
}

export interface SessionResourceValueSnapshot {
	value: number;
	touched: boolean;
	bounds?: SessionResourceValueBoundsSnapshot;
}

export type SessionResourceValueMap = Record<
	string,
	SessionResourceValueSnapshot
>;

export interface SessionResourceRecentGain {
	key: string;
	amount: number;
}

export interface SessionResourceValueDescriptor {
	key: string;
	icon: string;
	label: string;
	description: string;
	order: number;
	groupId?: string;
	percent?: boolean;
	tags?: string[];
	bounds?: ResourceV2BoundsConfig;
}

export interface SessionResourceValueMetadataSnapshot {
	descriptor: SessionResourceValueDescriptor;
	tier?: SessionResourceTierSnapshot;
	globalActionCost?: SessionResourceGlobalCostReference;
}

export type SessionResourceValueMetadataMap = Record<
	string,
	SessionResourceValueMetadataSnapshot
>;

export type SessionResourceGroupParentSnapshot = Omit<
	ResourceV2GroupParentConfig,
	'limited'
>;

export interface SessionResourceGroupSnapshot
	extends Omit<ResourceV2GroupDefinitionConfig, 'parent'> {
	parent: SessionResourceGroupParentSnapshot;
	members: string[];
	order: number;
}

export type SessionResourceGroupMap = Record<
	string,
	SessionResourceGroupSnapshot
>;

export type SessionResourceTierStepSnapshot = Pick<
	ResourceV2TierStepConfig,
	'id' | 'min' | 'max'
> & {
	active: boolean;
	display?: ResourceV2TierStepConfig['display'];
};

export type SessionResourceTierSnapshot = Pick<
	ResourceV2TierTrackConfig,
	'id' | 'display'
> & {
	currentStepId?: string;
	steps: SessionResourceTierStepSnapshot[];
};

export type SessionResourceTierMap = Record<
	string,
	SessionResourceTierSnapshot
>;

export interface SessionResourceMetadataSnapshot {
	values: SessionResourceValueMetadataMap;
	groups: SessionResourceGroupMap;
	tiers: SessionResourceTierMap;
	orderedDisplay: SessionResourceDisplayNode[];
	recentGains: SessionResourceRecentGain[];
}

export interface SessionResourceGlobalCostReference {
	resourceId: string;
	amount: number;
}

export type SessionResourceRegistryDefinitions = Record<
	string,
	ResourceV2DefinitionConfig
>;

export type SessionResourceRegistryGroups = Record<
	string,
	ResourceV2GroupDefinitionConfig
>;

export interface SessionResourceRegistryPayload {
	definitions: SessionResourceRegistryDefinitions;
	groups: SessionResourceRegistryGroups;
	globalCost?: SessionResourceGlobalCostReference;
}

export type SessionResourceDisplayNode =
	| {
			type: 'parent';
			key: string;
			parent: SessionResourceGroupParentSnapshot;
			group: SessionResourceGroupSnapshot;
	  }
	| {
			type: 'value';
			key: string;
			descriptor: SessionResourceValueDescriptor;
			group?: SessionResourceGroupSnapshot;
			tier?: SessionResourceTierSnapshot;
			globalCost?: SessionResourceGlobalCostReference;
	  };

function recordEntries<TKey extends string, TValue>(
	record: Record<TKey, TValue>,
): Array<[TKey, TValue]> {
	const entries: Array<[TKey, TValue]> = [];
	for (const key of Object.keys(record) as TKey[]) {
		entries.push([key, record[key]]);
	}
	return entries;
}

export function buildOrderedResourceDisplay(
	metadata: SessionResourceMetadataSnapshot,
): SessionResourceDisplayNode[] {
	const ordered: SessionResourceDisplayNode[] = [];
	const groupedMembers = new Set<string>();
	const groupEntries = recordEntries(metadata.groups);
	const groups = groupEntries
		.map(([, group]): SessionResourceGroupSnapshot => group)
		.sort((left, right) => left.order - right.order);
	const valueEntries = recordEntries(metadata.values);
	for (const group of groups) {
		const parent: SessionResourceGroupParentSnapshot = group.parent;
		ordered.push({
			type: 'parent',
			key: String(parent.id),
			parent,
			group,
		});
		const members = [...group.members].sort((left, right) => {
			const leftMetadata = metadata.values[left];
			const rightMetadata = metadata.values[right];
			const leftOrder = leftMetadata?.descriptor.order ?? 0;
			const rightOrder = rightMetadata?.descriptor.order ?? 0;
			return leftOrder - rightOrder;
		});
		for (const member of members) {
			groupedMembers.add(member);
			const value = metadata.values[member];
			if (!value) {
				continue;
			}
			const node: SessionResourceDisplayNode = {
				type: 'value',
				key: member,
				descriptor: value.descriptor,
				group,
			};
			if (value.tier) {
				node.tier = value.tier;
			}
			if (value.globalActionCost) {
				node.globalCost = value.globalActionCost;
			}
			ordered.push(node);
		}
	}
	const standaloneKeys = valueEntries
		.map(([key]) => key)
		.filter((key) => !groupedMembers.has(key))
		.sort((left, right) => {
			const leftMetadata = metadata.values[left];
			const rightMetadata = metadata.values[right];
			const leftOrder = leftMetadata?.descriptor.order ?? 0;
			const rightOrder = rightMetadata?.descriptor.order ?? 0;
			return leftOrder - rightOrder;
		});
	for (const key of standaloneKeys) {
		const value = metadata.values[key];
		if (!value) {
			continue;
		}
		const node: SessionResourceDisplayNode = {
			type: 'value',
			key,
			descriptor: value.descriptor,
		};
		if (value.tier) {
			node.tier = value.tier;
		}
		if (value.globalActionCost) {
			node.globalCost = value.globalActionCost;
		}
		ordered.push(node);
	}
	return ordered;
}
