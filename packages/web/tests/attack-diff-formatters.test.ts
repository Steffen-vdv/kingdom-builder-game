import type { AttackPlayerDiff } from '@kingdom-builder/engine';
import { describe, expect, it } from 'vitest';

import { formatDiffCommon } from '../src/translation/effects/formatters/attack/shared';
import {
	getAttackRegistrySelectors,
	selectAttackResourceInfo,
	selectAttackStatInfo,
} from '../src/translation/effects/formatters/attack/registrySelectors';

describe('attack diff formatters registry', () => {
	it('formats resource diffs using the registered formatter', () => {
		const selectors = getAttackRegistrySelectors();
		const resourceDescriptor = selectors.resourceMetadata.list[0];
		if (!resourceDescriptor) {
			throw new Error('Expected at least one resource descriptor');
		}
		const resourceInfo = selectAttackResourceInfo(resourceDescriptor.id);
		const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
			type: 'resource',
			key: resourceDescriptor.id,
			before: 2,
			after: 5,
		};

		const formatted = formatDiffCommon('Change', diff);

		expect(formatted.startsWith('Change:')).toBe(true);
		expect(formatted).toContain(resourceInfo.label);
		expect(formatted).toContain('+3');
	});

	it('formats stat diffs using the registered formatter', () => {
		const selectors = getAttackRegistrySelectors();
		const statDescriptor = selectors.statMetadata.list[0];
		if (!statDescriptor) {
			throw new Error('Expected at least one stat descriptor');
		}
		const statInfo = selectAttackStatInfo(statDescriptor.id);
		const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
			type: 'stat',
			key: statDescriptor.id,
			before: 4,
			after: 9,
		};

		const formatted = formatDiffCommon('Update', diff);

		expect(formatted.startsWith('Update:')).toBe(true);
		expect(formatted).toContain(statInfo.label);
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
