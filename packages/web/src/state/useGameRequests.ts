import { useMemo } from 'react';
import type { Session } from './sessionTypes';
import type {
	AdvancePhaseHandler,
	GameEngineRequests,
	PerformActionHandler,
	RefreshSessionHandler,
} from './GameContext.types';
import type { SessionPlayerId } from '@kingdom-builder/protocol/session';

type EnqueueTask = GameEngineRequests['enqueueTask'];

type UseGameRequestsOptions = {
	session: Session;
	performAction: PerformActionHandler;
	advancePhase: AdvancePhaseHandler;
	refreshSession: RefreshSessionHandler;
	enqueue: EnqueueTask;
};

export function useGameRequests({
	session,
	performAction,
	advancePhase,
	refreshSession,
	enqueue,
}: UseGameRequestsOptions): GameEngineRequests {
	return useMemo<GameEngineRequests>(
		() => ({
			performAction,
			advancePhase,
			refreshSession,
			hasAiController: (playerId: SessionPlayerId) =>
				session.hasAiController(playerId),
			readActionMetadata: (actionId, params) =>
				session.readActionMetadata(actionId, params),
			subscribeActionMetadata: (actionId, params, listener) =>
				session.subscribeActionMetadata(actionId, params, listener),
			getActionCosts: (actionId, params) =>
				session.getActionCosts(actionId, params),
			getActionRequirements: (actionId, params) =>
				session.getActionRequirements(actionId, params),
			simulateUpcomingPhases: (playerId: SessionPlayerId, options) =>
				session.simulateUpcomingPhases(playerId, options),
			enqueueTask: (task) => enqueue(task),
		}),
		[session, performAction, advancePhase, refreshSession, enqueue],
	);
}
