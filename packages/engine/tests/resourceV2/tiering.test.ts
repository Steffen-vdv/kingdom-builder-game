import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	Registry,
	type EffectDef,
	type ActionConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type PhaseConfig,
	type PopulationConfig,
	type RuleSet,
} from '@kingdom-builder/protocol';

import { EFFECTS } from '../../src/effects';
import { EngineContext } from '../../src/context';
import { GameState } from '../../src/state';
import { Services, PassiveManager } from '../../src/services';
import {
	clearRecentTierTransitions,
	clearResourceTierTouches,
	createResourceV2Metadata,
	createResourceV2State,
	setResourceValue,
	type ResourceV2Metadata,
	type ResourceV2State,
	type ResourceV2TierState,
} from '../../src/resourceV2';
import {
	resourceV2Add,
	resourceV2Remove,
	type ResourceV2Runtime,
	type ResourceV2TieringRuntime,
	type ResourceV2ValueEffectParams,
} from '../../src/resourceV2/effects';
import { applyResourceTiering } from '../../src/resourceV2/tiering';

const TEST_TIER_EXIT = 'test-tier:exit';
const TEST_TIER_ENTER = 'test-tier:enter';

let executionLog: string[] = [];

beforeAll(() => {
	EFFECTS.add(TEST_TIER_EXIT, (effect) => {
		const params = (effect.params ?? {}) as { marker?: string };
		executionLog.push(`exit:${params.marker ?? ''}`);
	});
	EFFECTS.add(TEST_TIER_ENTER, (effect) => {
		const params = (effect.params ?? {}) as { marker?: string };
		executionLog.push(`enter:${params.marker ?? ''}`);
	});
});

