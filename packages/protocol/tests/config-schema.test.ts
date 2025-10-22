import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';

import { actionCategorySchema, effectSchema } from '../src';
import type { ActionCategoryConfig, EffectConfig } from '../src';

describe('action category schema', () => {
	it('matches the exported config type', () => {
		expectTypeOf<ActionCategoryConfig>().toEqualTypeOf<
			ZodInfer<typeof actionCategorySchema>
		>();
	});

	it('accepts canonical category definitions', () => {
		const category: ActionCategoryConfig = {
			id: 'basic',
			title: 'Basic',
			subtitle: '(Effects take place immediately, unless stated otherwise)',
			description: 'Default castle commands available every turn.',
			icon: '⚙️',
			order: 0,
			layout: 'grid-primary',
			hideWhenEmpty: false,
			analyticsKey: 'category-basic',
		};

		const parsed = actionCategorySchema.parse(category);

		expect(parsed).toEqual(category);
	});

	it('rejects unknown layout identifiers', () => {
		expect(() =>
			actionCategorySchema.parse({
				id: 'experimental',
				title: 'Experimental',
				icon: 'icon-action-experimental',
				order: 99,
				layout: 'grid-tertiary',
			}),
		).toThrow();
	});
});

describe('effect schema', () => {
	it('accepts effect metadata configuration', () => {
		const effect: EffectConfig = {
			type: 'resource',
			method: 'adjust',
			params: { resource: 'gold', amount: 5 },
			round: 'nearest',
			reconciliation: {
				onValue: 'clamp',
				onBounds: 'pass',
			},
			suppressHooks: true,
			meta: { tag: 'test-effect' },
		};

		expect(effectSchema.parse(effect)).toEqual(effect);
	});

	it('allows partial reconciliation metadata', () => {
		const effect: EffectConfig = {
			method: 'noop',
			reconciliation: {
				onBounds: 'reject',
			},
		};

		expect(effectSchema.parse(effect)).toEqual(effect);
	});

	it('rejects unknown rounding modes', () => {
		const effect = {
			round: 'ceil',
		} as unknown as EffectConfig;

		expect(() => effectSchema.parse(effect)).toThrow();
	});

	it('rejects invalid reconciliation strategies', () => {
		const effect = {
			reconciliation: {
				onValue: 'min',
			},
		} as unknown as EffectConfig;

		expect(() => effectSchema.parse(effect)).toThrow();
	});

	it('rejects non-boolean hook suppression flags', () => {
		const effect = {
			suppressHooks: 'yes',
		} as unknown as EffectConfig;

		expect(() => effectSchema.parse(effect)).toThrow();
	});
});
