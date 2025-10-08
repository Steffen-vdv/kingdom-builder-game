import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
} from '../actions/contracts';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionIdentifier,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionStateResponse,
} from './contracts';

export interface SessionGateway {
	createSession(request?: SessionCreateRequest): Promise<SessionCreateResponse>;
	fetchSnapshot(request: SessionIdentifier): Promise<SessionStateResponse>;
	performAction(request: ActionExecuteRequest): Promise<ActionExecuteResponse>;
	advancePhase(request: SessionAdvanceRequest): Promise<SessionAdvanceResponse>;
	setDevMode(
		request: SessionSetDevModeRequest,
	): Promise<SessionSetDevModeResponse>;
}
