import { RESOURCES, STATS } from '@kingdom-builder/contents';
import type { AttackPlayerDiff } from '@kingdom-builder/engine';
import { describe, expect, it } from 'vitest';

import { formatDiffCommon } from '../src/translation/effects/formatters/attack/shared';

const getFirstEntry = <K extends string, V>(record: Record<K, V>): [K, V] => {
	const entries = Object.entries(record) as [K, V][];
	if (!entries.length) {
		throw new Error('Expected at least one record entry for test setup');
	}
	return entries[0];
};

describe('attack diff formatters registry', () => {
	it('formats resource diffs using the registered formatter', () => {
		const [resourceKey, resourceInfo] = getFirstEntry(RESOURCES);
		const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
			type: 'resource',
			key: resourceKey,
			before: 2,
			after: 5,
		};

		const formatted = formatDiffCommon('Change', diff);

		expect(formatted.startsWith('Change:')).toBe(true);
		expect(formatted).toContain(resourceInfo.label ?? resourceKey);
		expect(formatted).toContain('+3');
	});

	it('formats stat diffs using the registered formatter', () => {
		const [statKey, statInfo] = getFirstEntry(STATS);
		const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
			type: 'stat',
			key: statKey,
			before: 4,
			after: 9,
		};

		const formatted = formatDiffCommon('Update', diff);

		expect(formatted.startsWith('Update:')).toBe(true);
		expect(formatted).toContain(statInfo.label ?? statKey);
		expect(formatted).toContain('+5');
	});

	it('throws a clear error when a diff type has no registered formatter', () => {
		const unsupportedDiff = {
			type: 'unknown',
			key: 'mystery',
			before: 0,
			after: 1,
		} as unknown as AttackPlayerDiff;

		expect(() => formatDiffCommon('Oops', unsupportedDiff)).toThrow(
			/Unsupported attack diff type: unknown/,
		);
	});
});
