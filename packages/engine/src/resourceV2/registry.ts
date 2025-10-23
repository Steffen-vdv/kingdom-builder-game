import type {
	ResourceV2BoundsMetadata,
	ResourceV2Definition,
	ResourceV2GlobalActionCostMetadata,
	ResourceV2GroupDefinition,
	ResourceV2GroupParentDescriptor,
} from '@kingdom-builder/protocol';
import type {
	ResourceV2EntityRecord,
	ResourceV2GroupParentRecord,
	ResourceV2GroupRecord,
	ResourceV2RegistryLoaderOptions,
	ResourceV2RegistrySource,
	ResourceV2ResourceRecord,
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from './types';
import {
	EMPTY_STRING_ARRAY,
	cloneAndFreeze,
	cloneValue,
	deepFreeze,
	freezeArray,
	createTierDefinitionIndex,
} from './utils';
import type { Mutable } from './utils';

export type {
	ResourceV2EntityKind,
	ResourceV2EntityRecord,
	ResourceV2GroupParentRecord,
	ResourceV2GroupRecord,
	ResourceV2RegistryLoaderOptions,
	ResourceV2RegistrySource,
	ResourceV2ResourceRecord,
	ResourceV2TierDefinition,
	ResourceV2TierTrackDefinition,
} from './types';

export class ResourceV2EngineRegistry {
	private readonly resourceRecords = new Map<
		string,
		ResourceV2ResourceRecord
	>();
	private readonly groupRecords = new Map<string, ResourceV2GroupRecord>();
	private readonly parentRecords = new Map<
		string,
		ResourceV2GroupParentRecord
	>();
	private readonly entityRecords = new Map<string, ResourceV2EntityRecord>();
	private readonly tierDefinitions = new Map<
		string,
		Map<string, ResourceV2TierDefinition>
	>();
	private readonly resourcesByGroup: Map<string, ReadonlyArray<string>>;
	private readonly groupsByParent: Map<string, ReadonlyArray<string>>;
	private globalActionCostResource:
		| { id: string; metadata: ResourceV2GlobalActionCostMetadata }
		| undefined;

	readonly resourceIds: ReadonlyArray<string>;
	readonly groupIds: ReadonlyArray<string>;
	readonly parentIds: ReadonlyArray<string>;

	constructor(source: ResourceV2RegistrySource) {
		const resourcesByGroup = new Map<string, string[]>();
		const groupsByParent = new Map<string, string[]>();

		for (const definition of source.resources) {
			const record = this.createResourceRecord(definition);
			if (this.resourceRecords.has(record.id)) {
				throw new Error(
					`ResourceV2 registry already contains resource "${record.id}".`,
				);
			}
			this.resourceRecords.set(record.id, record);
			this.entityRecords.set(record.id, record);

			if (record.globalActionCost) {
				const existingGlobalCost = this.globalActionCostResource;
				if (existingGlobalCost) {
					const conflictMessage = [
						'ResourceV2 registry already configured',
						'a global action cost resource',
						'"' + existingGlobalCost.id + '".',
						'Cannot register "' + record.id + '".',
					].join(' ');
					throw new Error(conflictMessage);
				}
				this.globalActionCostResource = {
					id: record.id,
					metadata: record.globalActionCost,
				};
			}

			if (record.hasTierTrack && record.tierTrack) {
				this.tierDefinitions.set(
					record.id,
					createTierDefinitionIndex(record.tierTrack),
				);
			}

			if (record.groupId) {
				const ids = resourcesByGroup.get(record.groupId);
				if (ids) {
					ids.push(record.id);
				} else {
					resourcesByGroup.set(record.groupId, [record.id]);
				}
			}
		}

		for (const definition of source.groups) {
			if (this.groupRecords.has(definition.id)) {
				throw new Error(
					`ResourceV2 registry already contains group "${definition.id}".`,
				);
			}

			const record = this.createGroupRecord(definition);
			this.groupRecords.set(record.id, record);

			const parentIds = groupsByParent.get(record.parentId);
			if (parentIds) {
				parentIds.push(record.id);
			} else {
				groupsByParent.set(record.parentId, [record.id]);
			}
		}

		this.resourceIds = freezeArray(this.resourceRecords.keys());
		this.groupIds = freezeArray(this.groupRecords.keys());
		this.parentIds = freezeArray(this.parentRecords.keys());

		this.resourcesByGroup = new Map(
			[...resourcesByGroup.entries()].map(([id, ids]) => [
				id,
				freezeArray(ids),
			]),
		);
		this.groupsByParent = new Map(
			[...groupsByParent.entries()].map(([id, ids]) => [id, freezeArray(ids)]),
		);
	}

	getResource(id: string): ResourceV2ResourceRecord {
		const record = this.resourceRecords.get(id);
		if (!record) {
			throw new Error(`Unknown ResourceV2 resource id: ${id}`);
		}
		return record;
	}

	findResource(id: string): ResourceV2ResourceRecord | undefined {
		return this.resourceRecords.get(id);
	}

	getGroup(id: string): ResourceV2GroupRecord {
		const record = this.groupRecords.get(id);
		if (!record) {
			throw new Error(`Unknown ResourceV2 group id: ${id}`);
		}
		return record;
	}

	findGroup(id: string): ResourceV2GroupRecord | undefined {
		return this.groupRecords.get(id);
	}

	getParent(id: string): ResourceV2GroupParentRecord {
		const record = this.parentRecords.get(id);
		if (!record) {
			throw new Error(`Unknown ResourceV2 parent id: ${id}`);
		}
		return record;
	}

	findParent(id: string): ResourceV2GroupParentRecord | undefined {
		return this.parentRecords.get(id);
	}

	getEntity(id: string): ResourceV2EntityRecord {
		const record = this.entityRecords.get(id);
		if (!record) {
			throw new Error(`Unknown ResourceV2 entity id: ${id}`);
		}
		return record;
	}

	findEntity(id: string): ResourceV2EntityRecord | undefined {
		return this.entityRecords.get(id);
	}

	getBounds(id: string): ResourceV2BoundsMetadata | undefined {
		return this.getEntity(id).bounds;
	}

	hasLowerBound(id: string): boolean {
		return this.getEntity(id).hasLowerBound;
	}

	getLowerBound(id: string): number | undefined {
		return this.getEntity(id).lowerBound;
	}

	hasUpperBound(id: string): boolean {
		return this.getEntity(id).hasUpperBound;
	}

	getUpperBound(id: string): number | undefined {
		return this.getEntity(id).upperBound;
	}

	hasTierTrack(id: string): boolean {
		return this.getEntity(id).hasTierTrack;
	}

	getTierTrack(id: string): ResourceV2TierTrackDefinition | undefined {
		return this.getEntity(id).tierTrack;
	}

	getTierDefinition(
		entityId: string,
		tierId: string,
	): ResourceV2TierDefinition | undefined {
		return this.tierDefinitions.get(entityId)?.get(tierId);
	}

	tracksValueBreakdown(id: string): boolean {
		return this.getEntity(id).trackValueBreakdown;
	}

	tracksBoundBreakdown(id: string): boolean {
		return this.getEntity(id).trackBoundBreakdown;
	}

	getGlobalActionCostResource():
		| {
				resourceId: string;
				metadata: ResourceV2GlobalActionCostMetadata;
		  }
		| undefined {
		if (!this.globalActionCostResource) {
			return undefined;
		}
		return {
			resourceId: this.globalActionCostResource.id,
			metadata: this.globalActionCostResource.metadata,
		};
	}

	getGlobalActionCost(
		resourceId: string,
	): ResourceV2GlobalActionCostMetadata | undefined {
		return this.getResource(resourceId).globalActionCost;
	}

	hasGlobalActionCost(resourceId: string): boolean {
		return this.getResource(resourceId).globalActionCost !== undefined;
	}

	getResourceGroupId(resourceId: string): string | undefined {
		return this.getResource(resourceId).groupId;
	}

	getResourceIdsForGroup(groupId: string): ReadonlyArray<string> {
		return this.resourcesByGroup.get(groupId) ?? EMPTY_STRING_ARRAY;
	}

	getGroupIdsForParent(parentId: string): ReadonlyArray<string> {
		return this.groupsByParent.get(parentId) ?? EMPTY_STRING_ARRAY;
	}

	getGroupParentForResource(
		resourceId: string,
	): ResourceV2GroupParentRecord | undefined {
		const groupId = this.getResource(resourceId).groupId;
		if (!groupId) {
			return undefined;
		}

		return this.groupRecords.get(groupId)?.parent;
	}

	private createResourceRecord(
		definition: ResourceV2Definition,
	): ResourceV2ResourceRecord {
		const cloned = cloneAndFreeze(definition);
		const bounds = cloned.bounds;
		const record: ResourceV2ResourceRecord = deepFreeze({
			id: cloned.id,
			kind: 'resource' as const,
			definition: cloned,
			display: cloned.display,
			bounds,
			hasBounds: Boolean(bounds),
			hasLowerBound: bounds?.lowerBound !== undefined,
			lowerBound: bounds?.lowerBound,
			hasUpperBound: bounds?.upperBound !== undefined,
			upperBound: bounds?.upperBound,
			hasTierTrack: cloned.tierTrack !== undefined,
			tierTrack: cloned.tierTrack,
			trackValueBreakdown: cloned.trackValueBreakdown ?? false,
			trackBoundBreakdown: cloned.trackBoundBreakdown ?? false,
			groupId: cloned.group?.groupId,
			groupOrder: cloned.group?.order,
			globalActionCost: cloned.globalActionCost,
		});
		return record;
	}

	private createGroupRecord(
		definition: ResourceV2GroupDefinition,
	): ResourceV2GroupRecord {
		const parent = this.ensureParentRecord(definition.parent);
		const mutable = cloneValue(
			definition,
		) as Mutable<ResourceV2GroupDefinition>;
		mutable.parent = parent.descriptor;
		const cloned = deepFreeze(mutable) as ResourceV2GroupDefinition;
		const record: ResourceV2GroupRecord = deepFreeze({
			id: cloned.id,
			order: cloned.order,
			definition: cloned,
			parentId: parent.id,
			parent,
			children: cloned.children,
		});
		return record;
	}

	private ensureParentRecord(
		descriptor: ResourceV2GroupParentDescriptor,
	): ResourceV2GroupParentRecord {
		const existing = this.parentRecords.get(descriptor.id);
		if (existing) {
			return existing;
		}

		const cloned = cloneAndFreeze(descriptor);
		const bounds = cloned.bounds;
		const record: ResourceV2GroupParentRecord = deepFreeze({
			id: cloned.id,
			kind: 'group-parent' as const,
			descriptor: cloned,
			display: cloned.display,
			bounds,
			hasBounds: Boolean(bounds),
			hasLowerBound: bounds?.lowerBound !== undefined,
			lowerBound: bounds?.lowerBound,
			hasUpperBound: bounds?.upperBound !== undefined,
			upperBound: bounds?.upperBound,
			hasTierTrack: cloned.tierTrack !== undefined,
			tierTrack: cloned.tierTrack,
			trackValueBreakdown: cloned.trackValueBreakdown ?? false,
			trackBoundBreakdown: cloned.trackBoundBreakdown ?? false,
		});
		this.parentRecords.set(record.id, record);
		this.entityRecords.set(record.id, record);

		if (record.hasTierTrack && record.tierTrack) {
			this.tierDefinitions.set(
				record.id,
				createTierDefinitionIndex(record.tierTrack),
			);
		}

		return record;
	}
}

export function loadResourceV2Registry(
	options: ResourceV2RegistryLoaderOptions = {},
): ResourceV2EngineRegistry {
	const payloadResources = options.payload?.resources ?? [];
	const payloadGroups = options.payload?.groups ?? [];
	const resources = options.resources ?? payloadResources;
	const groups = options.groups ?? payloadGroups;

	return new ResourceV2EngineRegistry({ resources, groups });
}
