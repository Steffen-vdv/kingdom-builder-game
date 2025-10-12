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
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionStateResponse,
} from './contracts';

export interface SessionGateway {
	createSession(request?: SessionCreateRequest): Promise<SessionCreateResponse>;
	fetchSnapshot(request: SessionIdentifier): Promise<SessionStateResponse>;
	performAction(request: ActionExecuteRequest): Promise<ActionExecuteResponse>;
	advancePhase(request: SessionAdvanceRequest): Promise<SessionAdvanceResponse>;
	getActionCosts(
		request: SessionActionCostRequest,
	): Promise<SessionActionCostResponse>;
	getActionRequirements(
		request: SessionActionRequirementRequest,
	): Promise<SessionActionRequirementResponse>;
	getActionOptions(
		request: SessionActionOptionsRequest,
	): Promise<SessionActionOptionsResponse>;
	runAiTurn(request: SessionRunAiRequest): Promise<SessionRunAiResponse>;
	simulateUpcomingPhases(
		request: SessionSimulateRequest,
	): Promise<SessionSimulateResponse>;
	setDevMode(
		request: SessionSetDevModeRequest,
	): Promise<SessionSetDevModeResponse>;
}
