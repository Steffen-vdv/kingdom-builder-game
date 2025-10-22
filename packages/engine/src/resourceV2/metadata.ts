import type {
	ResourceV2BoundsConfig,
	ResourceV2DefinitionConfig,
	ResourceV2GlobalActionCostConfig,
	ResourceV2GroupDefinitionConfig,
	ResourceV2TierStepConfig,
	ResourceV2TierTrackConfig,
} from '@kingdom-builder/protocol';

export interface ResourceV2StateValueDefinitionBase {
	readonly id: string;
	readonly order: number;
	readonly bounds: ResourceV2BoundsConfig;
	readonly tierTrack?: ResourceV2TierTrackConfig;
}

export interface ResourceV2StateChildDefinition
	extends ResourceV2StateValueDefinitionBase {
	readonly kind: 'resource';
	readonly limited: false;
	readonly groupId?: string;
	readonly groupOrder?: number;
	readonly parentId?: string;
}

export interface ResourceV2StateParentDefinition
	extends ResourceV2StateValueDefinitionBase {
	readonly kind: 'group-parent';
	readonly limited: true;
	readonly groupId: string;
	readonly children: readonly string[];
}

export type ResourceV2StateValueDefinition =
	| ResourceV2StateChildDefinition
	| ResourceV2StateParentDefinition;

export interface ResourceV2GlobalActionCostPointer {
	readonly resourceId: string;
	readonly amount: number;
}

export interface ResourceV2Metadata {
	readonly values: ReadonlyMap<string, ResourceV2StateValueDefinition>;
	readonly orderedValueIds: readonly string[];
	readonly parentToChildren: ReadonlyMap<string, readonly string[]>;
	readonly childToParent: ReadonlyMap<string, string>;
	readonly limitedResourceIds: ReadonlySet<string>;
	readonly globalActionCosts: readonly ResourceV2GlobalActionCostPointer[];
}

export interface ResourceV2MetadataSource {
	readonly definitions: Iterable<ResourceV2DefinitionConfig>;
	readonly groups: Iterable<ResourceV2GroupDefinitionConfig>;
}

interface ResourceV2GroupPresentation {
	readonly groupId: string;
	readonly parent: ResourceV2GroupDefinitionConfig['parent'];
	readonly children: readonly ResourceV2DefinitionConfig[];
}

interface OrderedResourceEntry {
	readonly kind: 'resource';
	readonly id: string;
}

interface OrderedParentEntry {
	readonly kind: 'group-parent';
	readonly id: string;
}

type OrderedValueEntry = OrderedResourceEntry | OrderedParentEntry;

function cloneBounds(
	bounds: ResourceV2BoundsConfig | undefined,
): ResourceV2BoundsConfig {
	const next: ResourceV2BoundsConfig = {};
	if (bounds?.lowerBound !== undefined) {
		next.lowerBound = bounds.lowerBound;
	}
	if (bounds?.upperBound !== undefined) {
		next.upperBound = bounds.upperBound;
	}
	return next;
}

function cloneTierStep(
	step: ResourceV2TierStepConfig,
): ResourceV2TierStepConfig {
	return {
		...step,
		display: step.display ? { ...step.display } : undefined,
		enterEffects: step.enterEffects ? [...step.enterEffects] : undefined,
		exitEffects: step.exitEffects ? [...step.exitEffects] : undefined,
		passives: step.passives ? [...step.passives] : undefined,
	};
}

function cloneTierTrack(
	track: ResourceV2TierTrackConfig | undefined,
): ResourceV2TierTrackConfig | undefined {
	if (!track) {
		return undefined;
	}
	return {
		...track,
		display: track.display ? { ...track.display } : undefined,
		steps: track.steps.map((step) => cloneTierStep(step)),
	};
}

function cloneGroupParent(
	parent: ResourceV2GroupDefinitionConfig['parent'],
): ResourceV2GroupDefinitionConfig['parent'] {
	return {
		...parent,
	};
}

function orderValues<T>(
	values: Iterable<T>,
	selectOrder: (value: T) => number,
): readonly T[] {
	const decorated = Array.from(values, (value, index) => ({
		value,
		order: selectOrder(value),
		index,
	}));
	decorated.sort((left, right) => {
		if (left.order !== right.order) {
			return left.order - right.order;
		}
		return left.index - right.index;
	});
	return Object.freeze(decorated.map((entry) => entry.value));
}

function buildGroupPresentations(
	definitions: readonly ResourceV2DefinitionConfig[],
	groups: readonly ResourceV2GroupDefinitionConfig[],
): readonly ResourceV2GroupPresentation[] {
	const parents = new Map<string, ResourceV2GroupDefinitionConfig['parent']>();
	const parentIds = new Set<string>();
	groups.forEach((group) => {
		const parent = cloneGroupParent(group.parent);
		parents.set(group.id, parent);
		parentIds.add(parent.id);
	});

	const childrenByGroup = new Map<string, ResourceV2DefinitionConfig[]>();
	for (const definition of definitions) {
		const metadata = definition.group;
		if (!metadata) {
			continue;
		}
		if (!parents.has(metadata.groupId)) {
			throw new Error(
				`ResourceV2 definition references an unknown group id. Register the group parent metadata before assigning resources. (${metadata.groupId}, resource: ${definition.id})`,
			);
		}
		const existing = childrenByGroup.get(metadata.groupId);
		if (existing) {
			existing.push(definition);
		} else {
			childrenByGroup.set(metadata.groupId, [definition]);
		}
	}

	for (const definition of definitions) {
		if (parentIds.has(definition.id)) {
			throw new Error(
				`ResourceV2 group parents are computed, limited resources and cannot be defined directly. Remove the conflicting definition. (${definition.id})`,
			);
		}
	}

	const presentations: ResourceV2GroupPresentation[] = [];
	for (const [groupId, parent] of parents.entries()) {
		const children = orderValues(
			childrenByGroup.get(groupId) ?? [],
			(definition) => definition.group?.order ?? definition.display.order,
		);
		presentations.push({
			groupId,
			parent,
			children,
		});
	}

	return orderValues(
		presentations,
		(presentation) => presentation.parent.order,
	);
}

