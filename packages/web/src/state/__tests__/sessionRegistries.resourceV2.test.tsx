/* @vitest-environment jsdom */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type {
	ResourceV2Definition,
	ResourceV2GlobalActionCost,
	ResourceV2GroupMetadata,
} from '@kingdom-builder/protocol';
import type {
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SessionResourceV2GroupParentSnapshot,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
	SessionMetadataDescriptor,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { describe, expect, it } from 'vitest';
import {
	RegistryMetadataProvider,
	useOrderedResourceGroupIds,
	useOrderedResourceIds,
	useResourceGroupMetadata,
	useResourceGroupParentMetadata,
	useResourceMetadata,
	useResourceParentMap,
} from '../../contexts/RegistryMetadataContext';
import {
	useDefinitionLookups,
	useDescriptorOverrides,
	useMetadataLookups,
} from '../../contexts/registryMetadataHooks';
import { deserializeSessionRegistries } from '../sessionRegistries';

interface ResourceV2TestSetup {
	readonly payload: SessionRegistriesPayload;
	readonly resource: ResourceV2Definition;
	readonly group: ResourceV2GroupMetadata;
	readonly parentId: string;
}

const createLegacyResourceDefinition = (
	definition: ResourceV2Definition,
): SessionResourceDefinition => {
	const legacy: SessionResourceDefinition = { key: definition.id };
	if (definition.name) {
		legacy.label = definition.name;
	}
	if (definition.icon) {
		legacy.icon = definition.icon;
	}
	if (definition.description) {
		legacy.description = definition.description;
	}
	return legacy;
};

function clone<TValue>(value: TValue): TValue {
	return JSON.parse(JSON.stringify(value)) as TValue;
}

const createResourceV2TestSetup = (): ResourceV2TestSetup => {
	const parentId = 'resource-v2-parent';
	const group: ResourceV2GroupMetadata = {
		id: 'resource-v2-group',
		name: 'Core Vaults',
		order: 0,
		children: ['resource-v2-refined'],
		parent: {
			id: parentId,
			name: 'Aggregated Reserves',
			order: 0,
			relation: 'sumOfAll',
			isPercent: true,
			trackValueBreakdown: true,
			trackBoundBreakdown: false,
		},
	};
	const resource: ResourceV2Definition = {
		id: 'resource-v2-refined',
		name: 'Refined Essence',
		order: 1,
		icon: '✨',
		description: 'A condensed form of magical energy.',
		groupId: group.id,
		isPercent: true,
		trackValueBreakdown: true,
		trackBoundBreakdown: true,
		lowerBound: 0,
		upperBound: 100,
		tierTrack: {
			id: 'refined-essence-track',
			title: 'Refinement Tiers',
			description: 'Progress through essence mastery.',
			tiers: [
				{
					id: 'refined-tier-one',
					range: { min: 0, max: 25 },
					display: { icon: '🥉', title: 'Coalesced' },
				},
			],
		},
		globalActionCost: { amount: 2 } satisfies ResourceV2GlobalActionCost,
	};
	const payload: SessionRegistriesPayload = {
		actions: {},
		buildings: {},
		developments: {},
		populations: {},
		resources: {
			[resource.id]: createLegacyResourceDefinition(resource),
		},
		resourcesV2: { [resource.id]: resource },
		resourceGroups: { [group.id]: group },
	};
	return {
		payload,
		resource,
		group,
		parentId,
	};
};

const createMetadata = (
	resource: ResourceV2Definition,
	group: ResourceV2GroupMetadata,
): SessionSnapshotMetadata => {
	const parentSnapshot: SessionResourceV2GroupParentSnapshot | undefined =
		group.parent
			? (() => {
					const parent: SessionResourceV2GroupParentSnapshot = {
						id: group.parent.id,
						name: group.parent.name,
						order: group.parent.order,
						relation: group.parent.relation ?? 'sumOfAll',
						isPercent: group.parent.isPercent ?? false,
						trackValueBreakdown: group.parent.trackValueBreakdown ?? false,
						trackBoundBreakdown: group.parent.trackBoundBreakdown ?? false,
					};
					if (group.parent.metadata) {
						parent.metadata = clone(group.parent.metadata);
					}
					if (group.parent.limited !== undefined) {
						parent.limited = group.parent.limited;
					}
					if (group.parent.icon) {
						parent.icon = group.parent.icon;
					}
					if (group.parent.description) {
						parent.description = group.parent.description;
					}
					if (group.parent.lowerBound !== undefined) {
						parent.lowerBound = group.parent.lowerBound;
					}
					if (group.parent.upperBound !== undefined) {
						parent.upperBound = group.parent.upperBound;
					}
					if (group.parent.tierTrack) {
						parent.tierTrack = clone(group.parent.tierTrack);
					}
					return parent;
				})()
			: undefined;

	const groupSnapshot: SessionResourceV2GroupSnapshot = {
		id: group.id,
		name: group.name,
		order: group.order,
		children: [...group.children],
	};
	if (group.metadata) {
		groupSnapshot.metadata = clone(group.metadata);
	}
	if (group.icon) {
		groupSnapshot.icon = group.icon;
	}
	if (group.description) {
		groupSnapshot.description = group.description;
	}
	if (parentSnapshot) {
		groupSnapshot.parent = parentSnapshot;
	}

	const resourceSnapshot: SessionResourceV2MetadataSnapshot = {
		id: resource.id,
		name: resource.name,
		order: resource.order,
		isPercent: resource.isPercent ?? false,
		trackValueBreakdown: resource.trackValueBreakdown ?? false,
		trackBoundBreakdown: resource.trackBoundBreakdown ?? false,
	};
	if (resource.icon) {
		resourceSnapshot.icon = resource.icon;
	}
	if (resource.description) {
		resourceSnapshot.description = resource.description;
	}
	if (resource.metadata) {
		resourceSnapshot.metadata = clone(resource.metadata);
	}
	if (resource.limited !== undefined) {
		resourceSnapshot.limited = resource.limited;
	}
	if (resource.groupId) {
		resourceSnapshot.groupId = resource.groupId;
	}
	if (parentSnapshot) {
		resourceSnapshot.parentId = parentSnapshot.id;
	}
	if (resource.lowerBound !== undefined) {
		resourceSnapshot.lowerBound = resource.lowerBound;
	}
	if (resource.upperBound !== undefined) {
		resourceSnapshot.upperBound = resource.upperBound;
	}
	if (resource.tierTrack) {
		resourceSnapshot.tierTrack = clone(resource.tierTrack);
	}
	if (resource.globalActionCost) {
		resourceSnapshot.globalActionCost = clone(resource.globalActionCost);
	}

	const resourceDescriptor: SessionMetadataDescriptor = {
		label: resource.name,
	};
	if (resource.icon) {
		resourceDescriptor.icon = resource.icon;
	}
	if (resource.description) {
		resourceDescriptor.description = resource.description;
	}
	resourceDescriptor.displayAsPercent = true;

	const resourceMetadata: Record<string, SessionResourceV2MetadataSnapshot> = {
		[resource.id]: resourceSnapshot,
	};
	const resourceGroups: Record<string, SessionResourceV2GroupSnapshot> = {
		[group.id]: groupSnapshot,
	};
	const resources: Record<string, SessionMetadataDescriptor> = {
		[resource.id]: resourceDescriptor,
	};
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		resources,
		populations: {},
		buildings: {},
		developments: {},
		stats: {},
		phases: {},
		triggers: {},
		assets: {
			land: { label: 'Land', icon: '🌍' },
			slot: { label: 'Slot', icon: '🧱' },
			passive: { label: 'Passive', icon: '✨' },
		},
		overview: {
			hero: { title: 'Overview', tokens: {} },
			sections: [],
			tokens: {},
		},
		resourceMetadata,
		resourceGroups,
		orderedResourceIds: [resource.id],
		orderedResourceGroupIds: [group.id],
		parentIdByResourceId: parentSnapshot
			? { [resource.id]: parentSnapshot.id }
			: {},
	};
	if (parentSnapshot) {
		metadata.resourceGroupParents = {
			[parentSnapshot.id]: parentSnapshot,
		} satisfies Record<string, SessionResourceV2GroupParentSnapshot>;
	}
	return metadata;
};

