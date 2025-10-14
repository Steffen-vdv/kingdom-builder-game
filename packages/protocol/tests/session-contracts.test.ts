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
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionSimulateRequest,
	SessionSimulateResponse,
	SessionCreateResponse,
	SessionSnapshot,
	SessionSnapshotMetadata,
	SessionOverviewMetadata,
	SessionMetadataAliasMap,
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
});

describe('session player state snapshot', () => {
	it('exposes the aiControlled flag', () => {
		expectTypeOf<SessionPlayerStateSnapshot['aiControlled']>().toEqualTypeOf<
			boolean | undefined
		>();
	});
});

describe('session metadata integration', () => {
	it('exposes overview and alias types on session metadata', () => {
		expectTypeOf<SessionSnapshotMetadata['overview']>().toEqualTypeOf<
			SessionOverviewMetadata | undefined
		>();
		expectTypeOf<SessionSnapshotMetadata['aliases']>().toEqualTypeOf<
			SessionMetadataAliasMap | undefined
		>();
	});

	it('matches create response schema inference for metadata', () => {
		expectTypeOf<
			ZodInfer<typeof sessionCreateResponseSchema>
		>().toEqualTypeOf<SessionCreateResponse>();
		expectTypeOf<
			ZodInfer<typeof sessionCreateResponseSchema>['snapshot']
		>().toEqualTypeOf<SessionSnapshot>();
		expectTypeOf<
			ZodInfer<typeof sessionCreateResponseSchema>['snapshot']['metadata']
		>().toEqualTypeOf<SessionSnapshotMetadata>();
		expectTypeOf<
			ZodInfer<
				typeof sessionCreateResponseSchema
			>['snapshot']['metadata']['overview']
		>().toEqualTypeOf<SessionOverviewMetadata | undefined>();
		expectTypeOf<
			ZodInfer<
				typeof sessionCreateResponseSchema
			>['snapshot']['metadata']['aliases']
		>().toEqualTypeOf<SessionMetadataAliasMap | undefined>();
	});

	it('preserves optional overview metadata through create response parsing', () => {
		const overview: SessionOverviewMetadata = {
			hero: {
				badgeIcon: '⚔️',
				badgeLabel: 'Strategy',
				title: 'Strategic Briefing',
				intro: 'Survey the coming conflicts.',
				paragraph: 'Plot {gold} investments wisely.',
				tokens: { game: 'Kingdom Builder' },
			},
			sections: [
				{
					kind: 'paragraph',
					id: 'objective',
					icon: 'castle',
					title: 'Hold the Line',
					paragraphs: [
						'Defend your {castle} from every siege.',
						'Channel {gold} reserves into critical upgrades.',
					],
				},
			],
			tokens: {
				resources: { gold: ['treasury', 'gold'] },
				static: { castle: ['castle'] },
			},
		};
		const metadata: SessionSnapshotMetadata = {
			passiveEvaluationModifiers: {},
			assets: {
				castle: { label: 'Castle', icon: '🏰' },
			},
			overview,
			aliases: {
				resources: { treasury: ['gold'] },
			},
		};
		const snapshot = { metadata } as unknown as SessionSnapshot;
		const response: SessionCreateResponse = {
			sessionId: 'session-1',
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
		expect(parsed.snapshot.metadata.assets?.castle?.label).toBe('Castle');
		expect(parsed.snapshot.metadata.overview).toEqual(overview);
		expect(parsed.snapshot.metadata.aliases?.resources?.treasury).toEqual([
			'gold',
		]);
	});
});
