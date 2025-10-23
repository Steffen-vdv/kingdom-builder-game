import type { SessionMetadataDescriptor } from '@kingdom-builder/protocol/session';
import { formatLabel } from './registryMetadataBuilders';
import type { AssetMetadata } from './registryMetadataTypes';

export {
	buildPhaseMetadata,
	buildRegistryMetadata,
	buildResourceMetadata,
	buildStatMetadata,
	buildTriggerMetadata,
	createPhaseDescriptor,
	createRegistryDescriptor,
	createTriggerDescriptor,
	createLookup,
	formatLabel,
} from './registryMetadataBuilders';

export type {
	MetadataLookup,
	PhaseMetadata,
	PhaseStepMetadata,
	RegistryMetadataDescriptor,
	TriggerMetadata,
	AssetMetadata,
} from './registryMetadataTypes';

export const resolveAssetDescriptor = (
	id: string,
	descriptor: SessionMetadataDescriptor | undefined,
	fallback?: AssetMetadata,
): AssetMetadata => {
	if (!descriptor && !fallback) {
		throw new Error(
			`Missing descriptor for asset "${id}". ` +
				'Provide metadata for the asset or a fallback descriptor.',
		);
	}
	const entry: AssetMetadata = {
		id,
		label: descriptor?.label ?? fallback?.label ?? formatLabel(id),
	};
	const icon = descriptor?.icon ?? fallback?.icon;
	if (icon !== undefined) {
		entry.icon = icon;
	}
	const description = descriptor?.description ?? fallback?.description;
	if (description !== undefined) {
		entry.description = description;
	}
	return Object.freeze(entry);
};
