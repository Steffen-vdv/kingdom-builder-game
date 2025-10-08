import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	RESOURCES,
} from '@kingdom-builder/contents';
import type { ResourceKey } from '@kingdom-builder/contents';
type SessionRegistries = {
	actions: typeof ACTIONS;
	buildings: typeof BUILDINGS;
	developments: typeof DEVELOPMENTS;
};

const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];

const SESSION_REGISTRIES: SessionRegistries = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
};

export { RESOURCE_KEYS, SESSION_REGISTRIES };
export type { ResourceKey, SessionRegistries };
