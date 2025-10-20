import { describe, expect, it, expectTypeOf } from 'vitest';
import type { infer as ZodInfer } from 'zod';

import { actionCategorySchema } from '../src';
import type { ActionCategoryConfig } from '../src';

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
