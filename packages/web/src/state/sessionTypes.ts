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
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
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
	getActionRequirements(
		actionId: string,
		params?: ActionParametersPayload,
	): SessionActionRequirementList;
	getActionOptions(actionId: string): ActionEffectGroup[];
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

export type Session = Pick<LegacySession, 'enqueue'>;
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
	getLegacySession: () => LegacySession;
	getLatestSnapshot: () => SessionSnapshot | null;
}
