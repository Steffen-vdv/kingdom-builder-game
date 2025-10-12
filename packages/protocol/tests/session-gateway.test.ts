import { describe, it, expectTypeOf } from 'vitest';
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
	SessionGateway,
	SessionIdentifier,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionStateResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '../src/session';
import type {
	ActionExecuteRequest,
	ActionExecuteResponse,
} from '../src/actions/contracts';

describe('SessionGateway', () => {
	it('uses protocol contract types', () => {
		expectTypeOf<SessionGateway['createSession']>()
			.parameter(0)
			.toEqualTypeOf<SessionCreateRequest | undefined>();
		expectTypeOf<SessionGateway['createSession']>().returns.toEqualTypeOf<
			Promise<SessionCreateResponse>
		>();
		expectTypeOf<SessionGateway['fetchSnapshot']>()
			.parameter(0)
			.toEqualTypeOf<SessionIdentifier>();
		expectTypeOf<SessionGateway['fetchSnapshot']>().returns.toEqualTypeOf<
			Promise<SessionStateResponse>
		>();
		expectTypeOf<SessionGateway['performAction']>()
			.parameter(0)
			.toEqualTypeOf<ActionExecuteRequest>();
		expectTypeOf<SessionGateway['performAction']>().returns.toEqualTypeOf<
			Promise<ActionExecuteResponse>
		>();
		expectTypeOf<SessionGateway['fetchActionCosts']>()
			.parameter(0)
			.toEqualTypeOf<SessionActionCostRequest>();
		expectTypeOf<SessionGateway['fetchActionCosts']>().returns.toEqualTypeOf<
			Promise<SessionActionCostResponse>
		>();
		expectTypeOf<SessionGateway['fetchActionRequirements']>()
			.parameter(0)
			.toEqualTypeOf<SessionActionRequirementRequest>();
		expectTypeOf<
			SessionGateway['fetchActionRequirements']
		>().returns.toEqualTypeOf<Promise<SessionActionRequirementResponse>>();
		expectTypeOf<SessionGateway['fetchActionOptions']>()
			.parameter(0)
			.toEqualTypeOf<SessionActionOptionsRequest>();
		expectTypeOf<SessionGateway['fetchActionOptions']>().returns.toEqualTypeOf<
			Promise<SessionActionOptionsResponse>
		>();
		expectTypeOf<SessionGateway['advancePhase']>()
			.parameter(0)
			.toEqualTypeOf<SessionAdvanceRequest>();
		expectTypeOf<SessionGateway['advancePhase']>().returns.toEqualTypeOf<
			Promise<SessionAdvanceResponse>
		>();
		expectTypeOf<SessionGateway['setDevMode']>()
			.parameter(0)
			.toEqualTypeOf<SessionSetDevModeRequest>();
		expectTypeOf<SessionGateway['setDevMode']>().returns.toEqualTypeOf<
			Promise<SessionSetDevModeResponse>
		>();
		expectTypeOf<SessionGateway['runAi']>()
			.parameter(0)
			.toEqualTypeOf<SessionRunAiRequest>();
		expectTypeOf<SessionGateway['runAi']>().returns.toEqualTypeOf<
			Promise<SessionRunAiResponse>
		>();
		expectTypeOf<SessionGateway['simulateUpcomingPhases']>()
			.parameter(0)
			.toEqualTypeOf<SessionSimulateRequest>();
		expectTypeOf<
			SessionGateway['simulateUpcomingPhases']
		>().returns.toEqualTypeOf<Promise<SessionSimulateResponse>>();
	});
});
