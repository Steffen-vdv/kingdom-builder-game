import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
} from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionMetadataSnapshotResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
	SessionStateResponse,
	SessionUpdatePlayerNameRequest,
	SessionUpdatePlayerNameResponse,
} from '@kingdom-builder/protocol/session';
import type { VisitorStatsResponse } from '@kingdom-builder/protocol/visitors';
import type { GameApi, GameApiRequestOptions } from './gameApi';

const missingHandlerMessage = (name: keyof GameApiMockHandlers) =>
	[
		`Missing handler for ${name}.`,
		'Configure createGameApiMock with a handler before using this mock.',
	].join(' ');

export type GameApiMockHandlers = {
	createSession?: (
		request: SessionCreateRequest,
		options?: GameApiRequestOptions,
	) => Promise<SessionCreateResponse> | SessionCreateResponse;
	fetchMetadataSnapshot?: (
		options?: GameApiRequestOptions,
	) =>
		| Promise<SessionMetadataSnapshotResponse>
		| SessionMetadataSnapshotResponse;
	fetchSnapshot?: (
		sessionId: string,
		options?: GameApiRequestOptions,
	) => Promise<SessionStateResponse> | SessionStateResponse;
	performAction?: (
		request: ActionExecuteRequest,
		options?: GameApiRequestOptions,
	) => Promise<ActionExecuteResponse> | ActionExecuteResponse;
	advancePhase?: (
		request: SessionAdvanceRequest,
		options?: GameApiRequestOptions,
	) => Promise<SessionAdvanceResponse> | SessionAdvanceResponse;
	setDevMode?: (
		request: SessionSetDevModeRequest,
		options?: GameApiRequestOptions,
	) => Promise<SessionSetDevModeResponse> | SessionSetDevModeResponse;
	updatePlayerName?: (
		request: SessionUpdatePlayerNameRequest,
		options?: GameApiRequestOptions,
	) =>
		| Promise<SessionUpdatePlayerNameResponse>
		| SessionUpdatePlayerNameResponse;
	getActionCosts?: (
		request: SessionActionCostRequest,
		options?: GameApiRequestOptions,
	) => Promise<SessionActionCostResponse> | SessionActionCostResponse;
	getActionRequirements?: (
		request: SessionActionRequirementRequest,
		options?: GameApiRequestOptions,
	) =>
		| Promise<SessionActionRequirementResponse>
		| SessionActionRequirementResponse;
	getActionOptions?: (
		request: SessionActionOptionsRequest,
		options?: GameApiRequestOptions,
	) => Promise<SessionActionOptionsResponse> | SessionActionOptionsResponse;
	runAiTurn?: (
		request: SessionRunAiRequest,
		options?: GameApiRequestOptions,
	) => Promise<SessionRunAiResponse> | SessionRunAiResponse;
	simulateUpcomingPhases?: (
		request: SessionSimulateRequest,
		options?: GameApiRequestOptions,
	) => Promise<SessionSimulateResponse> | SessionSimulateResponse;
	fetchVisitorStats?: (
		options?: GameApiRequestOptions,
	) => Promise<VisitorStatsResponse> | VisitorStatsResponse;
};

const resolveHandler = async <TArgs extends unknown[], TResult>(
	handler: ((...args: TArgs) => Promise<TResult> | TResult) | undefined,
	handlerName: keyof GameApiMockHandlers,
	...args: TArgs
): Promise<TResult> => {
	if (!handler) {
		throw new Error(missingHandlerMessage(handlerName));
	}

	return handler(...args);
};

export const createGameApiMock = (
	handlers: GameApiMockHandlers = {},
): GameApi => ({
	createSession: (
		request: SessionCreateRequest = {},
		options: GameApiRequestOptions = {},
	) =>
		resolveHandler(handlers.createSession, 'createSession', request, options),
	fetchMetadataSnapshot: (options: GameApiRequestOptions = {}) =>
		resolveHandler(
			handlers.fetchMetadataSnapshot,
			'fetchMetadataSnapshot',
			options,
		),
	fetchSnapshot: (sessionId: string, options: GameApiRequestOptions = {}) =>
		resolveHandler(handlers.fetchSnapshot, 'fetchSnapshot', sessionId, options),
	performAction: (
		request: ActionExecuteRequest,
		options: GameApiRequestOptions = {},
	) =>
		resolveHandler(handlers.performAction, 'performAction', request, options),
	advancePhase: (
		request: SessionAdvanceRequest,
		options: GameApiRequestOptions = {},
	) => resolveHandler(handlers.advancePhase, 'advancePhase', request, options),
	setDevMode: (
		request: SessionSetDevModeRequest,
		options: GameApiRequestOptions = {},
	) => resolveHandler(handlers.setDevMode, 'setDevMode', request, options),
	updatePlayerName: (
		request: SessionUpdatePlayerNameRequest,
		options: GameApiRequestOptions = {},
	) =>
		resolveHandler(
			handlers.updatePlayerName,
			'updatePlayerName',
			request,
			options,
		),
	getActionCosts: (
		request: SessionActionCostRequest,
		options: GameApiRequestOptions = {},
	) =>
		resolveHandler(handlers.getActionCosts, 'getActionCosts', request, options),
	getActionRequirements: (
		request: SessionActionRequirementRequest,
		options: GameApiRequestOptions = {},
	) =>
		resolveHandler(
			handlers.getActionRequirements,
			'getActionRequirements',
			request,
			options,
		),
	getActionOptions: (
		request: SessionActionOptionsRequest,
		options: GameApiRequestOptions = {},
	) =>
		resolveHandler(
			handlers.getActionOptions,
			'getActionOptions',
			request,
			options,
		),
	runAiTurn: (
		request: SessionRunAiRequest,
		options: GameApiRequestOptions = {},
	) => resolveHandler(handlers.runAiTurn, 'runAiTurn', request, options),
	simulateUpcomingPhases: (
		request: SessionSimulateRequest,
		options: GameApiRequestOptions = {},
	) =>
		resolveHandler(
			handlers.simulateUpcomingPhases,
			'simulateUpcomingPhases',
			request,
			options,
		),
	fetchVisitorStats: (options: GameApiRequestOptions = {}) =>
		resolveHandler(handlers.fetchVisitorStats, 'fetchVisitorStats', options),
});

export { GameApiFake } from './gameApi.fake';
export type { GameApiFakeState } from './gameApi.fake';
