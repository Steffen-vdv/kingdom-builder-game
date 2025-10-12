import {
	BUILDINGS,
	DEVELOPMENTS,
	LAND_INFO,
	MODIFIER_INFO,
	OVERVIEW_CONTENT,
	PASSIVE_INFO,
	PHASES,
	POPULATIONS,
	RESOURCES,
	SLOT_INFO,
	STATS,
	TRIGGER_INFO,
	type OverviewContentTemplate,
} from '@kingdom-builder/contents';
import type {
	SessionMetadataDescriptor,
	SessionPhaseMetadata,
	SessionPhaseStepMetadata,
	SessionSnapshotMetadata,
	SessionTriggerMetadata,
} from '@kingdom-builder/protocol/session';

type DescriptorSource = {
	readonly name?: string | undefined;
	readonly icon?: string | undefined;
	readonly description?: string | undefined;
};

type PassiveEvaluationModifierRegistry = {
	entries(): Iterable<[string, DescriptorSource]>;
};

type ExtendedSessionSnapshotMetadata = Omit<
	SessionSnapshotMetadata,
	'passiveEvaluationModifiers'
> & {
	readonly passiveEvaluationModifiers: Record<
		string,
		SessionMetadataDescriptor
	>;
	readonly modifiers: Record<string, SessionMetadataDescriptor>;
	readonly overview: OverviewContentTemplate;
};

export function buildSessionMetadata(): ExtendedSessionSnapshotMetadata {
	const metadata: ExtendedSessionSnapshotMetadata = {
		passiveEvaluationModifiers: createPassiveEvaluationModifierMetadata(),
		resources: createResourceMetadata(),
		populations: createRegistryDescriptorMap(POPULATIONS.entries()),
		buildings: createRegistryDescriptorMap(BUILDINGS.entries()),
		developments: createRegistryDescriptorMap(DEVELOPMENTS.entries()),
		stats: createStatMetadata(),
		phases: createPhaseMetadata(),
		triggers: createTriggerMetadata(),
		assets: createAssetMetadata(),
		modifiers: createModifierMetadata(),
		overview: cloneOverviewContent(),
	};
	return deepFreeze(metadata);
}

function createPassiveEvaluationModifierMetadata(): Record<
	string,
	SessionMetadataDescriptor
> {
	const passiveInfo = PASSIVE_INFO as unknown;
	if (!isPassiveEvaluationModifierRegistry(passiveInfo)) {
		return {};
	}
	const entries = Array.from(passiveInfo.entries());
	return createRegistryDescriptorMap(entries);
}

function createRegistryDescriptorMap<T extends DescriptorSource>(
	entries: ReadonlyArray<[string, T]>,
): Record<string, SessionMetadataDescriptor> {
	return Object.fromEntries(
		entries.map(([id, definition]) => [
			id,
			createDescriptor(
				definition.name,
				definition.icon,
				definition.description,
			),
		]),
	);
}

function isPassiveEvaluationModifierRegistry(
	value: unknown,
): value is PassiveEvaluationModifierRegistry {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as PassiveEvaluationModifierRegistry).entries === 'function'
	);
}

function createResourceMetadata(): Record<string, SessionMetadataDescriptor> {
	return Object.fromEntries(
		Object.entries(RESOURCES).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	);
}

function createStatMetadata(): Record<string, SessionMetadataDescriptor> {
	return Object.fromEntries(
		Object.entries(STATS).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon, info.description),
		]),
	);
}

function createPhaseMetadata(): Record<string, SessionPhaseMetadata> {
	return Object.fromEntries(
		PHASES.map((phase) => {
			const steps = phase.steps?.map((stepDefinition) => {
				const step: SessionPhaseStepMetadata = { id: stepDefinition.id };
				if (stepDefinition.title !== undefined) {
					step.label = stepDefinition.title;
				}
				if (stepDefinition.icon !== undefined) {
					step.icon = stepDefinition.icon;
				}
				if (stepDefinition.triggers && stepDefinition.triggers.length > 0) {
					step.triggers = [...stepDefinition.triggers];
				}
				return step;
			});
			const phaseMetadata: SessionPhaseMetadata = { id: phase.id };
			if (phase.label !== undefined) {
				phaseMetadata.label = phase.label;
			}
			if (phase.icon !== undefined) {
				phaseMetadata.icon = phase.icon;
			}
			if (phase.action !== undefined) {
				phaseMetadata.action = phase.action;
			}
			if (steps && steps.length > 0) {
				phaseMetadata.steps = steps;
			}
			return [phase.id, phaseMetadata];
		}),
	);
}

function createTriggerMetadata(): Record<string, SessionTriggerMetadata> {
	return Object.fromEntries(
		Object.entries(TRIGGER_INFO).map(([key, info]) => [
			key,
			{
				label: info.past,
				icon: info.icon,
				future: info.future,
				past: info.past,
			},
		]),
	);
}

function createAssetMetadata(): Record<string, SessionMetadataDescriptor> {
	return {
		land: createDescriptor(LAND_INFO.label, LAND_INFO.icon),
		slot: createDescriptor(SLOT_INFO.label, SLOT_INFO.icon),
		passive: createDescriptor(PASSIVE_INFO.label, PASSIVE_INFO.icon),
	};
}

function createModifierMetadata(): Record<string, SessionMetadataDescriptor> {
	return Object.fromEntries(
		Object.entries(MODIFIER_INFO).map(([key, info]) => [
			key,
			createDescriptor(info.label, info.icon),
		]),
	);
}

function cloneOverviewContent(): OverviewContentTemplate {
	return structuredClone(OVERVIEW_CONTENT);
}

function createDescriptor(
	label?: string,
	icon?: string,
	description?: string,
): SessionMetadataDescriptor {
	const descriptor: SessionMetadataDescriptor = {};
	if (label !== undefined) {
		descriptor.label = label;
	}
	if (icon !== undefined) {
		descriptor.icon = icon;
	}
	if (description !== undefined) {
		descriptor.description = description;
	}
	return descriptor;
}

function deepFreeze<T>(value: T): T {
	if (Array.isArray(value)) {
		for (const item of value) {
			deepFreeze(item);
		}
		return Object.freeze(value) as unknown as T;
	}
	if (isObject(value)) {
		for (const item of Object.values(value)) {
			deepFreeze(item);
		}
		return Object.freeze(value) as unknown as T;
	}
	return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
