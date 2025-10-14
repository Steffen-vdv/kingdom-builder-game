import type {
	SessionSnapshot,
	SessionRegistriesPayload,
} from '@kingdom-builder/protocol/session';
import { GameApiFake } from '../../src/services/gameApi';
import {
	getOrCreateRemoteAdapter,
	deleteRemoteAdapter,
} from '../../src/state/remoteSessionAdapter';
import type { RemoteSessionAdapter } from '../../src/state/remoteSessionAdapter';
import {
	initializeSessionState,
	deleteSessionRecord,
	type SessionStateRecord,
} from '../../src/state/sessionStateStore';

interface CreateRemoteSessionAdapterOptions {
	sessionId?: string;
	snapshot: SessionSnapshot;
	registries: SessionRegistriesPayload;
	api?: GameApiFake;
}

export interface RemoteSessionAdapterHarness {
	sessionId: string;
	snapshot: SessionSnapshot;
	registries: SessionRegistriesPayload;
	adapter: RemoteSessionAdapter;
	api: GameApiFake;
	record: SessionStateRecord;
	cleanup: () => void;
}

export function createRemoteSessionAdapter({
	sessionId: explicitSessionId,
	snapshot,
	registries,
	api: providedApi,
}: CreateRemoteSessionAdapterOptions): RemoteSessionAdapterHarness {
	const sessionId = explicitSessionId ?? 'session:test';
	const api = providedApi ?? new GameApiFake();
	api.primeSession({ sessionId, snapshot, registries });
	const response = { sessionId, snapshot, registries };
	const record = initializeSessionState(response);
	const adapter = getOrCreateRemoteAdapter(sessionId, {
		ensureGameApi: () => api,
		runAiTurn: (request) => api.runAiTurn(request),
	});
	const cleanup = () => {
		deleteRemoteAdapter(sessionId);
		deleteSessionRecord(sessionId);
	};
	return { sessionId, snapshot, registries, adapter, api, record, cleanup };
}
