import {
	LAND_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	POPULATION_INFO,
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
} from '@kingdom-builder/protocol';
import type {
	SessionResourceRegistryPayload,
	SessionResourceValueDescriptor,
	SessionResourceGroupDescriptor,
	SessionResourceValueMetadata,
} from '@kingdom-builder/protocol/session/resourceV2';
import { deriveOrderedSessionResourceValues } from '@kingdom-builder/protocol/session';

type SessionMetadataDescriptorMap = Record<string, SessionMetadataDescriptor>;
type SessionPhaseStep = NonNullable<SessionPhaseMetadata['steps']>[number];
type ResourceDefinitionRecord = SessionResourceRegistryPayload['definitions'];
type ResourceGroupRecord = SessionResourceRegistryPayload['groups'];

export type SessionStaticMetadataPayload = SessionMetadataSnapshot;

export interface BuildSessionMetadataOptions {
	buildings: Registry<BuildingConfig>;
	developments: Registry<DevelopmentConfig>;
	resourceValues: SessionResourceRegistryPayload;
	phases: ReadonlyArray<PhaseConfig>;
}

export function buildSessionMetadata(
	options: BuildSessionMetadataOptions,
): SessionStaticMetadataPayload {
	const resourceMetadata = buildResourceMetadata(options.resourceValues);
	const buildingMetadata = buildRegistryMetadata(options.buildings);
	const developmentMetadata = buildRegistryMetadata(options.developments);
	const phaseMetadata = buildPhaseMetadata(options.phases);
	const triggerMetadata = buildTriggerMetadata();
	const assetMetadata = buildAssetMetadata();
	const metadata: SessionStaticMetadataPayload = {
		...(hasValueEntries(resourceMetadata) ? { values: resourceMetadata } : {}),
		...(hasEntries(buildingMetadata) ? { buildings: buildingMetadata } : {}),
		...(hasEntries(developmentMetadata)
			? { developments: developmentMetadata }
			: {}),
		...(hasEntries(phaseMetadata) ? { phases: phaseMetadata } : {}),
		...(hasEntries(triggerMetadata) ? { triggers: triggerMetadata } : {}),
		...(hasEntries(assetMetadata) ? { assets: assetMetadata } : {}),
		overview: structuredClone(OVERVIEW_CONTENT),
	};
	return metadata;
}

function buildResourceMetadata(
	resources: SessionResourceRegistryPayload,
): SessionResourceValueMetadata {
	const { definitions, groups } = resources;
	const descriptors = buildResourceValueDescriptors(definitions);
	const groupDescriptors = buildResourceGroupDescriptors(groups, definitions);
	const ordered = deriveOrderedSessionResourceValues(
		descriptors,
		Object.values(groupDescriptors),
	);
	const metadata: SessionResourceValueMetadata = {
		...(Object.keys(descriptors).length > 0 ? { descriptors } : {}),
		...(Object.keys(groupDescriptors).length > 0
			? { groups: groupDescriptors }
			: {}),
		...(ordered.length > 0 ? { ordered } : {}),
	};
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
	assignAssetDescriptor(descriptors, 'population', POPULATION_INFO);
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

function hasValueEntries(metadata: SessionResourceValueMetadata): boolean {
	if (metadata.descriptors && Object.keys(metadata.descriptors).length > 0) {
		return true;
	}
	if (metadata.groups && Object.keys(metadata.groups).length > 0) {
		return true;
	}
	if (metadata.ordered && metadata.ordered.length > 0) {
		return true;
	}
	if (metadata.tiers && Object.keys(metadata.tiers).length > 0) {
		return true;
	}
	if (metadata.recent && metadata.recent.length > 0) {
		return true;
	}
	return false;
}

function buildResourceValueDescriptors(
	definitions: ResourceDefinitionRecord,
): Record<string, SessionResourceValueDescriptor> {
	const descriptors: Record<string, SessionResourceValueDescriptor> = {};
	for (const [id, definition] of Object.entries(definitions)) {
		if (!definition) {
			continue;
		}
		const display = definition.display;
		const descriptor: SessionResourceValueDescriptor = {
			id,
			order: display.order,
		};
		if (display.label) {
			descriptor.label = display.label;
		}
		if (display.icon) {
			descriptor.icon = display.icon;
		}
		if (display.description) {
			descriptor.description = display.description;
		}
		if (display.percent) {
			descriptor.displayAsPercent = true;
			descriptor.format = {
				percent: true,
			} satisfies SessionResourceValueDescriptor['format'];
		}
		if (definition.group) {
			descriptor.groupId = definition.group.groupId;
		}
		descriptors[id] = descriptor;
	}
	return descriptors;
}

function buildResourceGroupDescriptors(
	groups: ResourceGroupRecord,
	definitions: ResourceDefinitionRecord,
): Record<string, SessionResourceGroupDescriptor> {
	const descriptors: Record<string, SessionResourceGroupDescriptor> = {};
	for (const [groupId, group] of Object.entries(groups)) {
		if (!group) {
			continue;
		}
		const children: string[] = [];
		for (const definition of Object.values(definitions)) {
			if (!definition || definition.group?.groupId !== groupId) {
				continue;
			}
			children.push(definition.id);
		}
		children.sort((left, right) => {
			const leftDef = definitions[left];
			const rightDef = definitions[right];
			if (!leftDef || !rightDef) {
				return left.localeCompare(right);
			}
			const leftOrder = leftDef.group?.order ?? leftDef.display.order;
			const rightOrder = rightDef.group?.order ?? rightDef.display.order;
			if (leftOrder !== rightOrder) {
				return leftOrder - rightOrder;
			}
			return left.localeCompare(right);
		});
		const parent = {
			id: group.parent.id,
			order: group.parent.order,
		} as SessionResourceGroupDescriptor['parent'];
		const parentDetails = group.parent;
		if (parentDetails.icon) {
			parent.icon = parentDetails.icon;
		}
		if (parentDetails.label) {
			parent.label = parentDetails.label;
		}
		if (parentDetails.description) {
			parent.description = parentDetails.description;
		}
		if (parentDetails.limited !== undefined) {
			parent.limited = parentDetails.limited;
		}
		const descriptor: SessionResourceGroupDescriptor = {
			groupId,
			parent,
			order: parent.order,
		};
		if (children.length > 0) {
			descriptor.children = children;
		}
		descriptors[groupId] = descriptor;
	}
	return descriptors;
}
