import { describe, expect, it } from 'vitest';

import { resourceChange } from '../../src/resourceV2/effects/changeBuilder';

describe('ResourceV2 change builder', () => {
	it('produces amount change payloads with optional suppress hooks and reconciliation', () => {
		const params = resourceChange('resource:test').amount(5).reconciliation().suppressHooks().build();

		expect(params).toEqual({
			resourceId: 'resource:test',
			change: { type: 'amount', amount: 5 },
			reconciliation: 'clamp',
			suppressHooks: true,
		});
	});

	it('supports percent change payloads with multiple modifiers and rounding', () => {
		const params = resourceChange('resource:percent').percent(0.4, 0.1).roundingMode('up').build();

		expect(params).toEqual({
			resourceId: 'resource:percent',
			change: {
				type: 'percent',
				modifiers: [0.4, 0.1],
				roundingMode: 'up',
			},
		});
	});

	it('rejects mixing amount and percent change builders', () => {
		expect(() => resourceChange('resource:mix').amount(1).percent(0.5)).toThrow('ResourceV2 change builder cannot mix amount() and percent()');
	});

	it('requires at least one percent modifier before rounding is configured', () => {
		const builder = resourceChange('resource:percent-only');
		expect(() => builder.roundingMode('down')).toThrow('ResourceV2 change builder roundingMode() requires percent() to be configured first.');
	});
});
