import { describe, expect, it, expectTypeOf } from 'vitest';

import {
	sessionRegistriesSchema,
	type SessionPlayerResourceV2Snapshot,
	type SessionPlayerStateSnapshot,
	type SessionResourceV2GroupSnapshot,
	type SessionResourceV2MetadataSnapshot,
	type SessionSnapshot,
} from '../src';
import type { SessionRegistriesPayload } from '../src/session/contracts';
import type { PlayerStartConfig } from '../src/config/schema';

const createPlayer = (id: 'A' | 'B'): SessionPlayerStateSnapshot => ({
	id,
	name: `Player ${id}`,
	resources: { legacyGold: 10 },
	stats: {},
	statsHistory: {},
	population: {},
	lands: [],
	buildings: [],
	actions: [],
	statSources: {},
	skipPhases: {},
	skipSteps: {},
	passives: [],
	resourceV2: {
		values: { absorption: id === 'A' ? 5 : 0 },
		lowerBounds: { absorption: 0 },
		upperBounds: { absorption: 100 },
		touched: { absorption: id === 'A' },
	},
});

describe('session snapshot ResourceV2 compatibility', () => {
	it('exposes ResourceV2 values alongside legacy buckets', () => {
		const player = createPlayer('A');

		expect(player.resourceV2?.values.absorption).toBe(5);
		expect(player.resources.legacyGold).toBe(10);

		expectTypeOf<SessionPlayerStateSnapshot['resourceV2']>().toEqualTypeOf<
			SessionPlayerResourceV2Snapshot | undefined
		>();
	});

	it('supports mixed snapshots with ordered metadata and groups', () => {
		const players: SessionPlayerStateSnapshot[] = [
			createPlayer('A'),
			createPlayer('B'),
		];

		const compensations = {
			A: {} as PlayerStartConfig,
			B: {} as PlayerStartConfig,
		} as Record<'A' | 'B', PlayerStartConfig>;

		const snapshot: SessionSnapshot = {
			game: {
				turn: 3,
				currentPlayerIndex: 0,
				currentPhase: 'growth',
				currentStep: 'start',
				phaseIndex: 0,
				stepIndex: 0,
				devMode: false,
				players,
				activePlayerId: 'A',
				opponentId: 'B',
			},
			phases: [],
			actionCostResource: 'absorption',
			recentResourceGains: [],
			compensations,
			rules: {
				tieredResourceKey: 'absorption',
				tierDefinitions: [],
				winConditions: [],
			},
			passiveRecords: { A: [], B: [] },
			metadata: { passiveEvaluationModifiers: {} },
			resourceMetadata: {
				absorption: {
					id: 'absorption',
					name: 'Absorption',
					order: 1,
					isPercent: true,
					trackValueBreakdown: true,
					trackBoundBreakdown: false,
					parentId: 'energy-total',
					tierTrack: {
						id: 'absorption-tier',
						tiers: [],
					},
				} satisfies SessionResourceV2MetadataSnapshot,
			},
			resourceGroups: {
				energy: {
					id: 'energy',
					name: 'Energy',
					order: 0,
					children: ['absorption'],
					parent: {
						id: 'energy-total',
						name: 'Total Energy',
						order: 0,
						relation: 'sumOfAll',
						isPercent: true,
						trackValueBreakdown: true,
						trackBoundBreakdown: false,
					},
				} satisfies SessionResourceV2GroupSnapshot,
			},
			orderedResourceIds: ['absorption'],
			orderedResourceGroupIds: ['energy'],
			parentIdByResourceId: { absorption: 'energy-total' },
		};

		expect(snapshot.resourceMetadata?.absorption?.isPercent).toBe(true);
		expect(snapshot.resourceGroups?.energy?.parent?.relation).toBe('sumOfAll');
		expect(snapshot.orderedResourceIds).toEqual(['absorption']);
		expect(snapshot.parentIdByResourceId?.absorption).toBe('energy-total');

		expectTypeOf<SessionSnapshot['resourceMetadata']>().toEqualTypeOf<
			Record<string, SessionResourceV2MetadataSnapshot> | undefined
		>();
		expectTypeOf<SessionSnapshot['resourceGroups']>().toEqualTypeOf<
			Record<string, SessionResourceV2GroupSnapshot> | undefined
		>();
	});

	it('parses registries that include optional resource groups', () => {
		const payload = sessionRegistriesSchema.parse({
			actions: {},
			buildings: {},
			developments: {},
			populations: {},
			resources: {},
			resourcesV2: {
				absorption: {
					id: 'absorption',
					name: 'Absorption',
					order: 7,
				},
			},
			resourceGroups: {
				energy: {
					id: 'energy',
					name: 'Energy',
					order: 0,
					children: ['absorption'],
				},
			},
		});

		expectTypeOf<typeof payload>().toEqualTypeOf<SessionRegistriesPayload>();
		expect(payload.resourcesV2?.absorption?.name).toBe('Absorption');
		expect(payload.resourceGroups?.energy?.children).toEqual(['absorption']);
	});
});
