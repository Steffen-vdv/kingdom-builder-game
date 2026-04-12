import { describe, it, expect } from 'vitest';
import {
	runPoolFill,
	getStartingTier,
	getMaxTier,
	canUpgrade,
	createInitialActionState,
} from '../../src/pool/fillAlgorithm';
import { RngService } from '../../src/services/rng_service';
import type { PlayerState } from '../../src/state';
import type {
	ActionConfig,
	ActionMetaCategoryConfig,
} from '@boardsmith/protocol';

function createMockPlayerState(
	overrides: Partial<PlayerState> = {},
): PlayerState {
	return {
		name: 'TestPlayer',
		resourceValues: {},
		lands: [],
		buildings: new Set(),
		developments: [],
		passives: new Map(),
		costModifiers: [],
		resultModifiers: [],
		totalPopulationOffset: 0,
		actionStates: {},
		metaCategoryBindingSpent: {},
		...overrides,
	} as PlayerState;
}

function createMockAction(
	id: string,
	startingTier: number = 1,
	maxTier: number = 1,
	system: boolean = false,
): ActionConfig {
	const tiers: Record<string, { effects: [] }> = {};
	for (let tier = startingTier; tier <= maxTier; tier++) {
		tiers[String(tier)] = { effects: [] };
	}
	return {
		id,
		name: `Action ${id}`,
		metaCategory: 'meta:test',
		tiers,
		system,
	};
}

function createMetaCategoryWithPool(
	id: string,
	poolSize: number,
	thresholds: Array<{ bindingSpent: number; weights: Record<number, number> }>,
): ActionMetaCategoryConfig {
	return {
		id,
		label: 'Test Category',
		icon: '🔬',
		bindingResourceId: 'resource:test',
		costModel: 'per-item',
		visibilityTrigger: 'resource-touched',
		order: 0,
		pool: {
			size: poolSize,
			fillMode: {
				type: 'tier-progression-curve',
				thresholds,
			},
		},
	};
}

describe('getStartingTier', () => {
	it('returns the lowest tier number', () => {
		const action = createMockAction('test', 1, 3);
		expect(getStartingTier(action)).toBe(1);
	});

	it('works with non-1 starting tiers', () => {
		const action = createMockAction('test', 2, 3);
		expect(getStartingTier(action)).toBe(2);
	});

	it('throws when action has no tiers', () => {
		const action: ActionConfig = {
			id: 'no-tiers',
			name: 'No Tiers',
			metaCategory: 'meta:test',
			tiers: {},
		};
		expect(() => getStartingTier(action)).toThrow('has no tiers defined');
	});
});

describe('getMaxTier', () => {
	it('returns the highest tier number', () => {
		const action = createMockAction('test', 1, 3);
		expect(getMaxTier(action)).toBe(3);
	});

	it('works with single-tier actions', () => {
		const action = createMockAction('test', 1, 1);
		expect(getMaxTier(action)).toBe(1);
	});

	it('throws when action has no tiers', () => {
		const action: ActionConfig = {
			id: 'no-tiers',
			name: 'No Tiers',
			metaCategory: 'meta:test',
			tiers: {},
		};
		expect(() => getMaxTier(action)).toThrow('has no tiers defined');
	});
});

describe('canUpgrade', () => {
	it('returns true when current tier is below max', () => {
		const action = createMockAction('test', 1, 3);
		expect(canUpgrade(action, 1)).toBe(true);
		expect(canUpgrade(action, 2)).toBe(true);
	});

	it('returns false when current tier equals max', () => {
		const action = createMockAction('test', 1, 3);
		expect(canUpgrade(action, 3)).toBe(false);
	});

	it('returns false for single-tier actions', () => {
		const action = createMockAction('test', 1, 1);
		expect(canUpgrade(action, 1)).toBe(false);
	});
});

describe('createInitialActionState', () => {
	it('creates state with correct starting tier', () => {
		const action = createMockAction('test', 2, 3);
		const state = createInitialActionState(action, false);
		expect(state.currentTier).toBe(2);
	});

	it('sets poolLocked based on hasPool parameter', () => {
		const action = createMockAction('test', 1, 1);

		const stateWithPool = createInitialActionState(action, true);
		expect(stateWithPool.poolLocked).toBe(true);

		const stateWithoutPool = createInitialActionState(action, false);
		expect(stateWithoutPool.poolLocked).toBe(false);
	});

	it('respects action.locked property', () => {
		const lockedAction = { ...createMockAction('test', 1, 1), locked: true };
		const unlockedAction = {
			...createMockAction('test', 1, 1),
			locked: false,
		};

		expect(createInitialActionState(lockedAction, false).locked).toBe(true);
		expect(createInitialActionState(unlockedAction, false).locked).toBe(false);
	});

	it('defaults locked to false when not specified', () => {
		const action = createMockAction('test', 1, 1);
		const state = createInitialActionState(action, false);
		expect(state.locked).toBe(false);
	});

	it('sets exhausted to false', () => {
		const action = createMockAction('test', 1, 1);
		const state = createInitialActionState(action, true);
		expect(state.exhausted).toBe(false);
	});
});