describe('ResourceV2 tiering', () => {
	let metadata: ResourceV2Metadata;
	let state: ResourceV2State;
	let resourceId: string;
	let trackId: string;
	let resolveEffects: ResourceV2TieringRuntime['resolveEffects'];

	beforeEach(() => {
		executionLog = [];
		const factory = createContentFactory();
		const tierTrack = factory.resourceTierTrack({
			steps: [
				{
					id: 'baseline',
					min: 0,
					max: 4,
					exitEffects: ['tier:baseline-exit'],
					passives: ['baseline-passive'],
				},
				{
					id: 'surge',
					min: 5,
					enterEffects: ['tier:surge-enter'],
					passives: ['surge-passive'],
				},
			],
		});
		const absorption = factory.resourceDefinition({
			configure: (builder) => {
				builder.lowerBound(0).upperBound(10).tierTrack(tierTrack).order(1);
			},
		});
		factory.resourceDefinition({
			configure: (builder) => {
				builder.lowerBound(0).upperBound(5).order(2);
			},
		});
		metadata = createResourceV2Metadata({
			definitions: factory.resourceDefinitions,
			groups: factory.resourceGroups,
		});
		state = createResourceV2State(metadata, {
			values: {
				[absorption.id]: 3,
			},
		});
		resourceId = absorption.id;
		trackId = tierTrack.id;

		const effectMap = new Map<string, EffectDef[]>([
			[
				'tier:baseline-exit',
				[
					{
						type: 'test-tier',
						method: 'exit',
						params: { marker: 'baseline' },
					},
				],
			],
			[
				'tier:surge-enter',
				[
					{
						type: 'test-tier',
						method: 'enter',
						params: { marker: 'surge' },
					},
				],
			],
		]);
		resolveEffects = (id: string) => effectMap.get(id);
	});

	function createEngineContext(
		hooks?: ResourceV2Runtime['hooks'],
		resolver?: ResourceV2TieringRuntime['resolveEffects'],
	) {
		const game = new GameState('Player', 'Opponent');
		const rules: RuleSet = {
			defaultActionAPCost: 1,
			absorptionCapPct: 0,
			absorptionRounding: 'down' as const,
			tieredResourceKey: resourceId,
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 1,
			basePopulationCap: 0,
			winConditions: [],
		} satisfies Services['rules'];
		const developments = new Registry<DevelopmentConfig>();
		const services = new Services(rules, developments);
		const actions = new Registry<ActionConfig>();
		const buildings = new Registry<BuildingConfig>();
		const populations = new Registry<PopulationConfig>();
		const passives = new PassiveManager();
		const phases: PhaseConfig[] = [
			{ id: 'phase', name: 'Phase', steps: [{ id: 'step', name: 'Step' }] },
		];
		const context = new EngineContext(
			game,
			services,
			actions,
			buildings,
			developments,
			populations,
			passives,
			phases,
			resourceId,
			rules.defaultActionAPCost,
			{ A: {}, B: {} },
		);
		const runtime: ResourceV2Runtime = {
			state,
			...(hooks ? { hooks } : {}),
			...(resolver ? { tiering: { resolveEffects: resolver } } : {}),
		};
		(context as EngineContext & { resourceV2: ResourceV2Runtime }).resourceV2 =
			runtime;
		return { context, passives, runtime };
	}

	it('transitions tiers, running exit and enter sequences and recording transitions', () => {
		const { context, passives } = createEngineContext(
			undefined,
			resolveEffects,
		);
		const removePassiveSpy = vi.spyOn(passives, 'removePassive');

		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId,
				payload: { kind: 'amount', amount: 5 },
				reconciliation: 'clamp',
			},
		};

		resourceV2Add(effect, context, 1);

		const tier = state.values.get(resourceId)?.tier as ResourceV2TierState;
		expect(tier.currentStepId).toBe('surge');
		expect(tier.previousStepId).toBe('baseline');
		expect(tier.touched).toBe(true);
		expect(removePassiveSpy).toHaveBeenCalledWith('baseline-passive', context);
		expect(executionLog).toEqual(['exit:baseline', 'enter:surge']);
		expect(state.recentTierTransitions).toEqual([
			{
				resourceId,
				trackId,
				fromStepId: 'baseline',
				toStepId: 'surge',
			},
		]);
		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: 5 },
		]);
	});

	it('suppresses gain/loss hooks while still applying tier transitions', () => {
		const onGain = vi.fn();
		const onLoss = vi.fn();
		const { context } = createEngineContext({ onGain, onLoss }, resolveEffects);

		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId,
				payload: { kind: 'amount', amount: 5 },
				reconciliation: 'clamp',
				suppressHooks: true,
			},
		};

		resourceV2Add(effect, context, 1);

		expect(onGain).not.toHaveBeenCalled();
		expect(onLoss).not.toHaveBeenCalled();
		const tier = state.values.get(resourceId)?.tier as ResourceV2TierState;
		expect(tier.currentStepId).toBe('surge');
		expect(state.recentTierTransitions).toHaveLength(1);
	});

	it('records signed recent gains for increases and decreases', () => {
		const { context } = createEngineContext(undefined, resolveEffects);
		context.recentResourceGains = [];

		const gainEffect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId,
				payload: { kind: 'amount', amount: 2 },
				reconciliation: 'clamp',
			},
		};
		resourceV2Add(gainEffect, context, 1);

		const lossEffect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'remove',
			params: {
				resourceId,
				payload: { kind: 'amount', amount: 4 },
				reconciliation: 'clamp',
			},
		};
		resourceV2Remove(lossEffect, context, 1);

		expect(context.recentResourceGains).toEqual([
			{ key: resourceId, amount: 2 },
			{ key: resourceId, amount: -4 },
		]);
	});

	it('clears tier touches and recent transitions', () => {
		const { context } = createEngineContext(undefined, resolveEffects);

		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId,
				payload: { kind: 'amount', amount: 5 },
				reconciliation: 'clamp',
			},
		};

		resourceV2Add(effect, context, 1);

		const tier = state.values.get(resourceId)?.tier as ResourceV2TierState;
		expect(tier.touched).toBe(true);
		expect(state.recentTierTransitions).toHaveLength(1);

		clearResourceTierTouches(state);
		clearRecentTierTransitions(state);

		expect(tier.touched).toBe(false);
		expect(state.recentTierTransitions).toHaveLength(0);
	});

	it('resets tier progress when no step matches the new value', () => {
		const factory = createContentFactory();
		const gapTrack = factory.resourceTierTrack({
			id: 'gap-track',
			steps: [
				{ id: 'late', min: 10, max: 15 },
				{ id: 'endgame', min: 20, max: 25 },
			],
		});
		const gapped = factory.resourceDefinition({
			id: 'gapped-resource',
			configure: (builder) => {
				builder.lowerBound(0).upperBound(30).tierTrack(gapTrack);
			},
		});
		const gapMetadata = createResourceV2Metadata({
			definitions: factory.resourceDefinitions,
			groups: factory.resourceGroups,
		});
		const gapState = createResourceV2State(gapMetadata, {
			values: { [gapped.id]: 12 },
		});
		const { context } = createEngineContext(undefined, undefined);
		const runtime = (
			context as EngineContext & { resourceV2: ResourceV2Runtime }
		).resourceV2;
		runtime.state = gapState;

		const tier = gapState.values.get(gapped.id)?.tier as ResourceV2TierState;
		expect(tier.currentStepId).toBe('late');
		expect(tier.progress).toEqual({ value: 12, min: 10, max: 15 });

		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'remove',
			params: {
				resourceId: gapped.id,
				payload: { kind: 'amount', amount: 9 },
				reconciliation: 'clamp',
			},
		};

		resourceV2Remove(effect, context, 1);

		expect(tier.currentStepId).toBeUndefined();
		expect(tier.progress).toBeUndefined();
		expect(tier.previousStepId).toBeUndefined();
		expect(tier.nextStepId).toBeUndefined();
		expect(tier.touched).toBe(true);
		expect(gapState.recentTierTransitions.at(-1)).toEqual({
			resourceId: gapped.id,
			trackId: gapTrack.id,
			fromStepId: 'late',
			toStepId: undefined,
		});
	});

	it('ignores tiering requests for unknown resources', () => {
		applyResourceTiering({ state, resourceId: 'missing' });
		expect(state.recentTierTransitions).toHaveLength(0);
	});

	it('skips tier exit and enter effects when no resolver or context is supplied', () => {
		clearRecentTierTransitions(state);
		executionLog = [];

		setResourceValue(state, resourceId, 5);

		applyResourceTiering({ state, resourceId });

		const tier = state.values.get(resourceId)?.tier as ResourceV2TierState;
		expect(tier.currentStepId).toBe('surge');
		expect(executionLog).toEqual([]);
		expect(state.recentTierTransitions.at(-1)).toEqual({
			resourceId,
			trackId,
			fromStepId: 'baseline',
			toStepId: 'surge',
		});
	});

	it('recomputes tiers without recording transitions when disabled', () => {
		const tier = state.values.get(resourceId)?.tier as ResourceV2TierState;
		tier.touched = false;
		clearRecentTierTransitions(state);

		setResourceValue(state, resourceId, 5);

		applyResourceTiering({ state, resourceId, recordTransition: false });

		expect(tier.currentStepId).toBe('surge');
		expect(tier.touched).toBe(false);
		expect(state.recentTierTransitions).toHaveLength(0);
	});

	it('throws when overlapping tier steps match the same value', () => {
		const factory = createContentFactory();
		const overlappingTrack = factory.resourceTierTrack({
			id: 'overlap-track',
			steps: [
				{ id: 'first', min: 0, max: 10 },
				{ id: 'second', min: 5 },
			],
		});
		const overlapping = factory.resourceDefinition({
			id: 'overlap-resource',
			configure: (builder) => {
				builder.lowerBound(0).upperBound(20).tierTrack(overlappingTrack);
			},
		});
		const overlapMetadata = createResourceV2Metadata({
			definitions: factory.resourceDefinitions,
			groups: factory.resourceGroups,
		});
		const overlapState = createResourceV2State(overlapMetadata, {
			values: { [overlapping.id]: 3 },
		});
		const { context } = createEngineContext(undefined, resolveEffects);
		const runtime = (
			context as EngineContext & { resourceV2: ResourceV2Runtime }
		).resourceV2;
		runtime.state = overlapState;

		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId: overlapping.id,
				payload: { kind: 'amount', amount: 5 },
				reconciliation: 'clamp',
			},
		};

		expect(() => resourceV2Add(effect, context, 1)).toThrowError(
			'overlapping step matches',
		);
	});
});