describe('Session ResourceV2 registries', () => {
	it('clones ResourceV2 definitions and groups during deserialization', () => {
		const setup = createResourceV2TestSetup();
		const registries = deserializeSessionRegistries(setup.payload);
		const { resourcesV2, resourceGroups } = setup.payload;
		if (!resourcesV2 || !resourceGroups) {
			throw new Error('Expected ResourceV2 payload entries.');
		}
		const resourceEntry = resourcesV2[setup.resource.id];
		const groupEntry = resourceGroups[setup.group.id];
		if (!resourceEntry || !groupEntry) {
			throw new Error('Expected ResourceV2 resource and group entries.');
		}
		const originalName = resourceEntry.name;
		const originalGroupName = groupEntry.name;
		resourceEntry.name = 'Altered';
		groupEntry.name = 'Adjusted';
		const clonedResource = registries.resourcesV2[setup.resource.id];
		const clonedGroup = registries.resourceGroups[setup.group.id];
		if (!clonedResource || !clonedGroup) {
			throw new Error('Expected cloned ResourceV2 registry entries.');
		}
		expect(clonedResource.name).toBe(originalName);
		expect(clonedGroup.name).toBe(originalGroupName);
	});

	it('memoizes ResourceV2 definition lookups', () => {
		const setup = createResourceV2TestSetup();
		const registries = deserializeSessionRegistries(setup.payload);
		const { result, rerender } = renderHook(
			({ source }) => useDefinitionLookups(source),
			{ initialProps: { source: registries } },
		);
		const first = result.current;
		rerender({ source: registries });
		expect(result.current).toBe(first);
		expect(result.current.resourceV2Lookup).toBe(first.resourceV2Lookup);
		const updatedPayload = createResourceV2TestSetup();
		const updatedRegistries = deserializeSessionRegistries(
			updatedPayload.payload,
		);
		rerender({ source: updatedRegistries });
		expect(result.current).not.toBe(first);
	});

	it('exposes ResourceV2 metadata descriptors with ordering, parents, and tier data', () => {
		const setup = createResourceV2TestSetup();
		const metadata = createMetadata(setup.resource, setup.group);
		const registries = deserializeSessionRegistries(setup.payload);
		const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				{children}
			</RegistryMetadataProvider>
		);
		const { result } = renderHook(
			() => {
				const resourceMetadata = useResourceMetadata();
				const groupMetadata = useResourceGroupMetadata();
				const parentMetadata = useResourceGroupParentMetadata();
				const orderedResourceIds = useOrderedResourceIds();
				const orderedGroupIds = useOrderedResourceGroupIds();
				const parentMap = useResourceParentMap();
				return {
					resource: resourceMetadata.select(setup.resource.id),
					group: groupMetadata.select(setup.group.id),
					parent: parentMetadata.select(setup.parentId),
					orderedResourceIds,
					orderedGroupIds,
					parentMap,
				};
			},
			{ wrapper },
		);
		expect(result.current.resource.isPercent).toBe(true);
		expect(result.current.resource.trackValueBreakdown).toBe(true);
		expect(result.current.resource.trackBoundBreakdown).toBe(true);
		expect(result.current.resource.tierTrack).toBeDefined();
		expect(result.current.resource.groupId).toBe(setup.group.id);
		expect(result.current.parent).toBeDefined();
		expect(result.current.parent?.relation).toBe('sumOfAll');
		expect(result.current.parent?.isPercent).toBe(true);
		expect(result.current.group.children).toContain(setup.resource.id);
		expect(result.current.orderedResourceIds).toContain(setup.resource.id);
		expect(result.current.orderedGroupIds).toContain(setup.group.id);
		expect(result.current.parentMap[setup.resource.id]).toBe(setup.parentId);
	});

	it('memoizes metadata lookups for ResourceV2 overrides', () => {
		const setup = createResourceV2TestSetup();
		const metadata = createMetadata(setup.resource, setup.group);
		const registries = deserializeSessionRegistries(setup.payload);
		const { result, rerender } = renderHook(
			({ registries: source, metadata: meta }) => {
				const overrides = useDescriptorOverrides(meta);
				return useMetadataLookups(source, overrides);
			},
			{ initialProps: { registries, metadata } },
		);
		const first = result.current;
		rerender({ registries, metadata });
		expect(result.current).toBe(first);
		expect(result.current.resourceMetadataLookup).toBe(
			first.resourceMetadataLookup,
		);
	});
});
