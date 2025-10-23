import type {
	ResourceV2GlobalActionCost,
	ResourceV2GroupParent,
	ResourceV2TierTrack,
} from '@kingdom-builder/protocol';
import type { SessionMetadataFormat } from '@kingdom-builder/protocol/session';

export interface RegistryMetadataDescriptor {
	id: string;
	label: string;
	icon?: string;
	description?: string;
	displayAsPercent?: boolean;
	format?: SessionMetadataFormat;
	metadata?: Readonly<Record<string, unknown>>;
	limited?: boolean;
	groupId?: string;
	parentId?: string;
	isPercent?: boolean;
	trackValueBreakdown?: boolean;
	trackBoundBreakdown?: boolean;
	lowerBound?: number;
	upperBound?: number;
	tierTrack?: Readonly<ResourceV2TierTrack>;
	globalActionCost?: Readonly<ResourceV2GlobalActionCost>;
	relation?: ResourceV2GroupParent['relation'];
	children?: ReadonlyArray<string>;
	order?: number;
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
