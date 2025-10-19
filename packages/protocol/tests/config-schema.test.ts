import { describe, expect, it, expectTypeOf } from 'vitest';
import { actionCategorySchema } from '../src';
import type { ActionCategoryConfig } from '../src';

const SAMPLE_CATEGORY: ActionCategoryConfig = {
	id: 'basic',
	title: 'Basic',
	subtitle: 'Core Commands',
	description: 'Default castle commands available every turn.',
	icon: 'icon-action-basic',
	order: 0,
	layout: 'grid-primary',
	hideWhenEmpty: false,
};

describe('config schemas', () => {
	it('validates action category definitions', () => {
		const parsed = actionCategorySchema.parse(SAMPLE_CATEGORY);
		expect(parsed).toEqual(SAMPLE_CATEGORY);
	});

	it('exports type alias matching the schema', () => {
		expectTypeOf<
			typeof SAMPLE_CATEGORY
		>().toEqualTypeOf<ActionCategoryConfig>();
	});
});
