import {
	LAND_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	SLOT_INFO,
	TRIGGER_INFO,
	UPKEEP_INFO,
	TRANSFER_INFO,
} from '@kingdom-builder/contents';
import type {
	BuildingConfig,
	DevelopmentConfig,
	PhaseConfig,
	Registry,
	SessionMetadataDescriptor,
	SessionMetadataSnapshot,
	SessionPhaseMetadata,
	SessionTriggerMetadata,
	SessionResourceGroupDescriptor,
	SessionResourceRegistryPayload,
	SessionResourceValueDescriptor,
	SessionResourceValueMetadata,
} from '@kingdom-builder/protocol';
import {
        deriveOrderedSessionResourceValues,
        freezeResourceMetadataByOrder,
} from '@kingdom-builder/protocol/session';

type SessionMetadataDescriptorMap = Record<string, SessionMetadataDescriptor>;
type SessionPhaseStep = NonNullable<SessionPhaseMetadata['steps']>[number];

export type SessionStaticMetadataPayload = SessionMetadataSnapshot;

export interface BuildSessionMetadataOptions {
        buildings: Registry<BuildingConfig>;
        developments: Registry<DevelopmentConfig>;
        resourceValues: SessionResourceRegistryPayload;
        phases: ReadonlyArray<PhaseConfig>;
}

const typedStructuredClone = <Value>(value: Value): Value => {
        return structuredClone(value) as Value;
};

export function buildSessionMetadata(
	options: BuildSessionMetadataOptions,
): SessionStaticMetadataPayload {
	const metadata: SessionStaticMetadataPayload = {};
	const valuesMetadata = buildResourceValueMetadata(options.resourceValues);
	if (hasValueMetadata(valuesMetadata)) {
		metadata.values = valuesMetadata;
	}
	const buildingMetadata = buildRegistryMetadata(options.buildings);
	if (hasEntries(buildingMetadata)) {
		metadata.buildings = buildingMetadata;
	}
	const developmentMetadata = buildRegistryMetadata(options.developments);
	if (hasEntries(developmentMetadata)) {
		metadata.developments = developmentMetadata;
	}
	const phaseMetadata = buildPhaseMetadata(options.phases);
	if (hasEntries(phaseMetadata)) {
		metadata.phases = phaseMetadata;
	}
	const triggerMetadata = buildTriggerMetadata();
	if (hasEntries(triggerMetadata)) {
		metadata.triggers = triggerMetadata;
	}
	const assetMetadata = buildAssetMetadata();
	if (hasEntries(assetMetadata)) {
		metadata.assets = assetMetadata;
	}
        const overviewMetadata = typedStructuredClone(OVERVIEW_CONTENT);
        metadata.overview = overviewMetadata;
        return metadata;
}

function buildRegistryMetadata<
	Definition extends {
		name: string;
		icon?: string | undefined;
		description?: string | undefined;
	},
>(registry: Registry<Definition>): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	for (const [id, definition] of registry.entries()) {
		const descriptor: SessionMetadataDescriptor = { label: definition.name };
		if (definition.icon) {
			descriptor.icon = definition.icon;
		}
		if (definition.description) {
			descriptor.description = definition.description;
		}
		descriptors[id] = descriptor;
	}
	return descriptors;
}

function buildPhaseMetadata(
	phases: ReadonlyArray<PhaseConfig>,
): Record<string, SessionPhaseMetadata> {
	const descriptors: Record<string, SessionPhaseMetadata> = {};
	for (const phase of phases) {
		const descriptor: SessionPhaseMetadata = { id: phase.id };
		if (phase.label) {
			descriptor.label = phase.label;
		}
		if (phase.icon) {
			descriptor.icon = phase.icon;
		}
		if (phase.action) {
			descriptor.action = true;
		}
		const steps: SessionPhaseStep[] = phase.steps.map((step) => {
			const stepMetadata: SessionPhaseStep = { id: step.id };
			if (step.title) {
				stepMetadata.label = step.title;
			}
			if (step.icon) {
				stepMetadata.icon = step.icon;
			}
			if (step.triggers && step.triggers.length > 0) {
				stepMetadata.triggers = [...step.triggers];
			}
			return stepMetadata;
		});
		if (steps.length > 0) {
			descriptor.steps = steps;
		}
		descriptors[phase.id] = descriptor;
	}
	return descriptors;
}

function buildTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	const descriptors: Record<string, SessionTriggerMetadata> = {};
	const triggerKeys = Object.keys(TRIGGER_INFO) as Array<
		keyof typeof TRIGGER_INFO
	>;
	for (const key of triggerKeys) {
		descriptors[key] = buildTriggerDescriptor(TRIGGER_INFO[key]);
	}
	return descriptors;
}

