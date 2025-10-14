import type {
	SessionCreateResponse,
	SessionStateResponse,
} from '@kingdom-builder/protocol/session';
import { clone } from './gameApi.clone';

export type SessionLikeResponse = Pick<
	SessionCreateResponse,
	'sessionId' | 'snapshot' | 'registries'
>;

export const toStateResponse = (
	response: SessionLikeResponse,
): SessionStateResponse => ({
	sessionId: response.sessionId,
	snapshot: clone(response.snapshot),
	registries: clone(response.registries),
});

export const EMPTY_REGISTRIES = {
	actions: {},
	buildings: {},
	developments: {},
	populations: {},
	resources: {},
} as const;
