import { describe, expect, it } from 'vitest';

import { formatMissingResources } from '../../../src/components/actions/utils';

const selectDescriptor = (resourceKey: string) => ({
	icon: '🧱',
	label: `Label for ${resourceKey}`,
});

describe('formatMissingResources', () => {
	it('returns undefined when the cost is missing', () => {
		const result = formatMissingResources(
			{ resourceA: undefined as unknown as number },
			{},
			selectDescriptor,
		);
		expect(result).toBeUndefined();
	});

	it('skips non-finite costs without emitting NaN text', () => {
		const result = formatMissingResources(
			{ resourceA: Number.NaN as unknown as number },
			{},
			selectDescriptor,
		);
		expect(result).toBeUndefined();
	});

	it('formats shortages when the numeric cost exceeds availability', () => {
		const result = formatMissingResources(
			{ resourceA: '5' as unknown as number },
			{ resourceA: 2 },
			selectDescriptor,
		);
		expect(result).toBe('Need 3 🧱 Label for resourceA');
	});
});
