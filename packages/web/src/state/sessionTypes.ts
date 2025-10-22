import type {
	SessionActionCostMap,
	SessionActionDefinitionSummary,
	SessionActionRequirementList,
	SessionAdvanceResult,
	SessionPlayerId,
	SessionRuleSnapshot,
	SessionRunAiResponse,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SimulateUpcomingPhasesOptions,
	SimulateUpcomingPhasesResult,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { SessionStateRecord } from './sessionStateStore';
import type { SessionRegistries } from './sessionRegistries';

export interface SessionAiTurnResult {
	ranTurn: SessionRunAiResponse['ranTurn'];
	actions: SessionRunAiResponse['actions'];
	phaseComplete: SessionRunAiResponse['phaseComplete'];
	snapshot: SessionSnapshot;
	registries: SessionRegistries;
}

export interface SessionAdapter {
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getSnapshot(): SessionSnapshot;
	getActionCosts(
		actionId: string,
		params?: ActionParametersPayload,
		playerId?: SessionPlayerId,
	): SessionActionCostMap;
	getActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
		playerId?: SessionPlayerId,
	): SessionActionRequirementList;
	getActionOptions(actionId: string): ActionEffectGroup[];
	getActionDefinition(
		actionId: string,
	): SessionActionDefinitionSummary | undefined;
	readActionMetadata(
		actionId: string,
		params?: ActionParametersPayload,
		playerId?: SessionPlayerId,
	): SessionActionMetadataSnapshot;
	subscribeActionMetadata(
		actionId: string,
		params: ActionParametersPayload | undefined,
		playerId: SessionPlayerId | undefined,
		listener: (snapshot: SessionActionMetadataSnapshot) => void,
	): () => void;
	runAiTurn(playerId: SessionPlayerId): Promise<SessionAiTurnResult>;
	hasAiController(playerId: SessionPlayerId): boolean;
	simulateUpcomingPhases(
		playerId: SessionPlayerId,
		options?: SimulateUpcomingPhasesOptions,
	): SimulateUpcomingPhasesResult;
	advancePhase(): SessionAdvanceResult;
	setDevMode(enabled: boolean): void;
	updatePlayerName(playerId: SessionPlayerId, name: string): void;
}

export type Session = SessionAdapter;
export type SessionResourceKeys = string[];
export type SessionResourceKey = SessionResourceKeys[number];
export type SessionMetadata = SessionSnapshotMetadata;

export type RemoteSessionRecord = Pick<
	SessionStateRecord,
	| 'sessionId'
	| 'snapshot'
	| 'ruleSnapshot'
	| 'registries'
	| 'resourceKeys'
	| 'metadata'
	| 'queueSeed'
>;

export type SessionQueueSeed = SessionStateRecord['queueSeed'];

export type { SessionRuleSnapshot, SessionSnapshot };
export type { SessionRegistries } from './sessionRegistries';

export interface SessionQueueHelpers {
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getCurrentSession: () => Session;
	getLatestSnapshot: () => SessionSnapshot | null;
}

export interface SessionActionMetadataSnapshot {
	costs?: SessionActionCostMap;
	requirements?: SessionActionRequirementList;
	groups?: ActionEffectGroup[];
	stale?: {
		costs?: boolean;
		requirements?: boolean;
		groups?: boolean;
	};
}
