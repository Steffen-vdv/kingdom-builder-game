import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';
import {
	sessionActionCostRequestSchema,
	sessionActionCostResponseSchema,
	sessionActionRequirementRequestSchema,
	sessionActionRequirementResponseSchema,
	sessionActionOptionsRequestSchema,
	sessionActionOptionsResponseSchema,
	sessionRunAiRequestSchema,
	sessionRunAiResponseSchema,
	sessionSimulateRequestSchema,
	sessionSimulateResponseSchema,
	sessionRegistriesSchema,
	runtimeConfigResponseSchema,
} from '../src';
import type {
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
	SessionPlayerStateSnapshot,
	SessionResourceValueSnapshot,
} from '../src/session';
import type {
	SessionRuntimeConfigResponse,
	SessionRunAiAction,
	SessionRegistriesPayload,
	SessionActionCategoryRegistry,
	SessionResourceV2DefinitionRegistry,
	SessionResourceV2GroupRegistry,
} from '../src/session/contracts';

describe('session contract schemas', () => {
	it('match action support request and response types', () => {
		const actionSchemas = [
			sessionActionCostRequestSchema,
			sessionActionCostResponseSchema,
			sessionActionRequirementRequestSchema,
			sessionActionRequirementResponseSchema,
			sessionActionOptionsRequestSchema,
			sessionActionOptionsResponseSchema,
		];
		for (const schema of actionSchemas) {
			expect(schema).toBeDefined();
		}
		expectTypeOf<
			ZodInfer<typeof sessionActionCostRequestSchema>
		>().toEqualTypeOf<SessionActionCostRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionActionCostResponseSchema>
		>().toEqualTypeOf<SessionActionCostResponse>();
		expectTypeOf<
			ZodInfer<typeof sessionActionRequirementRequestSchema>
		>().toEqualTypeOf<SessionActionRequirementRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionActionRequirementResponseSchema>
		>().toEqualTypeOf<SessionActionRequirementResponse>();
		expectTypeOf<
			ZodInfer<typeof sessionActionOptionsRequestSchema>
		>().toEqualTypeOf<SessionActionOptionsRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionActionOptionsResponseSchema>
		>().toEqualTypeOf<SessionActionOptionsResponse>();
	});

	it('match AI and simulation request and response types', () => {
		const simSchemas = [
			sessionRunAiRequestSchema,
			sessionRunAiResponseSchema,
			sessionSimulateRequestSchema,
			sessionSimulateResponseSchema,
		];
		for (const schema of simSchemas) {
			expect(schema).toBeDefined();
		}
		expectTypeOf<
			ZodInfer<typeof sessionRunAiRequestSchema>
		>().toEqualTypeOf<SessionRunAiRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionRunAiResponseSchema>
		>().toEqualTypeOf<SessionRunAiResponse>();
		expectTypeOf<
			SessionRunAiResponse['actions'][number]
		>().toEqualTypeOf<SessionRunAiAction>();
		expectTypeOf<
			SessionRunAiResponse['phaseComplete']
		>().toEqualTypeOf<boolean>();
		expectTypeOf<
			ZodInfer<typeof sessionSimulateRequestSchema>
		>().toEqualTypeOf<SessionSimulateRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionSimulateResponseSchema>
		>().toEqualTypeOf<SessionSimulateResponse>();
	});

	it('matches the runtime config response type', () => {
		expect(runtimeConfigResponseSchema).toBeDefined();
		expectTypeOf<
			ZodInfer<typeof runtimeConfigResponseSchema>
		>().toEqualTypeOf<SessionRuntimeConfigResponse>();
		expectTypeOf<
			SessionRuntimeConfigResponse['resourceDefinitions']
		>().toEqualTypeOf<SessionResourceV2DefinitionRegistry | undefined>();
		expectTypeOf<
			SessionRuntimeConfigResponse['resourceGroups']
		>().toEqualTypeOf<SessionResourceV2GroupRegistry | undefined>();
	});

	it('matches the registries payload type including action categories', () => {
		expect(sessionRegistriesSchema).toBeDefined();
		expectTypeOf<
			ZodInfer<typeof sessionRegistriesSchema>
		>().toEqualTypeOf<SessionRegistriesPayload>();
		expectTypeOf<SessionRegistriesPayload['actionCategories']>().toEqualTypeOf<
			SessionActionCategoryRegistry | undefined
		>();
		expectTypeOf<
			SessionRegistriesPayload['resourceDefinitions']
		>().toEqualTypeOf<SessionResourceV2DefinitionRegistry | undefined>();
		expectTypeOf<SessionRegistriesPayload['resourceGroups']>().toEqualTypeOf<
			SessionResourceV2GroupRegistry | undefined
		>();
	});

	it('parses registries with resource definition payloads', () => {
		const payload = sessionRegistriesSchema.parse({
			actions: {},
			buildings: {},
			developments: {},
			populations: {},
			resources: {},
			resourceDefinitions: [],
			resourceGroups: [],
		});
		expect(payload.resourceDefinitions).toEqual([]);
		expect(payload.resourceGroups).toEqual([]);
	});
});

describe('session player state snapshot', () => {
	it('exposes the aiControlled flag', () => {
		expectTypeOf<SessionPlayerStateSnapshot['aiControlled']>().toEqualTypeOf<
			boolean | undefined
		>();
	});

	it('tracks unified resource values and optional legacy payloads', () => {
		expectTypeOf<SessionPlayerStateSnapshot['values']>().toEqualTypeOf<
			Record<string, SessionResourceValueSnapshot> | undefined
		>();
		expectTypeOf<SessionPlayerStateSnapshot['resources']>().toEqualTypeOf<
			Record<string, number>
		>();
		expectTypeOf<SessionPlayerStateSnapshot['stats']>().toEqualTypeOf<
			Record<string, number>
		>();
		expectTypeOf<SessionPlayerStateSnapshot['population']>().toEqualTypeOf<
			Record<string, number>
		>();
	});
});
