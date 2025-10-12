import type { SessionRegistriesPayload } from '@kingdom-builder/protocol/session';
import snapshot from './defaultRegistryMetadata.data.json';

interface FallbackMetadataSources {
	resources: Record<
		string,
		{
			label?: string | undefined;
			icon?: string | undefined;
			description?: string | undefined;
		}
	>;
	stats: Record<
		string,
		{
			label?: string | undefined;
			icon?: string | undefined;
			description?: string | undefined;
		}
	>;
	phases: Array<{
		id: string;
		label?: string | undefined;
		icon?: string | undefined;
		action?: boolean | undefined;
		steps?: Array<{
			id: string;
			title?: string | undefined;
			icon?: string | undefined;
			triggers?: string[] | undefined;
		}>;
	}>;
	triggers: Record<
		string,
		{
			icon?: string | undefined;
			future: string;
			past: string;
		}
	>;
	assets: {
		land: { label?: string | undefined; icon?: string | undefined };
		slot: { label?: string | undefined; icon?: string | undefined };
		passive: { label?: string | undefined; icon?: string | undefined };
	};
}

interface FallbackSnapshot {
	registries: SessionRegistriesPayload;
	metadataSources: FallbackMetadataSources;
}

const snapshotData = snapshot as FallbackSnapshot;

export const FALLBACK_REGISTRY_DATA = snapshotData.registries;
export const FALLBACK_METADATA_SOURCES = snapshotData.metadataSources;