function buildOrderedEntries(
	definitions: readonly ResourceV2DefinitionConfig[],
	presentations: readonly ResourceV2GroupPresentation[],
): readonly OrderedValueEntry[] {
	const groupedChildIds = new Set<string>();
	for (const presentation of presentations) {
		for (const child of presentation.children) {
			groupedChildIds.add(child.id);
		}
	}

	const standalone = orderValues(
		definitions.filter((definition) => !groupedChildIds.has(definition.id)),
		(definition) => definition.display.order,
	);

	const blocks: { order: number; entries: OrderedValueEntry[] }[] = [];
	for (const definition of standalone) {
		blocks.push({
			order: definition.display.order,
			entries: [
				{
					kind: 'resource',
					id: definition.id,
				},
			],
		});
	}

	for (const presentation of presentations) {
		const entries: OrderedValueEntry[] = [
			{
				kind: 'group-parent',
				id: presentation.parent.id,
			},
		];
		for (const child of presentation.children) {
			entries.push({
				kind: 'resource',
				id: child.id,
			});
		}
		blocks.push({
			order: presentation.parent.order,
			entries,
		});
	}

	const orderedBlocks = orderValues(blocks, (block) => block.order);
	return Object.freeze(orderedBlocks.flatMap((block) => block.entries));
}

function extractGlobalActionCosts(
	definitions: readonly ResourceV2DefinitionConfig[],
): readonly ResourceV2GlobalActionCostPointer[] {
	const entries: {
		order: number;
		pointer: ResourceV2GlobalActionCostPointer;
	}[] = [];
	for (const definition of definitions) {
		const config: ResourceV2GlobalActionCostConfig | undefined =
			definition.globalActionCost;
		if (!config) {
			continue;
		}
		entries.push({
			order: definition.display.order,
			pointer: {
				resourceId: definition.id,
				amount: config.amount,
			},
		});
	}
	const ordered = orderValues(entries, (entry) => entry.order);
	return Object.freeze(ordered.map((entry) => entry.pointer));
}

function createChildDefinition(
	definition: ResourceV2DefinitionConfig,
): ResourceV2StateChildDefinition {
	const bounds = cloneBounds(definition.bounds);
	const tierTrack = cloneTierTrack(definition.tierTrack);
	const base = {
		kind: 'resource' as const,
		limited: false as const,
		id: definition.id,
		order: definition.display.order,
		bounds,
		...(tierTrack ? { tierTrack } : {}),
	};
	if (definition.group) {
		return Object.freeze({
			...base,
			groupId: definition.group.groupId,
			groupOrder: definition.group.order,
		}) as ResourceV2StateChildDefinition;
	}
	return Object.freeze(base) as ResourceV2StateChildDefinition;
}

function createParentDefinition(
	presentation: ResourceV2GroupPresentation,
): ResourceV2StateParentDefinition {
	return Object.freeze({
		kind: 'group-parent',
		limited: true,
		id: presentation.parent.id,
		order: presentation.parent.order,
		groupId: presentation.groupId,
		bounds: {},
		children: Object.freeze(presentation.children.map((child) => child.id)),
	}) as ResourceV2StateParentDefinition;
}

export function createResourceV2Metadata(
	source: ResourceV2MetadataSource,
): ResourceV2Metadata {
	const definitions = Array.from(source.definitions, (definition) => ({
		...definition,
	}));
	const groups = Array.from(source.groups, (group) => ({ ...group }));
	const values = new Map<string, ResourceV2StateValueDefinition>();
	const parentToChildren = new Map<string, readonly string[]>();
	const childToParent = new Map<string, string>();
	const limitedResourceIds = new Set<string>();

	for (const definition of definitions) {
		const entry = createChildDefinition(definition);
		values.set(entry.id, entry);
	}

	const presentations = buildGroupPresentations(definitions, groups);
	for (const presentation of presentations) {
		const parent = createParentDefinition(presentation);
		values.set(parent.id, parent);
		parentToChildren.set(parent.id, parent.children);
		limitedResourceIds.add(parent.id);
		for (const childId of parent.children) {
			childToParent.set(childId, parent.id);
			const child = values.get(childId);
			if (child && child.kind === 'resource') {
				values.set(
					childId,
					Object.freeze({
						...child,
						parentId: parent.id,
					}) as ResourceV2StateChildDefinition,
				);
			}
		}
	}

	const orderedEntries = buildOrderedEntries(definitions, presentations);
	const orderedValueIds = Object.freeze(
		orderedEntries.map((entry) => entry.id),
	);
	const globalActionCosts = extractGlobalActionCosts(definitions);

	return {
		values,
		orderedValueIds,
		parentToChildren,
		childToParent,
		limitedResourceIds,
		globalActionCosts,
	};
}

export function createResourceV2StateBlueprint(
	source: ResourceV2MetadataSource,
): ResourceV2Metadata {
	return createResourceV2Metadata(source);
}

export type ResourceV2StateBlueprint = ResourceV2Metadata;
