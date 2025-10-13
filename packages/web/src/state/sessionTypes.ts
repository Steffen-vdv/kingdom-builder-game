import type {
	ActionEffectGroup,
	ActionTrace,
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
} from '@kingdom-builder/protocol';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { SessionRegistries } from './sessionRegistries';

export type SessionResourceKey = string;
export type SessionResourceKeys = SessionResourceKey[];
export type SessionMetadata = SessionSnapshotMetadata;

export type SessionQueueSeed = Promise<void>;
export type SessionQueueTask<T> = () => Promise<T> | T;

export interface Session {
	enqueue<T>(task: SessionQueueTask<T>): Promise<T>;
	advancePhase(): SessionAdvanceResult;
	performAction(
		actionId: string,
		params?: ActionParametersPayload,
	): ActionTrace[];
}

export interface LegacySession {
	enqueue<T>(task: SessionQueueTask<T>): Promise<T>;
	getSnapshot(): SessionSnapshot;
	getActionOptions(actionId: string): ActionEffectGroup[];
	getActionCosts(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionCostMap;
	getActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionRequirementList;
	getActionDefinition(
		actionId: string,
	): SessionActionDefinitionSummary | undefined;
	advancePhase(): SessionAdvanceResult;
	runAiTurn(playerId: SessionPlayerId, overrides?: unknown): Promise<boolean>;
	hasAiController(playerId: SessionPlayerId): boolean;
	simulateUpcomingPhases(
		playerId: SessionPlayerId,
		options?: SimulateUpcomingPhasesOptions,
	): SimulateUpcomingPhasesResult;
	setDevMode(enabled: boolean): void;
	updatePlayerName(playerId: SessionPlayerId, name: string): void;
}

export interface RemoteSessionState {
	snapshot: SessionSnapshot;
	ruleSnapshot: SessionRuleSnapshot;
	registries: SessionRegistries;
	resourceKeys: SessionResourceKeys;
	metadata: SessionMetadata;
}

export interface RemoteSessionRecord extends RemoteSessionState {
	sessionId: string;
	session: Session;
	legacySession: LegacySession;
}

export interface SessionQueueHelpers {
	enqueue<T>(task: SessionQueueTask<T>): Promise<T>;
	getCurrentSession: () => Session;
	getLegacySession: () => LegacySession;
	getLatestSnapshot: () => SessionSnapshot | null;
}

export type { SessionRuleSnapshot, SessionSnapshot };
export type { SessionRegistries };
