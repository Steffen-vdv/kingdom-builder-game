import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';
import {
	sessionActionCostRequestSchema,
	sessionActionCostResponseSchema,
	sessionActionRequirementRequestSchema,
	sessionActionRequirementResponseSchema,
	sessionActionOptionsRequestSchema,
	sessionActionOptionsResponseSchema,
	sessionCreateResponseSchema,
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
	SessionCreateResponse,
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
	SessionPlayerStateSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionSnapshotMetadataAssets,
	SessionOverviewContent,
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

	it('matches create response metadata inference', () => {
		type ResponseInfer = ZodInfer<typeof sessionCreateResponseSchema>;
		expectTypeOf<ResponseInfer>().toEqualTypeOf<SessionCreateResponse>();
		expectTypeOf<ResponseInfer['snapshot']>().toEqualTypeOf<SessionSnapshot>();
		expectTypeOf<
			ResponseInfer['snapshot']['metadata']
		>().toEqualTypeOf<SessionSnapshotMetadata>();
		expectTypeOf<
			ResponseInfer['snapshot']['metadata']['assets']
		>().toEqualTypeOf<SessionSnapshotMetadataAssets | undefined>();
		expectTypeOf<
			ResponseInfer['snapshot']['metadata']['overview']
		>().toEqualTypeOf<SessionOverviewContent | undefined>();
	});
});

describe('session player state snapshot', () => {
	it('exposes the aiControlled flag', () => {
		expectTypeOf<SessionPlayerStateSnapshot['aiControlled']>().toEqualTypeOf<
			boolean | undefined
		>();
	});
});

describe('session create response schema', () => {
	it('retains optional metadata payloads', () => {
		const playerA: SessionPlayerStateSnapshot = {
			id: 'A',
			name: 'Alpha',
			aiControlled: false,
			resources: {
				gold: 10,
			},
			stats: {
				happiness: 5,
			},
			statsHistory: {
				happiness: true,
			},
			population: {
				citizen: 3,
			},
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
			statSources: {
				happiness: {
					base: {
						amount: 5,
						meta: {
							key: 'happiness',
							longevity: 'ongoing',
						},
					},
				},
			},
			skipPhases: {},
			skipSteps: {},
			passives: [
				{
					id: 'passive-summary',
					name: 'Blessing',
					meta: {
						source: {
							type: 'building',
							id: 'build-1',
						},
					},
				},
			],
		};
		const playerB: SessionPlayerStateSnapshot = {
			id: 'B',
			name: 'Bravo',
			resources: {
				gold: 8,
			},
			stats: {
				happiness: 4,
			},
			statsHistory: {
				happiness: true,
			},
			population: {
				citizen: 2,
			},
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
			statSources: {
				happiness: {
					base: {
						amount: 4,
						meta: {
							key: 'happiness',
							longevity: 'ongoing',
						},
					},
				},
			},
			skipPhases: {},
			skipSteps: {},
			passives: [],
		};
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {
				happiness: ['bonus'],
			},
			resources: {
				gold: {
					label: 'Gold',
					icon: 'icon-gold',
				},
			},
			assets: {
				population: {
					label: 'Population Asset',
					icon: 'population-icon',
				},
				slot: {
					label: 'Slot Asset',
				},
				customSet: {
					inner: {
						label: 'Inner asset',
						description: 'Nested descriptor',
					},
				},
			},
			overview: {
				hero: {
					badgeIcon: 'badge.png',
					badgeLabel: 'Badge',
					title: 'Overview Title',
					intro: 'Intro text',
					paragraph: 'Hero paragraph',
					tokens: {
						focus: 'Economy',
					},
				},
				sections: [
					{
						kind: 'list',
						id: 'summary',
						icon: 'list-icon',
						title: 'Summary',
						items: [
							{
								label: 'Highlight',
								body: ['Line one', 'Line two'],
							},
						],
					},
				],
				tokens: {
					resources: {
						gold: ['Gold token'],
					},
				},
			},
		};
		const snapshot: SessionSnapshot = {
			game: {
				turn: 1,
				currentPlayerIndex: 0,
				currentPhase: 'growth',
				currentStep: 'start',
				phaseIndex: 0,
				stepIndex: 0,
				devMode: false,
				players: [playerA, playerB],
				activePlayerId: 'A',
				opponentId: 'B',
			},
			phases: [
				{
					id: 'growth',
					steps: [
						{
							id: 'start',
						},
					],
				},
			],
			actionCostResource: 'gold',
			recentResourceGains: [
				{
					key: 'gold',
					amount: 2,
				},
			],
			compensations: {
				A: {
					resources: {
						gold: 5,
					},
				},
				B: {},
			},
			rules: {
				tieredResourceKey: 'happiness',
				tierDefinitions: [
					{
						id: 'content',
						range: {
							min: 0,
							max: 10,
						},
						effect: {
							incomeMultiplier: 1,
						},
					},
				],
				winConditions: [
					{
						id: 'victory',
						trigger: {
							type: 'resource',
							key: 'happiness',
							comparison: 'gte',
							value: 10,
							target: 'self',
						},
						result: {
							subject: 'victory',
						},
					},
				],
			},
			passiveRecords: {
				A: [
					{
						id: 'passive-record',
						owner: 'A',
						effects: [],
						meta: {
							source: {
								type: 'passive',
								id: 'passive-record',
							},
						},
					},
				],
				B: [],
			},
			metadata,
		};
		const response: SessionCreateResponse = {
			sessionId: 'session-123',
			snapshot,
			registries: {
				actions: {},
				buildings: {},
				developments: {},
				populations: {},
				resources: {},
			},
		};
		const parsed = sessionCreateResponseSchema.parse(response);

		expect(parsed.snapshot.metadata.assets).toEqual(metadata.assets);
		expect(parsed.snapshot.metadata.overview).toEqual(metadata.overview);
	});
});
