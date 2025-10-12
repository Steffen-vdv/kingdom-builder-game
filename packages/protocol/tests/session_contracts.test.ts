import { describe, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';
import type {
	SessionActionCostRequest,
	SessionActionCostResponse,
	SessionActionOptionsRequest,
	SessionActionOptionsResponse,
	SessionActionRequirementRequest,
	SessionActionRequirementResponse,
	SessionPlayerStateSnapshot,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '../src/session';
import type * as sessionSchemas from '../src/config/session_contracts';

describe('session contract schemas', () => {
	it('aligns action evaluation contracts with types', () => {
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionActionCostRequestSchema>
		>().toEqualTypeOf<SessionActionCostRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionActionCostResponseSchema>
		>().toEqualTypeOf<SessionActionCostResponse>();
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionActionRequirementRequestSchema>
		>().toEqualTypeOf<SessionActionRequirementRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionActionRequirementResponseSchema>
		>().toEqualTypeOf<SessionActionRequirementResponse>();
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionActionOptionsRequestSchema>
		>().toEqualTypeOf<SessionActionOptionsRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionActionOptionsResponseSchema>
		>().toEqualTypeOf<SessionActionOptionsResponse>();
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionRunAiRequestSchema>
		>().toEqualTypeOf<SessionRunAiRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionRunAiResponseSchema>
		>().toEqualTypeOf<SessionRunAiResponse>();
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionSimulateRequestSchema>
		>().toEqualTypeOf<SessionSimulateRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionSchemas.sessionSimulateResponseSchema>
		>().toEqualTypeOf<SessionSimulateResponse>();
	});
	it('exposes optional aiControlled marker on player snapshots', () => {
		expectTypeOf<SessionPlayerStateSnapshot['aiControlled']>().toEqualTypeOf<
			boolean | undefined
		>();
	});
});
