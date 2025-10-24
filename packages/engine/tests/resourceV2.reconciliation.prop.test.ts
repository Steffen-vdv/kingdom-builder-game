import { beforeAll, describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type {
	EffectDef,
	ResourceV2TierTrackDefinition,
} from '@kingdom-builder/protocol';
import { registerCoreEffects, EFFECTS } from '../src/effects';
import { ResourceV2Service } from '../src/resourceV2/service';
import { ResourceV2TierService } from '../src/resourceV2/tier_service';
import { loadResourceV2Registry } from '../src/resourceV2/registry';
import {
	GameState,
	initializePlayerResourceV2State,
	resetRecentResourceV2Gains,
} from '../src/state';
import { EngineContext } from '../src/context';
import { PassiveManager, Services } from '../src/services';
import type { RuleSet } from '../src/services';
import {
	createContentFactory,
	createResourceV2Definition,
	createResourceV2Group,
} from '@kingdom-builder/testing';

type TierEventContext = EngineContext & { tierEventLog: string[] };

type Operation =
	| {
			kind: 'gain';
			player: 'active' | 'opponent';
			resourceIndex: number;
			amount: number;
	  }
	| {
			kind: 'loss';
			player: 'active' | 'opponent';
			resourceIndex: number;
			amount: number;
	  }
	| {
			kind: 'transfer';
			resourceIndex: number;
			amount: number;
	  };

describe('ResourceV2 reconciliation property invariants', () => {
	beforeAll(() => {
		registerCoreEffects();
		EFFECTS.add('test:tier-event', (effect, context) => {
			const typed = context as TierEventContext;
			const params = effect.params as
				| {
						resourceId?: string;
						tierId?: string;
						event?: string;
				  }
				| undefined;
			if (!typed.tierEventLog) {
				return;
			}
			const {
				resourceId = 'unknown',
				tierId = 'unknown',
				event = 'event',
			} = params ?? {};
			const playerId = context.activePlayer.id;
			const entry = `${event}:${playerId}:${resourceId}:${tierId}`;
			typed.tierEventLog.push(entry);
		});
	});

	it('clamps amounts, tracks touched and logs, and emits tier hooks only when crossing thresholds', () => {
		const operationArb = fc.array(
			fc.oneof<Operation>(
				fc.record({
					kind: fc.constant<'gain'>('gain'),
					player: fc.constantFrom<'active' | 'opponent'>('active', 'opponent'),
					resourceIndex: fc.integer({ min: 0, max: 1 }),
					amount: fc.integer({ min: 0, max: 8 }),
				}),
				fc.record({
					kind: fc.constant<'loss'>('loss'),
					player: fc.constantFrom<'active' | 'opponent'>('active', 'opponent'),
					resourceIndex: fc.integer({ min: 0, max: 1 }),
					amount: fc.integer({ min: 0, max: 8 }),
				}),
				fc.record({
					kind: fc.constant<'transfer'>('transfer'),
					resourceIndex: fc.integer({ min: 0, max: 1 }),
					amount: fc.integer({ min: 0, max: 8 }),
				}),
			),
			{ minLength: 0, maxLength: 25 },
		);

		const initialAmountsArb = fc.record({
			active: fc.tuple(
				fc.integer({ min: 0, max: 15 }),
				fc.integer({ min: 0, max: 15 }),
			),
			opponent: fc.tuple(
				fc.integer({ min: 0, max: 15 }),
				fc.integer({ min: 0, max: 15 }),
			),
		});

		fc.assert(
			fc.property(initialAmountsArb, operationArb, (initial, operations) => {
				const {
					context,
					resourceService,
					tierService,
					registry,
					player,
					opponent,
					resourceIds,
				} = setupScenario();
				const tracks = new Map<string, ResourceV2TierTrackDefinition>();
				for (const id of resourceIds) {
					const track = registry.getTierTrack(id);
					if (track) {
						tracks.set(id, track);
					}
				}

				context.tierEventLog = [];

				resourceIds.forEach((id, index) => {
					const activeAmount = initial.active[index] ?? 0;
					const opponentAmount = initial.opponent[index] ?? 0;
					player.resourceV2.amounts[id] = activeAmount;
					opponent.resourceV2.amounts[id] = opponentAmount;
				});

				tierService.initialize(context);
				context.tierEventLog = [];
				context.recentResourceGains = [];

				const createNumberRecord = (value: number) =>
					Object.fromEntries(resourceIds.map((id) => [id, value]));
				const createBooleanRecord = (value: boolean) =>
					Object.fromEntries(resourceIds.map((id) => [id, value]));
				const expectedRecentDeltas: Record<
					'active' | 'opponent',
					Record<string, number>
				> = {
					active: createNumberRecord(0),
					opponent: createNumberRecord(0),
				};
				const expectedTouched: Record<
					'active' | 'opponent',
					Record<string, boolean>
				> = {
					active: createBooleanRecord(false),
					opponent: createBooleanRecord(false),
				};
				const expectedTierEvents: string[] = [];
				const createTierRecord = (state: typeof player.resourceV2) =>
					Object.fromEntries(
						resourceIds.map((id) => [id, state.tiers[id]?.tierId]),
					);
				const expectedTierByPlayer: Record<
					'active' | 'opponent',
					Record<string, string | undefined>
				> = {
					active: createTierRecord(player.resourceV2),
					opponent: createTierRecord(opponent.resourceV2),
				};
				const expectedLog: { key: string; amount: number }[] = [];

				const getResourceId = (index: number) =>
					resourceIds[index] ?? resourceIds[0]!;

				for (const operation of operations) {
					if (operation.kind === 'transfer') {
						const resourceId = getResourceId(operation.resourceIndex);
						const donorBefore = opponent.resourceV2.amounts[resourceId] ?? 0;
						const recipientBefore = player.resourceV2.amounts[resourceId] ?? 0;
						const donorTierBefore = expectedTierByPlayer.opponent[resourceId];
						const recipientTierBefore = expectedTierByPlayer.active[resourceId];

						const effect: EffectDef = {
							type: 'resource',
							method: 'transfer',
							params: {
								id: resourceId,
								amount: operation.amount,
							},
							meta: {
								donor: { reconciliation: 'clamp' },
								recipient: { reconciliation: 'clamp' },
							},
						};

						resourceV2Transfer(effect, context);

						const donorAfter = opponent.resourceV2.amounts[resourceId] ?? 0;
						const recipientAfter = player.resourceV2.amounts[resourceId] ?? 0;
						const donorApplied = donorAfter - donorBefore;
						const recipientApplied = recipientAfter - recipientBefore;

						if (donorApplied !== 0) {
							expectedRecentDeltas.opponent[resourceId] += donorApplied;
							expectedTouched.opponent[resourceId] = true;
							updateTierExpectation(
								tracks.get(resourceId),
								opponent.resourceV2.amounts[resourceId] ?? 0,
								donorTierBefore,
								expectedTierByPlayer.opponent,
								expectedTierEvents,
								opponent.id,
								resourceId,
							);
						}

						if (recipientApplied !== 0) {
							expectedRecentDeltas.active[resourceId] += recipientApplied;
							expectedTouched.active[resourceId] = true;
							expectedLog.push({
								key: resourceId,
								amount: recipientApplied,
							});
							updateTierExpectation(
								tracks.get(resourceId),
								player.resourceV2.amounts[resourceId] ?? 0,
								recipientTierBefore,
								expectedTierByPlayer.active,
								expectedTierEvents,
								player.id,
								resourceId,
							);
						}
					} else {
						const resourceId = getResourceId(operation.resourceIndex);
						const playerKey = operation.player;
						const target = playerKey === 'active' ? player : opponent;
						const tierState = expectedTierByPlayer[playerKey];
						const previousTier = tierState[resourceId];
						const delta =
							operation.kind === 'gain' ? operation.amount : -operation.amount;
						const applied = resourceService.applyValueChange(
							context,
							target,
							resourceId,
							{
								delta,
								reconciliation: 'clamp',
							},
						);
						if (applied !== 0) {
							expectedRecentDeltas[playerKey][resourceId] += applied;
							expectedTouched[playerKey][resourceId] = true;
							if (target === context.activePlayer) {
								expectedLog.push({
									key: resourceId,
									amount: applied,
								});
							}
							updateTierExpectation(
								tracks.get(resourceId),
								target.resourceV2.amounts[resourceId] ?? 0,
								previousTier,
								tierState,
								expectedTierEvents,
								target.id,
								resourceId,
							);
						}
					}

					assertBounds(player.resourceV2);
					assertBounds(opponent.resourceV2);
					assertTouched(player.resourceV2, expectedTouched.active);
					assertTouched(opponent.resourceV2, expectedTouched.opponent);
					expect(context.recentResourceGains).toEqual(expectedLog);
				}

				for (const resourceId of resourceIds) {
					expect(player.resourceV2.recentDeltas[resourceId]).toBe(
						expectedRecentDeltas.active[resourceId],
					);
					expect(opponent.resourceV2.recentDeltas[resourceId]).toBe(
						expectedRecentDeltas.opponent[resourceId],
					);
					expect(player.resourceV2.touched[resourceId]).toBe(
						expectedTouched.active[resourceId],
					);
					expect(opponent.resourceV2.touched[resourceId]).toBe(
						expectedTouched.opponent[resourceId],
					);
				}

				expect(context.recentResourceGains).toEqual(expectedLog);
				expect(context.tierEventLog).toEqual(expectedTierEvents);

				const activeEntries = resetRecentResourceV2Gains(player.resourceV2);
				const opponentEntries = resetRecentResourceV2Gains(opponent.resourceV2);
				const expectedActiveEntries = resourceIds
					.map((resourceId) => ({
						resourceId,
						delta: expectedRecentDeltas.active[resourceId],
					}))
					.filter((entry) => entry.delta !== 0);
				const expectedOpponentEntries = resourceIds
					.map((resourceId) => ({
						resourceId,
						delta: expectedRecentDeltas.opponent[resourceId],
					}))
					.filter((entry) => entry.delta !== 0);
				expect(activeEntries).toEqual(expectedActiveEntries);
				expect(opponentEntries).toEqual(expectedOpponentEntries);
			}),
			{ numRuns: 100 },
		);
	});
});

function setupScenario() {
	const content = createContentFactory();
	const serenityGroup = createResourceV2Group({
		id: 'serenity-group',
		parentBounds: { lowerBound: 0, upperBound: 60 },
		children: ['serenity', 'resolve'],
	});
	const serenityTrack = createTierTrack('serenity');
	const resolveTrack = createTierTrack('resolve');
	const serenity = createResourceV2Definition({
		id: 'serenity',
		name: 'Serenity',
		bounds: { lowerBound: 0, upperBound: 30 },
		tierTrack: serenityTrack,
		group: { groupId: serenityGroup.id },
	});
	const resolve = createResourceV2Definition({
		id: 'resolve',
		name: 'Resolve',
		bounds: { lowerBound: 0, upperBound: 30 },
		tierTrack: resolveTrack,
		group: { groupId: serenityGroup.id },
	});
	const registry = loadResourceV2Registry({
		resources: [serenity, resolve],
		groups: [serenityGroup],
	});
	const services = new Services(createRules(), content.developments);
	const tierService = new ResourceV2TierService(registry);
	services.setResourceV2TierService(tierService);
	const resourceService = new ResourceV2Service(registry, tierService);
	const passives = new PassiveManager();
	const game = new GameState('Player', 'Opponent');
	const context = new EngineContext(
		game,
		services,
		resourceService,
		content.actions,
		content.buildings,
		content.developments,
		content.populations,
		passives,
		[],
		'action-cost',
		{ A: {}, B: {} },
	) as TierEventContext;
	context.tierEventLog = [];
	const player = context.activePlayer;
	const opponent = context.opponent;
	initializePlayerResourceV2State(player, registry);
	initializePlayerResourceV2State(opponent, registry);
	return {
		context,
		resourceService,
		tierService,
		registry,
		player,
		opponent,
		resourceIds: registry.resourceIds,
	};
}

function createTierTrack(resourceId: string): ResourceV2TierTrackDefinition {
	return {
		id: `${resourceId}-track`,
		tiers: [
			createTierDefinition(resourceId, 'calm', 0, 10),
			createTierDefinition(resourceId, 'radiant', 10),
		],
	} satisfies ResourceV2TierTrackDefinition;
}

function createTierDefinition(
	resourceId: string,
	tierId: string,
	min: number,
	max?: number,
) {
	const tierEvent = (event: 'enter' | 'exit'): EffectDef => ({
		type: 'test',
		method: 'tier-event',
		params: {
			resourceId,
			tierId: `${resourceId}-${tierId}`,
			event,
		},
	});
	return {
		id: `${resourceId}-${tierId}`,
		range: max === undefined ? { min } : { min, max },
		enterEffects: [tierEvent('enter')],
		exitEffects: [tierEvent('exit')],
	};
}

function createRules(): RuleSet {
	return {
		defaultActionAPCost: 1,
		absorptionCapPct: 0,
		absorptionRounding: 'down',
		tieredResourceKey: 'legacy-tier',
		tierDefinitions: [],
		slotsPerNewLand: 1,
		maxSlotsPerLand: 1,
		basePopulationCap: 1,
		winConditions: [],
	};
}

function resourceV2Transfer(effect: EffectDef, context: EngineContext) {
	const handler = EFFECTS.get('resource:transfer');
	handler(effect, context, 1);
}

function updateTierExpectation(
	track: ResourceV2TierTrackDefinition | undefined,
	amount: number,
	previousTierId: string | undefined,
	tiersByResource: Record<string, string | undefined>,
	expectedEvents: string[],
	playerId: string,
	resourceId: string,
) {
	if (!track) {
		return;
	}
	const nextTier = findTierForAmount(track, amount);
	const nextTierId = nextTier?.id;
	if (nextTierId === previousTierId) {
		return;
	}
	if (previousTierId) {
		const exitKey = `exit:${playerId}:${resourceId}:${previousTierId}`;
		expectedEvents.push(exitKey);
	}
	if (nextTierId) {
		const enterKey = `enter:${playerId}:${resourceId}:${nextTierId}`;
		expectedEvents.push(enterKey);
	}
	tiersByResource[resourceId] = nextTierId;
}

function findTierForAmount(
	track: ResourceV2TierTrackDefinition,
	amount: number,
) {
	for (const tier of track.tiers) {
		const maximum = tier.range.max ?? Number.POSITIVE_INFINITY;
		if (amount < tier.range.min) {
			continue;
		}
		if (amount >= maximum) {
			continue;
		}
		return tier;
	}
	if (track.tiers.length === 0) {
		return undefined;
	}
	const lastTier = track.tiers[track.tiers.length - 1]!;
	if (amount >= lastTier.range.min) {
		return lastTier;
	}
	return undefined;
}

function assertBounds(
	state: ReturnType<typeof initializePlayerResourceV2State>,
) {
	for (const id of [...state.resourceIds, ...state.parentIds]) {
		const amount = state.amounts[id] ?? 0;
		const bounds = state.bounds[id];
		if (bounds?.lowerBound !== undefined) {
			expect(amount).toBeGreaterThanOrEqual(bounds.lowerBound);
		}
		if (bounds?.upperBound !== undefined) {
			expect(amount).toBeLessThanOrEqual(bounds.upperBound);
		}
	}
}

function assertTouched(
	state: ReturnType<typeof initializePlayerResourceV2State>,
	expected: Record<string, boolean>,
) {
	for (const resourceId of state.resourceIds) {
		expect(state.touched[resourceId]).toBe(expected[resourceId]);
	}
	for (const parentId of state.parentIds) {
		const children = state.parentChildren[parentId] ?? [];
		const expectedParentTouched = children.some(
			(childId) => state.touched[childId],
		);
		expect(state.touched[parentId]).toBe(expectedParentTouched);
	}
}
