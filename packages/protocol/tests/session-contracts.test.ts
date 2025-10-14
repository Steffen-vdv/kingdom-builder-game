import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';
import {
	sessionCreateResponseSchema,
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
	SessionCreateResponse,
	SessionSnapshotMetadata,
	SessionMetadataAliasRecord,
	SessionMetadataDescriptor,
	SessionMetadataOverviewMap,
} from '../src/session';

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
			ZodInfer<typeof sessionSimulateRequestSchema>
		>().toEqualTypeOf<SessionSimulateRequest>();
		expectTypeOf<
			ZodInfer<typeof sessionSimulateResponseSchema>
		>().toEqualTypeOf<SessionSimulateResponse>();
	});

	it('matches create response type and preserves metadata fields', () => {
		expectTypeOf<
			ZodInfer<typeof sessionCreateResponseSchema>
		>().toEqualTypeOf<SessionCreateResponse>();
		expectTypeOf<SessionSnapshotMetadata['assets']>().toEqualTypeOf<
			Record<string, SessionMetadataDescriptor> | undefined
		>();
		expectTypeOf<SessionSnapshotMetadata['overview']>().toEqualTypeOf<
			SessionMetadataOverviewMap | undefined
		>();
		expectTypeOf<SessionSnapshotMetadata['aliases']>().toEqualTypeOf<
			SessionMetadataAliasRecord | undefined
		>();
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			assets: {
				land: { label: 'Land', icon: '🗺️' },
			},
			overview: {
				'content:core': {
					contentId: 'content:core',
					summary: 'Core summary',
					details: 'Core details',
					tags: ['core', 'intro'],
					defaultState: { version: 1 },
					publishWindow: { startEpoch: 100, endEpoch: 200 },
					localizationMap: { en: 'bundle:core-en' },
				},
			},
			aliases: {
				resources: [
					{
						aliasId: 'gold.v1',
						primaryId: 'gold',
						aliasType: 'legacy',
						validFrom: 1,
						validTo: 2,
						syncNotes: 'Legacy identifier',
					},
				],
			},
		};
		const response = {
			sessionId: 'session:test',
			snapshot: {
				game: {
					turn: 1,
					currentPlayerIndex: 0,
					currentPhase: 'phase:start',
					currentStep: 'phase:start:step',
					phaseIndex: 0,
					stepIndex: 0,
					devMode: false,
					players: [],
					activePlayerId: 'A',
					opponentId: 'B',
				},
				phases: [],
				actionCostResource: 'gold',
				recentResourceGains: [],
				compensations: { A: {}, B: {} },
				rules: {
					tieredResourceKey: 'gold',
					tierDefinitions: [],
					winConditions: [],
				},
				passiveRecords: { A: [], B: [] },
				metadata,
			},
			registries: {
				actions: {},
				buildings: {},
				developments: {},
				populations: {},
				resources: {},
			},
		} satisfies SessionCreateResponse;
		const parsed = sessionCreateResponseSchema.parse(response);
		expect(parsed.snapshot.metadata.assets?.land?.icon).toBe('🗺️');
		expect(parsed.snapshot.metadata.overview?.['content:core']?.summary).toBe(
			'Core summary',
		);
		expect(parsed.snapshot.metadata.aliases?.resources?.[0]?.aliasId).toBe(
			'gold.v1',
		);
	});
});

describe('session player state snapshot', () => {
	it('exposes the aiControlled flag', () => {
		expectTypeOf<SessionPlayerStateSnapshot['aiControlled']>().toEqualTypeOf<
			boolean | undefined
		>();
	});
});