function buildTriggerDescriptor(
	info: (typeof TRIGGER_INFO)[keyof typeof TRIGGER_INFO],
): SessionTriggerMetadata {
	const descriptor: SessionTriggerMetadata = {};
	if (info.icon) {
		descriptor.icon = info.icon;
	}
	if (info.future) {
		descriptor.future = info.future;
	}
	if (info.past) {
		descriptor.past = info.past;
	}
	return descriptor;
}

function buildAssetMetadata(): SessionMetadataDescriptorMap {
	const descriptors: SessionMetadataDescriptorMap = {};
	assignAssetDescriptor(descriptors, 'passive', PASSIVE_INFO);
	assignAssetDescriptor(descriptors, 'land', LAND_INFO);
	assignAssetDescriptor(descriptors, 'slot', SLOT_INFO);
	assignAssetDescriptor(descriptors, 'upkeep', UPKEEP_INFO);
	assignAssetDescriptor(descriptors, 'transfer', TRANSFER_INFO);
	return descriptors;
}

type AssetInfo = { icon?: string; label?: string; description?: string };

function assignAssetDescriptor(
	target: SessionMetadataDescriptorMap,
	key: string,
	info: AssetInfo | undefined,
): void {
	if (!info) {
		return;
	}
	const descriptor: SessionMetadataDescriptor = {};
	if (info.label) {
		descriptor.label = info.label;
	}
	if (info.icon) {
		descriptor.icon = info.icon;
	}
	if (info.description) {
		descriptor.description = info.description;
	}
	target[key] = descriptor;
}

function hasEntries<T>(value: Record<string, T>): boolean {
	return Object.keys(value).length > 0;
}

function hasValueMetadata(value: SessionResourceValueMetadata): boolean {
	return (
		Boolean(value.descriptors && Object.keys(value.descriptors).length > 0) ||
		Boolean(value.groups && Object.keys(value.groups).length > 0) ||
		Boolean(value.ordered && value.ordered.length > 0)
	);
}

function buildResourceValueMetadata(
        registry: SessionResourceRegistryPayload,
): SessionResourceValueMetadata {
        const descriptors: Record<string, SessionResourceValueDescriptor> = {};
        const groups: Record<string, SessionResourceGroupDescriptor> = {};

        const definitionEntries = Object.entries(
                registry.definitions,
        ) as Array<[string, typeof registry.definitions[string]]>;
        for (const [id, definition] of definitionEntries) {
                const descriptor: SessionResourceValueDescriptor = {
                        id,
                        label: definition.display.label,
                        icon: definition.display.icon,
                        description: definition.display.description,
			order: definition.display.order,
		};
		if (definition.display.percent) {
			descriptor.displayAsPercent = true;
		}
		if (definition.group) {
			descriptor.groupId = definition.group.groupId;
		}
		descriptors[id] = Object.freeze(descriptor);
	}

        const childrenByGroup = new Map<
                string,
                Array<{ id: string; order: number }>
        >();
        for (const definition of Object.values(registry.definitions)) {
                const group = definition.group;
                if (!group) {
                        continue;
                }
                const order = group.order ?? definition.display.order;
		const existing = childrenByGroup.get(group.groupId);
		if (existing) {
			existing.push({ id: definition.id, order });
		} else {
			childrenByGroup.set(group.groupId, [{ id: definition.id, order }]);
		}
	}

        const groupEntries = Object.entries(
                registry.groups,
        ) as Array<[string, typeof registry.groups[string]]>;
        for (const [groupId, definition] of groupEntries) {
                const parent = definition.parent;
                const orderedChildren = freezeResourceMetadataByOrder(
                        childrenByGroup.get(groupId) ?? [],
                        (entry) => entry.order,
                ).map((entry) => entry.id);
		const descriptor: SessionResourceGroupDescriptor = {
			groupId,
			parent: {
				id: parent.id,
				label: parent.label,
				icon: parent.icon,
				description: parent.description,
				order: parent.order,
				limited: parent.limited,
			},
			children: orderedChildren,
			order: parent.order,
		};
		groups[groupId] = Object.freeze(descriptor);
	}

	const ordered = deriveOrderedSessionResourceValues(
		descriptors,
		Object.values(groups),
	);

	const metadata: SessionResourceValueMetadata = {};
	if (Object.keys(descriptors).length > 0) {
		metadata.descriptors = Object.freeze(descriptors);
	}
	if (Object.keys(groups).length > 0) {
		metadata.groups = Object.freeze(groups);
	}
	if (ordered.length > 0) {
		metadata.ordered = ordered;
	}
	return metadata;
}
