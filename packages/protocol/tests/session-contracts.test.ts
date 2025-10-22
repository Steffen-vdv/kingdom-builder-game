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
	SessionPlayerStateSnapshot,
	SessionResourceValueSnapshot,
	SessionResourceValueSnapshotMap,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
} from '../src/session';
import type {
	SessionRuntimeConfigResponse,
	SessionRunAiAction,
	SessionRegistriesPayload,
	SessionActionCategoryRegistry,
	SessionResourceRegistryPayload,
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
	});

	it('matches the registries payload type including action categories', () => {
		expect(sessionRegistriesSchema).toBeDefined();
		expectTypeOf<
			ZodInfer<typeof sessionRegistriesSchema>
		>().toEqualTypeOf<SessionRegistriesPayload>();
		type ResourceValuesPayload = SessionRegistriesPayload['resourceValues'];
		const resourceValuesTypeCheck = expectTypeOf<ResourceValuesPayload>();
		resourceValuesTypeCheck.toEqualTypeOf<SessionResourceRegistryPayload>();
		type ActionCategoriesPayload = SessionRegistriesPayload['actionCategories'];
		const actionCategoriesTypeCheck = expectTypeOf<ActionCategoriesPayload>();
		actionCategoriesTypeCheck.toEqualTypeOf<
			SessionActionCategoryRegistry | undefined
		>();
	});
});

describe('session player state snapshot', () => {
	it('exposes the aiControlled flag', () => {
		expectTypeOf<SessionPlayerStateSnapshot['aiControlled']>().toEqualTypeOf<
			boolean | undefined
		>();
	});

	it('uses the ResourceV2 value snapshot map and removes legacy buckets', () => {
		expectTypeOf<
			SessionPlayerStateSnapshot['values']
		>().toEqualTypeOf<SessionResourceValueSnapshotMap>();
		expectTypeOf<
			SessionResourceValueSnapshotMap[keyof SessionResourceValueSnapshotMap]
		>().toEqualTypeOf<SessionResourceValueSnapshot>();
		// @ts-expect-error legacy resources map removed from snapshots
		const legacyResources = ({} as SessionPlayerStateSnapshot).resources;
		void legacyResources;
	});
});
