import { describe, it, expectTypeOf } from 'vitest';
import type {
	SessionAdvanceRequest,
	SessionAdvanceResponse,
	SessionCreateRequest,
	SessionCreateResponse,
	SessionGateway,
	SessionIdentifier,
	SessionSetDevModeRequest,
	SessionSetDevModeResponse,
	SessionStateResponse,
} from '../src/session';
import type {
	ActionDescribeRequest,
	ActionDescribeResponse,
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
		expectTypeOf<SessionGateway['describeAction']>()
			.parameter(0)
			.toEqualTypeOf<ActionDescribeRequest>();
		expectTypeOf<SessionGateway['describeAction']>().returns.toEqualTypeOf<
			Promise<ActionDescribeResponse>
		>();
		expectTypeOf<SessionGateway['performAction']>()
			.parameter(0)
			.toEqualTypeOf<ActionExecuteRequest>();
		expectTypeOf<SessionGateway['performAction']>().returns.toEqualTypeOf<
			Promise<ActionExecuteResponse>
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
	});
});
