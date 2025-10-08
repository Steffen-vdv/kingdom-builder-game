import type { GameConfig } from '../config/schema';
import type {
	SessionAdvanceResult,
	SessionPlayerId,
	SessionSnapshot,
} from './index';

export interface SessionIdentifier {
	sessionId: string;
}

export type SessionPlayerNameMap = Partial<Record<SessionPlayerId, string>>;

export interface SessionCreateRequest {
	devMode?: boolean;
	config?: GameConfig;
	playerNames?: SessionPlayerNameMap;
}

export interface SessionCreateResponse {
	sessionId: string;
	snapshot: SessionSnapshot;
}

export type SessionStateResponse = SessionCreateResponse;

export interface SessionAdvanceRequest extends SessionIdentifier {}

export interface SessionAdvanceResponse extends SessionStateResponse {
	advance: SessionAdvanceResult;
}

export interface SessionSetDevModeRequest extends SessionIdentifier {
	enabled: boolean;
}

export type SessionSetDevModeResponse = SessionStateResponse;
