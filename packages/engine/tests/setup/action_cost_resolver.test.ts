import { describe, expect, it } from 'vitest';
import { determineCommonActionCostResource } from '../../src/setup/action_cost_resolver';
import type { ActionConfig as ActionDef } from '@kingdom-builder/protocol';
import type { RuntimeResourceCatalog } from '../../src/resource-v2';
import { Registry } from '@kingdom-builder/protocol';

function createMockResourceCatalog(
	resources: Array<{
		id: string;
		globalCost?: { amount: number };
	}> = [],
): RuntimeResourceCatalog {
	const ordered = resources.map((r) => ({
		id: r.id,
		globalCost: r.globalCost,
	}));
	const byId = Object.fromEntries(
		resources.map((r) => [r.id, { id: r.id, globalCost: r.globalCost }]),
	);
	return {
		resources: {
			ordered,
			byId,
		},
		groups: {
			ordered: [],
			byId: {},
		},
	} as unknown as RuntimeResourceCatalog;
}

describe('determineCommonActionCostResource', () => {
	it('returns empty resourceId when no actions have baseCosts', () => {
		const actions = new Registry<ActionDef>();
		actions.add('action1', { id: 'action1', system: false } as ActionDef);
		actions.add('action2', { id: 'action2', system: false } as ActionDef);

		const result = determineCommonActionCostResource(actions);

		expect(result).toEqual({ resourceId: '', amount: null });
	});

	it('finds common cost resource from intersection', () => {
		const actions = new Registry<ActionDef>();
		actions.add('action1', {
			id: 'action1',
			system: false,
			baseCosts: { ap: 1, gold: 2 },
		} as ActionDef);
		actions.add('action2', {
			id: 'action2',
			system: false,
			baseCosts: { ap: 2 },
		} as ActionDef);

		const result = determineCommonActionCostResource(actions);

		expect(result).toEqual({ resourceId: 'ap', amount: null });
	});

	it('ignores system actions for intersection', () => {
		const actions = new Registry<ActionDef>();
		actions.add('action1', {
			id: 'action1',
			system: false,
			baseCosts: { ap: 1 },
		} as ActionDef);
		actions.add('systemAction', {
			id: 'systemAction',
			system: true,
			baseCosts: { gold: 5 },
		} as ActionDef);

		const result = determineCommonActionCostResource(actions);

		expect(result).toEqual({ resourceId: 'ap', amount: null });
	});

	it('skips actions with empty baseCosts in intersection', () => {
		const actions = new Registry<ActionDef>();
		actions.add('action1', {
			id: 'action1',
			system: false,
			baseCosts: { ap: 1 },
		} as ActionDef);
		actions.add('action2', {
			id: 'action2',
			system: false,
			baseCosts: {},
		} as ActionDef);

		const result = determineCommonActionCostResource(actions);

		expect(result).toEqual({ resourceId: 'ap', amount: null });
	});

	it('uses global cost resource from catalog', () => {
		const actions = new Registry<ActionDef>();
		actions.add('action1', {
			id: 'action1',
			system: false,
		} as ActionDef);

		const catalog = createMockResourceCatalog([
			{ id: 'resource:core:ap', globalCost: { amount: 1 } },
		]);

		const result = determineCommonActionCostResource(actions, catalog);

		expect(result).toEqual({ resourceId: 'resource:core:ap', amount: 1 });
	});

	it('throws when multiple global cost resources are defined', () => {
		const actions = new Registry<ActionDef>();

		const catalog = createMockResourceCatalog([
			{ id: 'resource:core:ap', globalCost: { amount: 1 } },
			{ id: 'resource:core:other', globalCost: { amount: 2 } },
		]);

		expect(() =>
			determineCommonActionCostResource(actions, catalog),
		).toThrowError(
			'resource:core:other attempted to register as a second global action cost resource',
		);
	});

	it('throws when action overrides global cost resource', () => {
		const actions = new Registry<ActionDef>();
		actions.add('action1', {
			id: 'action1',
			system: false,
			baseCosts: { 'resource:core:ap': 5 },
		} as ActionDef);

		const catalog = createMockResourceCatalog([
			{ id: 'resource:core:ap', globalCost: { amount: 1 } },
		]);

		expect(() =>
			determineCommonActionCostResource(actions, catalog),
		).toThrowError(/forbids per-action overrides.*action1/);
	});

	it('allows system actions to use global cost resource', () => {
		const actions = new Registry<ActionDef>();
		actions.add('action1', {
			id: 'action1',
			system: true,
			baseCosts: { 'resource:core:ap': 5 },
		} as ActionDef);

		const catalog = createMockResourceCatalog([
			{ id: 'resource:core:ap', globalCost: { amount: 1 } },
		]);

		const result = determineCommonActionCostResource(actions, catalog);

		expect(result).toEqual({ resourceId: 'resource:core:ap', amount: 1 });
	});
});