describe('runPoolFill', () => {
	const defaultThresholds = [
		{ bindingSpent: 0, weights: { 1: 100, 2: 10, 3: 1 } },
	];

	it('throws when meta-category has no pool config', () => {
		const player = createMockPlayerState();
		const metaCategory: ActionMetaCategoryConfig = {
			id: 'no-pool',
			label: 'No Pool',
			icon: '❌',
			bindingResourceId: 'resource:test',
			costModel: 'global',
			visibilityTrigger: 'always',
			order: 0,
		};
		const actions = new Map<string, ActionConfig>();
		const rng = new RngService(1);

		expect(() => runPoolFill(player, metaCategory, actions, rng)).toThrow(
			'no pool config',
		);
	});

	it('returns empty when pool is already full', () => {
		const metaCategory = createMetaCategoryWithPool(
			'meta:test',
			2,
			defaultThresholds,
		);
		const action1 = createMockAction('action1', 1, 1);
		const action2 = createMockAction('action2', 1, 1);
		const actions = new Map([
			['action1', action1],
			['action2', action2],
		]);

		// Both actions are already in pool (poolLocked = false)
		const player = createMockPlayerState({
			actionStates: {
				action1: {
					locked: false,
					poolLocked: false,
					currentTier: 1,
					exhausted: false,
				},
				action2: {
					locked: false,
					poolLocked: false,
					currentTier: 1,
					exhausted: false,
				},
			},
		});

		const rng = new RngService(1);
		const result = runPoolFill(player, metaCategory, actions, rng);

		expect(result.selectedActions).toEqual([]);
		expect(result.deficit).toBe(0);
	});

	it('selects candidates that are pool-locked', () => {
		const metaCategory = createMetaCategoryWithPool(
			'meta:test',
			1,
			defaultThresholds,
		);
		const action1 = createMockAction('action1', 1, 1);
		const actions = new Map([['action1', action1]]);

		// Action is pool-locked (candidate for selection)
		const player = createMockPlayerState({
			actionStates: {
				action1: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
			},
		});

		const rng = new RngService(1);
		const result = runPoolFill(player, metaCategory, actions, rng);

		expect(result.selectedActions).toEqual(['action1']);
		expect(result.deficit).toBe(0);
	});

	it('excludes exhausted actions', () => {
		const metaCategory = createMetaCategoryWithPool(
			'meta:test',
			1,
			defaultThresholds,
		);
		const action1 = createMockAction('exhausted', 1, 1);
		const action2 = createMockAction('available', 1, 1);
		const actions = new Map([
			['exhausted', action1],
			['available', action2],
		]);

		const player = createMockPlayerState({
			actionStates: {
				exhausted: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: true,
				},
				available: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
			},
		});

		const rng = new RngService(1);
		const result = runPoolFill(player, metaCategory, actions, rng);

		expect(result.selectedActions).toEqual(['available']);
	});

	it('excludes content-locked actions', () => {
		const metaCategory = createMetaCategoryWithPool(
			'meta:test',
			1,
			defaultThresholds,
		);
		const lockedAction = { ...createMockAction('locked', 1, 1) };
		const unlockedAction = createMockAction('unlocked', 1, 1);
		const actions = new Map([
			['locked', lockedAction],
			['unlocked', unlockedAction],
		]);

		const player = createMockPlayerState({
			actionStates: {
				locked: {
					locked: true,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
				unlocked: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
			},
		});

		const rng = new RngService(1);
		const result = runPoolFill(player, metaCategory, actions, rng);

		expect(result.selectedActions).toEqual(['unlocked']);
	});

	it('excludes system actions', () => {
		const metaCategory = createMetaCategoryWithPool(
			'meta:test',
			1,
			defaultThresholds,
		);
		const systemAction = createMockAction('system', 1, 1, true);
		const regularAction = createMockAction('regular', 1, 1, false);
		const actions = new Map([
			['system', systemAction],
			['regular', regularAction],
		]);

		const player = createMockPlayerState({
			actionStates: {
				system: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
				regular: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
			},
		});

		const rng = new RngService(1);
		const result = runPoolFill(player, metaCategory, actions, rng);

		expect(result.selectedActions).toEqual(['regular']);
	});

	it('reports deficit when not enough candidates', () => {
		const metaCategory = createMetaCategoryWithPool(
			'meta:test',
			3,
			defaultThresholds,
		);
		const action1 = createMockAction('action1', 1, 1);
		const actions = new Map([['action1', action1]]);

		const player = createMockPlayerState({
			actionStates: {
				action1: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
			},
		});

		const rng = new RngService(1);
		const result = runPoolFill(player, metaCategory, actions, rng);

		expect(result.selectedActions).toEqual(['action1']);
		expect(result.deficit).toBe(2); // Wanted 3, got 1
	});

	it('uses tier weights based on binding spent', () => {
		const metaCategory = createMetaCategoryWithPool('meta:test', 1, [
			{ bindingSpent: 0, weights: { 1: 100, 2: 0 } },
			{ bindingSpent: 10, weights: { 1: 0, 2: 100 } },
		]);

		const tier1Action = createMockAction('tier1', 1, 1);
		const tier2Action = createMockAction('tier2', 2, 2);
		const actions = new Map([
			['tier1', tier1Action],
			['tier2', tier2Action],
		]);

		// At bindingSpent = 0, tier 1 should be heavily favored
		const player0 = createMockPlayerState({
			metaCategoryBindingSpent: { 'meta:test': 0 },
			actionStates: {
				tier1: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
				tier2: {
					locked: false,
					poolLocked: true,
					currentTier: 2,
					exhausted: false,
				},
			},
		});

		const rng0 = new RngService(42);
		const result0 = runPoolFill(player0, metaCategory, actions, rng0);
		expect(result0.selectedActions).toEqual(['tier1']);

		// At bindingSpent = 15, tier 2 should be heavily favored
		const player15 = createMockPlayerState({
			metaCategoryBindingSpent: { 'meta:test': 15 },
			actionStates: {
				tier1: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
				tier2: {
					locked: false,
					poolLocked: true,
					currentTier: 2,
					exhausted: false,
				},
			},
		});

		const rng15 = new RngService(42);
		const result15 = runPoolFill(player15, metaCategory, actions, rng15);
		expect(result15.selectedActions).toEqual(['tier2']);
	});

	it('produces deterministic results from same seed', () => {
		const metaCategory = createMetaCategoryWithPool('meta:test', 2, [
			{ bindingSpent: 0, weights: { 1: 50, 2: 50 } },
		]);

		const actions = new Map([
			['a1', createMockAction('a1', 1, 1)],
			['a2', createMockAction('a2', 1, 1)],
			['a3', createMockAction('a3', 2, 2)],
			['a4', createMockAction('a4', 2, 2)],
		]);

		const actionStates = {
			a1: { locked: false, poolLocked: true, currentTier: 1, exhausted: false },
			a2: { locked: false, poolLocked: true, currentTier: 1, exhausted: false },
			a3: { locked: false, poolLocked: true, currentTier: 2, exhausted: false },
			a4: { locked: false, poolLocked: true, currentTier: 2, exhausted: false },
		};

		const player1 = createMockPlayerState({
			actionStates: { ...actionStates },
		});
		const player2 = createMockPlayerState({
			actionStates: { ...actionStates },
		});

		const result1 = runPoolFill(
			player1,
			metaCategory,
			actions,
			new RngService(12345),
		);
		const result2 = runPoolFill(
			player2,
			metaCategory,
			actions,
			new RngService(12345),
		);

		expect(result1.selectedActions).toEqual(result2.selectedActions);
	});

	it('does not select same action twice', () => {
		const metaCategory = createMetaCategoryWithPool('meta:test', 3, [
			{ bindingSpent: 0, weights: { 1: 100 } },
		]);

		const actions = new Map([
			['a1', createMockAction('a1', 1, 1)],
			['a2', createMockAction('a2', 1, 1)],
			['a3', createMockAction('a3', 1, 1)],
		]);

		const player = createMockPlayerState({
			actionStates: {
				a1: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
				a2: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
				a3: {
					locked: false,
					poolLocked: true,
					currentTier: 1,
					exhausted: false,
				},
			},
		});

		const rng = new RngService(999);
		const result = runPoolFill(player, metaCategory, actions, rng);

		// Should select 3 unique actions
		expect(result.selectedActions.length).toBe(3);
		expect(new Set(result.selectedActions).size).toBe(3);
	});
});
