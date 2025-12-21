import { describe, expect, it } from 'vitest';
import { determineCommonActionCostResource } from '../../src/setup/action_cost_resolver';
import type { ActionConfig as ActionDef } from '@kingdom-builder/protocol';
import { Registry } from '@kingdom-builder/protocol';

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
});
