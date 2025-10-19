import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	GameEngineRequests,
	PerformActionHandler,
} from './GameContext.types';
import type { SessionAdapter } from './sessionTypes';

interface RequestHelperDependencies {
	sessionAdapter: SessionAdapter;
	performAction: PerformActionHandler;
	advancePhase: GameEngineRequests['advancePhase'];
	refreshSession: GameEngineRequests['refreshSession'];
}

export function createSessionRequestHelpers({
	sessionAdapter,
	performAction,
	advancePhase,
	refreshSession,
}: RequestHelperDependencies): GameEngineRequests {
	return {
		performAction,
		advancePhase,
		refreshSession,
		hasAiController: (playerId) => sessionAdapter.hasAiController(playerId),
		readActionMetadata: (actionId, params) =>
			sessionAdapter.readActionMetadata(actionId, params),
		subscribeActionMetadata: (
			actionId,
			params: ActionParametersPayload | undefined,
			listener,
		) => sessionAdapter.subscribeActionMetadata(actionId, params, listener),
		getActionCosts: (actionId, params) =>
			sessionAdapter.getActionCosts(actionId, params),
		getActionRequirements: (actionId, params) =>
			sessionAdapter.getActionRequirements(actionId, params),
		enqueueTask: (task) => sessionAdapter.enqueue(task),
		simulateUpcomingPhases: (playerId) =>
			sessionAdapter.simulateUpcomingPhases(playerId),
	};
}
