import type {
	SessionRunAiRequest,
	SessionRunAiResponse,
} from '@kingdom-builder/protocol/session';
import type { GameApi } from '../../src/services/gameApi';
import { RemoteSessionAdapter } from '../../src/state/remoteSessionAdapter';
import { assertSessionRecord } from '../../src/state/sessionStateStore';

interface RemoteAdapterOptions {
	sessionId: string;
	ensureGameApi?: () => GameApi;
	runAiTurn?: (request: SessionRunAiRequest) => Promise<SessionRunAiResponse>;
}

const createEmptyRegistries = (): SessionRunAiResponse['registries'] => ({
	actions: {},
	buildings: {},
	developments: {},
	populations: {},
	resources: {},
});

export function createRemoteSessionAdapter({
	sessionId,
	ensureGameApi = () => ({}) as GameApi,
	runAiTurn,
}: RemoteAdapterOptions): RemoteSessionAdapter {
	const fallbackRunAiTurn = (
		request: SessionRunAiRequest,
	): Promise<SessionRunAiResponse> => {
		const record = assertSessionRecord(request.sessionId);
		return Promise.resolve({
			sessionId: request.sessionId,
			snapshot: record.snapshot,
			registries: createEmptyRegistries(),
			ranTurn: false,
		} satisfies SessionRunAiResponse);
	};
	return new RemoteSessionAdapter(sessionId, {
		ensureGameApi,
		runAiTurn: runAiTurn ?? fallbackRunAiTurn,
	});
}
