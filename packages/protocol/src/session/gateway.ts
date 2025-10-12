import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
} from '../actions/contracts';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionIdentifier,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionStateResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from './contracts';

export interface SessionGateway {
	createSession(request?: SessionCreateRequest): Promise<SessionCreateResponse>;
	fetchSnapshot(request: SessionIdentifier): Promise<SessionStateResponse>;
	performAction(request: ActionExecuteRequest): Promise<ActionExecuteResponse>;
	fetchActionCosts(
		request: SessionActionCostRequest,
	): Promise<SessionActionCostResponse>;
	fetchActionRequirements(
		request: SessionActionRequirementRequest,
	): Promise<SessionActionRequirementResponse>;
	fetchActionOptions(
		request: SessionActionOptionsRequest,
	): Promise<SessionActionOptionsResponse>;
	advancePhase(request: SessionAdvanceRequest): Promise<SessionAdvanceResponse>;
	setDevMode(
		request: SessionSetDevModeRequest,
	): Promise<SessionSetDevModeResponse>;
	runAi(request: SessionRunAiRequest): Promise<SessionRunAiResponse>;
	simulateUpcomingPhases(
		request: SessionSimulateRequest,
	): Promise<SessionSimulateResponse>;
}
