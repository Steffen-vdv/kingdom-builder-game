export interface RegistryMetadataDescriptor {
	id: string;
	label: string;
	icon?: string;
	description?: string;
}

export type AssetMetadata = RegistryMetadataDescriptor;

export interface PhaseStepMetadata {
	id: string;
	label: string;
	icon?: string;
	triggers: ReadonlyArray<string>;
}

export interface PhaseMetadata {
	id: string;
	label: string;
	icon?: string;
	action: boolean;
	steps: ReadonlyArray<PhaseStepMetadata>;
	stepsById: Readonly<Record<string, PhaseStepMetadata>>;
}

export interface TriggerMetadata {
	id: string;
	label: string;
	icon?: string;
	future?: string;
	past?: string;
}

export interface MetadataLookup<TDescriptor extends { id: string }> {
	readonly record: Readonly<Record<string, TDescriptor>>;
	get(id: string): TDescriptor;
	values(): ReadonlyArray<TDescriptor>;
}
