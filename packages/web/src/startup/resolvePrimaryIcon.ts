import type {
	SessionSnapshotMetadata,
	SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';

type ResourceRecord = Record<string, SessionResourceDefinition>;

export interface PrimaryIconSources {
	metadata?: SessionSnapshotMetadata | null | undefined;
	resources?: ResourceRecord | undefined;
	primaryResourceKey?: string | null | undefined;
}

function getResourceIconFromMetadata(
	metadata: SessionSnapshotMetadata | null | undefined,
	resourceKey: string,
): string | undefined {
	const descriptor = metadata?.resources?.[resourceKey];
	if (descriptor && typeof descriptor.icon === 'string' && descriptor.icon) {
		return descriptor.icon;
	}
	return undefined;
}

function getResourceIconFromDefinitions(
	resources: ResourceRecord | undefined,
	resourceKey: string,
): string | undefined {
	const definition = resources?.[resourceKey];
	if (definition && typeof definition.icon === 'string' && definition.icon) {
		return definition.icon;
	}
	return undefined;
}

function findFirstMetadataIcon(
	metadata: SessionSnapshotMetadata | null | undefined,
): string | undefined {
	if (!metadata?.resources) {
		return undefined;
	}
	for (const descriptor of Object.values(metadata.resources)) {
		if (descriptor && typeof descriptor.icon === 'string' && descriptor.icon) {
			return descriptor.icon;
		}
	}
	return undefined;
}

function findFirstResourceIcon(
	resources: ResourceRecord | undefined,
): string | undefined {
	if (!resources) {
		return undefined;
	}
	for (const definition of Object.values(resources)) {
		if (definition && typeof definition.icon === 'string' && definition.icon) {
			return definition.icon;
		}
	}
	return undefined;
}

export function resolvePrimaryIcon({
	metadata,
	resources,
	primaryResourceKey,
}: PrimaryIconSources): string | undefined {
	const assetIcon = metadata?.assets?.primary?.icon;
	if (assetIcon) {
		return assetIcon;
	}
	if (primaryResourceKey) {
		const iconFromMetadata = getResourceIconFromMetadata(
			metadata,
			primaryResourceKey,
		);
		if (iconFromMetadata) {
			return iconFromMetadata;
		}
		const iconFromDefinitions = getResourceIconFromDefinitions(
			resources,
			primaryResourceKey,
		);
		if (iconFromDefinitions) {
			return iconFromDefinitions;
		}
	}
	const metadataFallback = findFirstMetadataIcon(metadata);
	if (metadataFallback) {
		return metadataFallback;
	}
	return findFirstResourceIcon(resources);
}
