import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createContentFactory } from '@kingdom-builder/testing';
import {
	Registry,
	type ActionConfig,
	type BuildingConfig,
	type DevelopmentConfig,
	type EffectDef,
	type PhaseConfig,
	type PopulationConfig,
	type RuleSet,
} from '@kingdom-builder/protocol';

import { EngineContext } from '../../src/context';
import { GameState } from '../../src/state';
import {
	createResourceV2Metadata,
	createResourceV2State,
	getResourceValue,
	type ResourceV2Metadata,
	type ResourceV2State,
} from '../../src/resourceV2';
import {
	isResourceV2ValueEffect,
	resourceV2Add,
	resourceV2Remove,
	resourceV2Transfer,
	resourceV2UpperBoundIncrease,
	type ResourceV2BoundAdjustmentParams,
	type ResourceV2Runtime,
	type ResourceV2TransferEffectParams,
	type ResourceV2ValueEffectParams,
} from '../../src/resourceV2/effects';
import { Services, PassiveManager } from '../../src/services';

describe('ResourceV2 effects', () => {
	let metadata: ResourceV2Metadata;
	let state: ResourceV2State;
	let alphaId: string;
	let betaId: string;
	let parentId: string;

	beforeEach(() => {
		const factory = createContentFactory();
		const group = factory.resourceGroup();
		const alpha = factory.resourceDefinition({
			configure: (builder) => {
				builder.lowerBound(0).upperBound(20).group(group.id, 1);
			},
		});
		const beta = factory.resourceDefinition({
			configure: (builder) => {
				builder.lowerBound(0).upperBound(5).group(group.id, 2);
			},
		});
		metadata = createResourceV2Metadata({
			definitions: factory.resourceDefinitions,
			groups: factory.resourceGroups,
		});
		state = createResourceV2State(metadata, {
			values: {
				[alpha.id]: 5,
				[beta.id]: 3,
			},
		});
		alphaId = alpha.id;
		betaId = beta.id;
		parentId = group.parent.id;
	});

	function createEngineContext(hooks?: ResourceV2Runtime['hooks']) {
		const game = new GameState('Player', 'Opponent');
		const actionResourceId = alphaId;
		const rules: RuleSet = {
			defaultActionAPCost: 1,
			absorptionCapPct: 0,
			absorptionRounding: 'down',
			tieredResourceKey: actionResourceId,
			tierDefinitions: [],
			slotsPerNewLand: 1,
			maxSlotsPerLand: 1,
			basePopulationCap: 0,
			winConditions: [],
		};
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
			actionResourceId,
			rules.defaultActionAPCost,
			{ A: {}, B: {} },
		);
		const runtime: ResourceV2Runtime = { state, ...(hooks ? { hooks } : {}) };
		(context as EngineContext & { resourceV2: ResourceV2Runtime }).resourceV2 =
			runtime;
		return { context, passives };
	}

	it('adds amounts with evaluation modifiers and logs signed deltas', () => {
		const onGain = vi.fn();
		const onLoss = vi.fn();
		const onValueChange = vi.fn();
		const { context, passives } = createEngineContext({
			onGain,
			onLoss,
			onValueChange,
		});
		passives.registerEvaluationModifier('global', 'resourceV2:value', () => ({
			percent: 0.5,
			round: 'down',
		}));

		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId: alphaId,
				payload: { kind: 'amount', amount: 4 },
				reconciliation: 'clamp',
			},
		};

		resourceV2Add(effect, context, 1);

		expect(getResourceValue(state, alphaId)).toBe(11);
		expect(onGain).toHaveBeenCalledWith(context, alphaId, 6);
		expect(onLoss).not.toHaveBeenCalled();
		expect(onValueChange).toHaveBeenCalledWith(context, alphaId, 6);
		expect(context.recentResourceGains).toEqual([{ key: alphaId, amount: 6 }]);
	});

	it('suppresses hooks when configured', () => {
		const onGain = vi.fn();
		const onLoss = vi.fn();
		const { context } = createEngineContext({ onGain, onLoss });
		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId: alphaId,
				payload: { kind: 'amount', amount: 3 },
				reconciliation: 'clamp',
				suppressHooks: true,
			},
		};

		resourceV2Add(effect, context, 1);

		expect(getResourceValue(state, alphaId)).toBe(8);
		expect(onGain).not.toHaveBeenCalled();
		expect(onLoss).not.toHaveBeenCalled();
		expect(context.recentResourceGains).toEqual([{ key: alphaId, amount: 3 }]);
	});

	it('removes percent payloads with rounding and clamp reconciliation', () => {
		state = createResourceV2State(metadata, {
			values: {
				[alphaId]: 10,
				[betaId]: 3,
			},
		});
		const { context } = createEngineContext();
		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'remove',
			params: {
				resourceId: alphaId,
				payload: { kind: 'percent', percent: 25, rounding: 'nearest' },
				reconciliation: 'clamp',
			},
		};

		const onLoss = vi.fn();
		const runtime = (
			context as EngineContext & { resourceV2: ResourceV2Runtime }
		).resourceV2;
		runtime.hooks = { onLoss };

		resourceV2Remove(effect, context, 1);

		expect(getResourceValue(state, alphaId)).toBe(7);
		expect(onLoss).toHaveBeenCalledWith(context, alphaId, 3);
		expect(context.recentResourceGains).toEqual([{ key: alphaId, amount: -3 }]);
	});

	it('skips hooks and logs when adjustments clamp to zero delta', () => {
		state = createResourceV2State(metadata, {
			values: {
				[alphaId]: 0,
				[betaId]: 3,
			},
		});
		const onGain = vi.fn();
		const onLoss = vi.fn();
		const onValueChange = vi.fn();
		const { context } = createEngineContext({ onGain, onLoss, onValueChange });

		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'remove',
			params: {
				resourceId: alphaId,
				payload: { kind: 'amount', amount: 5 },
				reconciliation: 'clamp',
			},
		};

		resourceV2Remove(effect, context, 1);

		expect(getResourceValue(state, alphaId)).toBe(0);
		expect(onGain).not.toHaveBeenCalled();
		expect(onLoss).not.toHaveBeenCalled();
		expect(onValueChange).not.toHaveBeenCalled();
		expect(context.recentResourceGains).toEqual([]);
	});

	it('ignores negative addition amounts after normalisation', () => {
		const onGain = vi.fn();
		const onLoss = vi.fn();
		const onValueChange = vi.fn();
		const { context } = createEngineContext({ onGain, onLoss, onValueChange });

		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId: alphaId,
				payload: { kind: 'amount', amount: -7 },
				reconciliation: 'clamp',
			},
		};

		resourceV2Add(effect, context, 1);

		expect(getResourceValue(state, alphaId)).toBe(5);
		expect(onGain).not.toHaveBeenCalled();
		expect(onLoss).not.toHaveBeenCalled();
		expect(onValueChange).not.toHaveBeenCalled();
		expect(context.recentResourceGains).toEqual([]);
	});

	it('ignores non-finite addition amounts', () => {
		const onGain = vi.fn();
		const { context } = createEngineContext({ onGain });

		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId: alphaId,
				payload: { kind: 'amount', amount: Number.NaN },
				reconciliation: 'clamp',
			},
		};

		resourceV2Add(effect, context, 1);

		expect(getResourceValue(state, alphaId)).toBe(5);
		expect(onGain).not.toHaveBeenCalled();
		expect(context.recentResourceGains).toEqual([]);
	});

	it('transfers amounts while respecting donor and recipient bounds', () => {
		state = createResourceV2State(metadata, {
			values: {
				[alphaId]: 8,
				[betaId]: 3,
			},
		});
		const onGain = vi.fn();
		const onLoss = vi.fn();
		const onValueChange = vi.fn();
		const { context } = createEngineContext({ onGain, onLoss, onValueChange });
		const effect: EffectDef<ResourceV2TransferEffectParams> = {
			type: 'resource',
			method: 'transfer',
			params: {
				donor: { resourceId: alphaId, reconciliation: 'clamp' },
				recipient: { resourceId: betaId, reconciliation: 'clamp' },
				payload: { kind: 'amount', amount: 6 },
			},
		};

		resourceV2Transfer(effect, context, 1);

		expect(getResourceValue(state, alphaId)).toBe(6);
		expect(getResourceValue(state, betaId)).toBe(5);
		expect(onLoss).toHaveBeenCalledWith(context, alphaId, 2);
		expect(onGain).toHaveBeenCalledWith(context, betaId, 2);
		expect(onValueChange.mock.calls).toEqual([
			[context, alphaId, -2],
			[context, betaId, 2],
		]);
		expect(context.recentResourceGains).toEqual([
			{ key: alphaId, amount: -2 },
			{ key: betaId, amount: 2 },
		]);
	});

	it('prevents direct mutation of limited parents', () => {
		const { context } = createEngineContext();
		const effect: EffectDef<ResourceV2ValueEffectParams> = {
			type: 'resource',
			method: 'add',
			params: {
				resourceId: parentId,
				payload: { kind: 'amount', amount: 1 },
				reconciliation: 'clamp',
			},
		};

		expect(() => resourceV2Add(effect, context, 1)).toThrow(
			/limited ResourceV2 parent/,
		);
	});

	it('increases upper bounds and emits hook notifications', () => {
		const onUpperBoundIncrease = vi.fn();
		const { context } = createEngineContext({ onUpperBoundIncrease });
		const effect: EffectDef<ResourceV2BoundAdjustmentParams> = {
			type: 'resource:upper-bound',
			method: 'increase',
			params: {
				resourceId: betaId,
				amount: 4,
				reconciliation: 'clamp',
			},
		};

		resourceV2UpperBoundIncrease(effect, context, 1);

		expect(
			isResourceV2ValueEffect({
				type: 'resource',
				method: 'add',
				params: {
					resourceId: betaId,
					payload: { kind: 'amount', amount: 1 },
					reconciliation: 'clamp',
				},
			}),
		).toBe(true);
		expect(onUpperBoundIncrease).toHaveBeenCalledWith(context, betaId, 4, 9);
		expect(
			(
				context as EngineContext & { resourceV2: ResourceV2Runtime }
			).resourceV2.state.values.get(betaId)!.bounds.upperBound,
		).toBe(9);
	});
});
