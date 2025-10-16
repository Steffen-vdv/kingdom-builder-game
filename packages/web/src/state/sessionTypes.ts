import type {
	SessionActionCostMap,
	SessionActionDefinitionSummary,
	SessionActionRequirementList,
	SessionAdvanceResult,
	SessionPlayerId,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SimulateUpcomingPhasesOptions,
	SimulateUpcomingPhasesResult,
} from '@kingdom-builder/protocol/session';
import type {
	ActionEffectGroup,
	SessionActionCostRequest,
	SessionActionOptionsRequest,
	SessionActionRequirementRequest,
} from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { SessionStateRecord } from './sessionStateStore';

export interface LegacySessionAiOverrides {
	performAction?: (
		actionId: string,
		context: unknown,
		params?: ActionParametersPayload,
	) => Promise<void> | void;
	advance?: (context: unknown) => Promise<void> | void;
}

export interface LegacySession {
	enqueue<T>(task: () => Promise<T> | T): Promise<T>;
	getSnapshot(): SessionSnapshot;
	getActionCosts(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionCostMap;
	hasActionCosts(actionId: string, params?: ActionParametersPayload): boolean;
	recordActionCosts(
		request: SessionActionCostRequest,
		response: SessionActionCostMap,
	): void;
	getActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionRequirementList;
	hasActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): boolean;
	recordActionRequirements(
		request: SessionActionRequirementRequest,
		response: SessionActionRequirementList,
	): void;
	getActionOptions(actionId: string): ActionEffectGroup[];
	hasActionOptions(actionId: string): boolean;
	recordActionOptions(
		request: SessionActionOptionsRequest,
		response: ActionEffectGroup[],
	): void;
	subscribeActionMetadata(actionId: string, listener: () => void): () => void;
	getActionMetadataVersion(actionId: string): number;
	getActionDefinition(
		actionId: string,
	): SessionActionDefinitionSummary | undefined;
	runAiTurn(
		playerId: SessionPlayerId,
		overrides?: LegacySessionAiOverrides,
	): Promise<boolean>;
	hasAiController(playerId: SessionPlayerId): boolean;
	simulateUpcomingPhases(
		playerId: SessionPlayerId,
		options?: SimulateUpcomingPhasesOptions,
	): SimulateUpcomingPhasesResult;
	advancePhase(): SessionAdvanceResult;
	setDevMode(enabled: boolean): void;
	updatePlayerName(playerId: SessionPlayerId, name: string): void;
}

export type Session = LegacySession;
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
