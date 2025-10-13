import type {
        SessionRegistriesPayload,
        SessionResourceDefinition,
} from '@kingdom-builder/protocol/session';
import {
        createDefaultRegistriesPayload,
} from './defaultRegistrySnapshot';
import {
        deserializeSessionRegistries,
        type SessionRegistries,
} from '../../src/state/sessionRegistries';

const BASE_PAYLOAD = createDefaultRegistriesPayload();
type ResourceKey = SessionResourceDefinition['key'];

function cloneResourceDefinition(
        definition: SessionResourceDefinition,
): SessionResourceDefinition {
        const clone: SessionResourceDefinition = { key: definition.key };
        if (definition.icon !== undefined) {
                clone.icon = definition.icon;
        }
        if (definition.label !== undefined) {
                clone.label = definition.label;
        }
        if (definition.description !== undefined) {
                clone.description = definition.description;
        }
        if (definition.tags && definition.tags.length > 0) {
                clone.tags = [...definition.tags];
        }
        return clone;
}

function cloneRegistriesPayload(
        payload: SessionRegistriesPayload,
): SessionRegistriesPayload {
        const cloneValue = <T>(value: T): T => {
                return JSON.parse(JSON.stringify(value)) as T;
        };
        const cloneEntries = <T>(entries: Record<string, T> | undefined) => {
                if (!entries) {
                        return {};
                }
                return Object.fromEntries(
                        Object.entries(entries).map(([id, definition]) => [
                                id,
                                cloneValue(definition),
                        ]),
                );
        };
        return {
                actions: cloneEntries(payload.actions),
                buildings: cloneEntries(payload.buildings),
                developments: cloneEntries(payload.developments),
                populations: cloneEntries(payload.populations),
                resources: Object.fromEntries(
                        Object.entries(payload.resources ?? {}).map(([key, definition]) => [
                                key,
                                cloneResourceDefinition(definition),
                        ]),
                ),
        };
}

export function createSessionRegistriesPayload(): SessionRegistriesPayload {
        return cloneRegistriesPayload(BASE_PAYLOAD);
}

export function createSessionRegistries(): SessionRegistries {
        return deserializeSessionRegistries(createSessionRegistriesPayload());
}

export function createResourceKeys(): ResourceKey[] {
        return Object.keys(BASE_PAYLOAD.resources ?? {}) as ResourceKey[];
}
