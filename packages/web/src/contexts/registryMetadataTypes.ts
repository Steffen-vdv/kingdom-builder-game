import type { SessionSnapshotMetadata } from '@kingdom-builder/protocol/session';

export interface SessionMetadataDescriptor {
	label?: string;
	icon?: string;
	description?: string;
}

export interface AssetMetadataDescriptor extends SessionMetadataDescriptor {}

export interface AssetMetadata {
	label: string;
	icon?: string;
	description?: string;
}

export interface RegistryMetadataDescriptor extends AssetMetadata {
	readonly id: string;
}

export interface PhaseStepDescriptor extends SessionMetadataDescriptor {
	id?: string;
	triggers?: string[];
}

export interface PhaseMetadataDescriptor extends SessionMetadataDescriptor {
	action?: boolean;
	steps?: PhaseStepDescriptor[];
}

export interface TriggerMetadataDescriptor extends SessionMetadataDescriptor {
	future?: string;
	past?: string;
}

export interface PhaseStepMetadata extends RegistryMetadataDescriptor {
	readonly triggers: ReadonlyArray<string>;
}

export interface PhaseMetadata extends RegistryMetadataDescriptor {
	readonly action: boolean;
	readonly steps: ReadonlyArray<PhaseStepMetadata>;
	readonly stepsById: Readonly<Record<string, PhaseStepMetadata>>;
}

export interface TriggerMetadata extends RegistryMetadataDescriptor {
	readonly future?: string;
	readonly past?: string;
}

export interface MetadataLookup<TDescriptor> {
	readonly record: Readonly<Record<string, TDescriptor>>;
	get(id: string): TDescriptor;
	values(): ReadonlyArray<TDescriptor>;
}

export type RegistryMetadataDescriptorRecord = Record<
	string,
	SessionMetadataDescriptor
>;

export type PhaseMetadataDescriptorRecord = Record<
	string,
	PhaseMetadataDescriptor
>;

export type TriggerMetadataDescriptorRecord = Record<
	string,
	TriggerMetadataDescriptor
>;

export type AssetMetadataDescriptorRecord = Record<
	string,
	AssetMetadataDescriptor
>;

export type RegistryMetadataSnapshot = SessionSnapshotMetadata & {
	resources?: RegistryMetadataDescriptorRecord;
	populations?: RegistryMetadataDescriptorRecord;
	buildings?: RegistryMetadataDescriptorRecord;
	developments?: RegistryMetadataDescriptorRecord;
	stats?: RegistryMetadataDescriptorRecord;
	phases?: PhaseMetadataDescriptorRecord;
	triggers?: TriggerMetadataDescriptorRecord;
	assets?: AssetMetadataDescriptorRecord;
};
