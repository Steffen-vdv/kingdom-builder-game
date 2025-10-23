/* @vitest-environment jsdom */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type {
	ResourceV2Definition,
	ResourceV2GroupMetadata,
} from '@kingdom-builder/protocol';
import type {
	SessionRegistriesPayload,
	SessionResourceDefinition,
	SessionResourceV2GroupParentSnapshot,
	SessionResourceV2GroupSnapshot,
	SessionResourceV2MetadataSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { describe, expect, it } from 'vitest';
import {
	RegistryMetadataProvider,
	useOrderedResourceIds,
	useResourceGroupMetadata,
	useResourceGroupParentMetadata,
	useResourceMetadata,
	useResourceParentMap,
} from '../RegistryMetadataContext';
import { deserializeSessionRegistries } from '../../state/sessionRegistries';

interface ContextResourceSetup {
	readonly registries: ReturnType<typeof deserializeSessionRegistries>;
	readonly metadata: SessionSnapshotMetadata;
	readonly resources: {
		readonly orphan: ResourceV2Definition;
		readonly fire: ResourceV2Definition;
		readonly ice: ResourceV2Definition;
	};
	readonly group: ResourceV2GroupMetadata;
	readonly parentSnapshot: SessionResourceV2GroupParentSnapshot;
	readonly legacyStatId: string;
}

const createLegacyResource = (
	id: string,
	label: string,
	icon?: string,
	description?: string,
): SessionResourceDefinition => {
	const legacy: SessionResourceDefinition = { key: id };
	if (label) {
		legacy.label = label;
	}
	if (icon) {
		legacy.icon = icon;
	}
	if (description) {
		legacy.description = description;
	}
	return legacy;
};

const createContextSetup = (): ContextResourceSetup => {
	const groupParent: ResourceV2GroupMetadata['parent'] = {
		id: 'resource.parent.elemental',
		name: 'Elemental Totals',
		order: 0,
		relation: 'sumOfAll',
		isPercent: true,
		trackValueBreakdown: true,
		trackBoundBreakdown: false,
	};
	const group: ResourceV2GroupMetadata = {
		id: 'resource.group.elemental',
		name: 'Elemental Pools',
		order: 0,
		children: ['resource.fire', 'resource.ice'],
		parent: groupParent,
	};
	const parentSnapshot: SessionResourceV2GroupParentSnapshot = {
		id: groupParent.id,
		name: groupParent.name,
		order: groupParent.order,
		relation: groupParent.relation,
		isPercent: groupParent.isPercent ?? false,
		trackValueBreakdown: groupParent.trackValueBreakdown ?? false,
		trackBoundBreakdown: groupParent.trackBoundBreakdown ?? false,
	};
	const fire: ResourceV2Definition = {
		id: 'resource.fire',
		name: 'Fire Sigils',
		order: 1,
		icon: '🔥',
		description: 'Harnessed flame power.',
		groupId: group.id,
		isPercent: true,
		trackValueBreakdown: true,
	};
	const ice: ResourceV2Definition = {
		id: 'resource.ice',
		name: 'Frost Sigils',
		order: 2,
		icon: '❄️',
		description: 'Harnessed frost power.',
		groupId: group.id,
		isPercent: true,
	};
	const orphan: ResourceV2Definition = {
		id: 'resource.arcane',
		name: 'Arcane Dust',
		order: 3,
		icon: '🪄',
		description: 'Condensed magical residue.',
		trackValueBreakdown: false,
		trackBoundBreakdown: false,
	};
	const groupSnapshot: SessionResourceV2GroupSnapshot = {
		id: group.id,
		name: group.name,
		order: group.order,
		children: [...group.children],
		parent: parentSnapshot,
	};
	const fireSnapshot: SessionResourceV2MetadataSnapshot = {
		id: fire.id,
		name: fire.name,
		order: fire.order,
		icon: fire.icon!,
		description: fire.description!,
		isPercent: true,
		trackValueBreakdown: true,
		trackBoundBreakdown: false,
		groupId: group.id,
		parentId: parentSnapshot.id,
	};
	const iceSnapshot: SessionResourceV2MetadataSnapshot = {
		id: ice.id,
		name: ice.name,
		order: ice.order,
		icon: ice.icon!,
		description: ice.description!,
		isPercent: true,
		trackValueBreakdown: false,
		trackBoundBreakdown: false,
		groupId: group.id,
		parentId: parentSnapshot.id,
	};
	const orphanSnapshot: SessionResourceV2MetadataSnapshot = {
		id: orphan.id,
		name: orphan.name,
		order: orphan.order,
		icon: orphan.icon!,
		description: orphan.description!,
		isPercent: false,
		trackValueBreakdown: false,
		trackBoundBreakdown: false,
	};
	const legacyStatId = 'stat.morale';
	const payload: SessionRegistriesPayload = {
		actions: {},
		actionCategories: {},
		buildings: {},
		developments: {},
		populations: {},
		resources: {
			[fire.id]: createLegacyResource(
				fire.id,
				fire.name,
				fire.icon,
				fire.description,
			),
			[ice.id]: createLegacyResource(
				ice.id,
				ice.name,
				ice.icon,
				ice.description,
			),
			[orphan.id]: createLegacyResource(
				orphan.id,
				orphan.name,
				orphan.icon,
				orphan.description,
			),
		},
		resourcesV2: {
			[fire.id]: fire,
			[ice.id]: ice,
			[orphan.id]: orphan,
		},
		resourceGroups: {
			[group.id]: group,
		},
	};
	const registries = deserializeSessionRegistries(payload);
	const metadata: SessionSnapshotMetadata = {
		passiveEvaluationModifiers: {},
		resources: {
			[fire.id]: { label: fire.name },
			[ice.id]: { label: ice.name },
			[orphan.id]: { label: orphan.name },
		},
		populations: {},
		buildings: {},
		developments: {},
		stats: {
			[legacyStatId]: { label: 'Morale', icon: '🙂' },
		},
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
		resourceMetadata: {
			[fire.id]: fireSnapshot,
			[ice.id]: iceSnapshot,
			[orphan.id]: orphanSnapshot,
		},
		resourceGroups: {
			[group.id]: groupSnapshot,
		},
		resourceGroupParents: {
			[parentSnapshot.id]: parentSnapshot,
		},
		orderedResourceIds: [fire.id, ice.id, orphan.id, legacyStatId],
		orderedResourceGroupIds: [group.id],
		parentIdByResourceId: {
			[fire.id]: parentSnapshot.id,
			[ice.id]: parentSnapshot.id,
		},
	};
	return {
		registries,
		metadata,
		resources: { orphan, fire, ice },
		group,
		parentSnapshot,
		legacyStatId,
	};
};

describe('RegistryMetadataProvider ResourceV2 descriptors', () => {
	const setup = createContextSetup();
	const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
		<RegistryMetadataProvider
			registries={setup.registries}
			metadata={setup.metadata}
		>
			{children}
		</RegistryMetadataProvider>
	);

	it('resolves standalone ResourceV2 descriptors with metadata fallbacks', () => {
		const { result } = renderHook(
			() => {
				const resourceMetadata = useResourceMetadata();
				const orderedIds = useOrderedResourceIds();
				return {
					descriptor: resourceMetadata.select(setup.resources.orphan.id),
					orderedIds,
				};
			},
			{ wrapper },
		);
		expect(result.current.descriptor.label).toBe(setup.resources.orphan.name);
		expect(result.current.descriptor.icon).toBe(setup.resources.orphan.icon);
		expect(result.current.descriptor.description).toBe(
			setup.resources.orphan.description,
		);
		expect(result.current.descriptor.groupId).toBeUndefined();
		expect(result.current.descriptor.parentId).toBeUndefined();
		expect(result.current.orderedIds.slice(0, 3)).toEqual([
			setup.resources.fire.id,
			setup.resources.ice.id,
			setup.resources.orphan.id,
		]);
	});

	it('resolves grouped children descriptors and preserves parent ordering', () => {
		const { result } = renderHook(
			() => {
				const resourceMetadata = useResourceMetadata();
				const groupMetadata = useResourceGroupMetadata();
				const parentMetadata = useResourceGroupParentMetadata();
				const parentMap = useResourceParentMap();
				const orderedIds = useOrderedResourceIds();
				return {
					child: resourceMetadata.select(setup.resources.fire.id),
					group: groupMetadata.select(setup.group.id),
					parent: parentMetadata.select(setup.parentSnapshot.id),
					parentMap,
					orderedIds,
				};
			},
			{ wrapper },
		);
		expect(result.current.child.groupId).toBe(setup.group.id);
		expect(result.current.child.parentId).toBe(setup.parentSnapshot.id);
		expect(result.current.child.trackValueBreakdown).toBe(true);
		expect(result.current.group.children).toEqual(setup.group.children);
		expect(result.current.orderedIds.slice(0, 2)).toEqual(setup.group.children);
		expect(result.current.parent.relation).toBe('sumOfAll');
		expect(result.current.parent.isPercent).toBe(true);
		expect(result.current.parentMap[setup.resources.fire.id]).toBe(
			setup.parentSnapshot.id,
		);
	});

	it('falls back to legacy stat metadata when ResourceV2 snapshot is absent', () => {
		const { result } = renderHook(
			() => useResourceMetadata().select(setup.legacyStatId),
			{ wrapper },
		);
		expect(result.current.label).toBe('Morale');
		expect(result.current.icon).toBe('🙂');
	});
});
