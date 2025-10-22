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
	const baseEffect: EffectConfig = {
		type: 'resource',
		method: 'gain',
		params: { resource: 'gold', amount: 2 },
	};

	it('accepts effects with reconciliation metadata and hook suppression', () => {
		const enrichedEffect: EffectConfig = {
			...baseEffect,
			round: 'nearest',
			reconciliation: {
				onValue: 'clamp',
				onBounds: 'pass',
			},
			suppressHooks: true,
		};

		const parsed = effectSchema.parse(enrichedEffect);

		expect(parsed).toEqual(enrichedEffect);
	});

	it('accepts legacy effects without the new metadata', () => {
		const parsed = effectSchema.parse(baseEffect);

		expect(parsed).toEqual(baseEffect);
	});

	it('rejects unknown rounding strategies', () => {
		expect(() =>
			effectSchema.parse({
				...baseEffect,
				round: 'floor' as unknown as EffectConfig['round'],
			}),
		).toThrow();
	});

	it('rejects invalid reconciliation strategies', () => {
		expect(() =>
			effectSchema.parse({
				...baseEffect,
				reconciliation: {
					onValue: 'ignore' as unknown as NonNullable<
						EffectConfig['reconciliation']
					>['onValue'],
				},
			}),
		).toThrow();
	});
});
