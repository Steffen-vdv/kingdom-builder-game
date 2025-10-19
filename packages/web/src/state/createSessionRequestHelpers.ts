import type {
	AdvancePhaseHandler,
	GameEngineContextValue,
	PerformActionHandler,
	RefreshSessionHandler,
} from './GameContext.types';
import type { SessionAdapter } from './sessionTypes';

interface CreateSessionRequestHelpersOptions {
	sessionAdapter: SessionAdapter;
	performAction: PerformActionHandler;
	advancePhase: AdvancePhaseHandler;
	refreshSession: RefreshSessionHandler;
	enqueue: <T>(task: () => Promise<T> | T) => Promise<T>;
}

export function createSessionRequestHelpers({
	sessionAdapter,
	performAction,
	advancePhase,
	refreshSession,
	enqueue,
}: CreateSessionRequestHelpersOptions): GameEngineContextValue['requests'] {
	return {
		performAction,
		advancePhase,
		refreshSession,
		hasAiController: (playerId) => sessionAdapter.hasAiController(playerId),
		readActionMetadata: (actionId, params) =>
			sessionAdapter.readActionMetadata(actionId, params),
		subscribeActionMetadata: (actionId, params, listener) =>
			sessionAdapter.subscribeActionMetadata(actionId, params, listener),
		getActionCosts: (actionId, params) =>
			sessionAdapter.getActionCosts(actionId, params),
		getActionRequirements: (actionId, params) =>
			sessionAdapter.getActionRequirements(actionId, params),
		enqueueTask: enqueue,
		simulateUpcomingPhases: (playerId, options) =>
			sessionAdapter.simulateUpcomingPhases(playerId, options),
	} satisfies GameEngineContextValue['requests'];
}
