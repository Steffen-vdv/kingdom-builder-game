import type {
        SessionRegistriesPayload,
        SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import type { OverviewContentTemplate } from '../../src/components/overview/overviewContentTypes';
import snapshot from '../../src/contexts/defaultRegistryMetadata.json';

interface DefaultRegistrySnapshot {
        readonly registries: SessionRegistriesPayload;
        readonly metadata: SessionSnapshotMetadata;
        readonly overviewContent: OverviewContentTemplate;
}

const BASE_SNAPSHOT = snapshot as DefaultRegistrySnapshot;

function clone<T>(value: T): T {
        return JSON.parse(JSON.stringify(value)) as T;
}

export function createDefaultRegistriesPayload(): SessionRegistriesPayload {
        return clone(BASE_SNAPSHOT.registries);
}

export function createDefaultRegistryMetadata(): SessionSnapshotMetadata {
        return clone(BASE_SNAPSHOT.metadata);
}

export function createDefaultOverviewContent(): OverviewContentTemplate {
        return clone(BASE_SNAPSHOT.overviewContent);
}
