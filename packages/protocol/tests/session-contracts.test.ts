import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';
import {
	sessionActionCostRequestSchema,
	sessionActionCostResponseSchema,
	sessionActionRequirementRequestSchema,
	sessionActionRequirementResponseSchema,
	sessionCreateResponseSchema,
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
	SessionCreateResponse,
	SessionSnapshot,
	SessionPlayerStateSnapshot,
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

	it('accepts metadata assets, aliases, and overview entries on session creation', () => {
		const snapshot = {
			game: {
				turn: 1,
				currentPlayerIndex: 0,
				currentPhase: 'phase.growth',
				currentStep: 'phase.growth.collect',
				phaseIndex: 0,
				stepIndex: 0,
				devMode: false,
				players: [
					{
						id: 'A',
						name: 'Aurora',
						resources: {},
						stats: {},
						statsHistory: {},
						population: {},
						lands: [
							{
								id: 'land-1',
								slotsMax: 1,
								slotsUsed: 0,
								tilled: false,
								developments: [],
							},
						],
						buildings: [],
						actions: [],
						statSources: {},
						skipPhases: {},
						skipSteps: {},
						passives: [],
					},
					{
						id: 'B',
						name: 'Boreal',
						resources: {},
						stats: {},
						statsHistory: {},
						population: {},
						lands: [
							{
								id: 'land-2',
								slotsMax: 1,
								slotsUsed: 0,
								tilled: false,
								developments: [],
							},
						],
						buildings: [],
						actions: [],
						statSources: {},
						skipPhases: {},
						skipSteps: {},
						passives: [],
					},
				],
				activePlayerId: 'A',
				opponentId: 'B',
			},
			phases: [
				{
					id: 'phase.growth',
					steps: [
						{
							id: 'phase.growth.collect',
						},
					],
				},
			],
			actionCostResource: 'gold',
			recentResourceGains: [],
			compensations: {
				A: {},
				B: {},
			},
			rules: {
				tieredResourceKey: 'happiness',
				tierDefinitions: [],
				winConditions: [],
			},
			passiveRecords: {
				A: [],
				B: [],
			},
			metadata: {
				passiveEvaluationModifiers: {},
				assets: {
					'asset.hero.badge': {
						assetId: 'asset.hero.badge',
						assetType: 'icon',
						mediaUri: 'https://example.test/assets/hero.png',
						checksum: 'sha256:hero',
						label: 'Hero Badge',
						icon: '👑',
					},
				},
				aliases: {
					'asset.hero.badge': [
						{
							aliasId: 'legacy.hero.badge',
							primaryId: 'asset.hero.badge',
							aliasType: 'legacy',
							validFrom: 1_600_000_000,
							syncNotes: 'Imported from the legacy client.',
						},
					],
				},
				overview: {
					contentId: 'overview.kingdom-builder',
					summary: 'Strategic overview summary.',
					details: 'Detailed explanation of the overview transport payload.',
					tags: ['intro', 'strategy'],
					defaultState: { highlight: true },
					publishWindow: {
						startEpoch: 1_700_000_000,
						endEpoch: 1_700_000_600,
					},
					localizationMap: {
						en: 'content.overview.en',
					},
				},
			},
		} satisfies SessionSnapshot;
		const response = {
			sessionId: 'session-123',
			snapshot,
			registries: {
				actions: {},
				buildings: {},
				developments: {},
				populations: {},
				resources: {},
			},
		} satisfies SessionCreateResponse;
		const parsed = sessionCreateResponseSchema.parse(response);
		expect(
			parsed.snapshot.metadata.assets?.['asset.hero.badge']?.assetType,
		).toBe('icon');
		expect(
			parsed.snapshot.metadata.aliases?.['asset.hero.badge']?.[0]?.aliasType,
		).toBe('legacy');
		expect(parsed.snapshot.metadata.overview?.contentId).toBe(
			'overview.kingdom-builder',
		);
		expectTypeOf<
			ZodInfer<typeof sessionCreateResponseSchema>
		>().toEqualTypeOf<SessionCreateResponse>();
		expectTypeOf<typeof parsed.snapshot.metadata.overview>().toEqualTypeOf<
			SessionSnapshot['metadata']['overview']
		>();
	});
});

describe('session player state snapshot', () => {
	it('exposes the aiControlled flag', () => {
		expectTypeOf<SessionPlayerStateSnapshot['aiControlled']>().toEqualTypeOf<
			boolean | undefined
		>();
	});
});
