import {
	RESOURCES,
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	type ResourceKey,
} from '@kingdom-builder/contents';
import type { SessionRegistries } from './sessionSelectors.types';

const RESOURCE_KEYS = Object.keys(RESOURCES) as ResourceKey[];

type SessionResourceKey = (typeof RESOURCE_KEYS)[number];

const SESSION_REGISTRIES: SessionRegistries = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
};

const TRANSLATION_REGISTRIES = {
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
};

export { RESOURCE_KEYS, SESSION_REGISTRIES, TRANSLATION_REGISTRIES };
export type { SessionResourceKey };
