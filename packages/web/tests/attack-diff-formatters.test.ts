import type { AttackPlayerDiff } from '@kingdom-builder/engine';
import { describe, expect, it } from 'vitest';

import { formatDiffCommon } from '../src/translation/effects/formatters/attack/shared';
import { formatStatValue } from '../src/utils/stats';
import {
	listAttackResourceKeys,
	listAttackStatKeys,
	selectAttackResourceDescriptor,
	selectAttackStatDescriptor,
} from '../src/translation/effects/formatters/attack/registrySelectors';
import {
	suppressSyntheticStatDescriptor,
	restoreSyntheticStatDescriptor,
	createSyntheticEngineContext,
} from './helpers/armyAttackFactories';
import {
	SYNTH_RESOURCE_IDS,
	SYNTH_RESOURCE_METADATA,
	SYNTH_STAT_IDS,
} from './helpers/armyAttackConfig';

const getFirst = <T>(values: readonly T[]): T => {
	if (!values.length) {
		throw new Error('Expected at least one registry entry for test setup');
	}
	return values[0] as T;
};

describe('attack diff formatters registry', () => {
	it('formats resource diffs using the registered formatter', () => {
		const { translation } = createSyntheticEngineContext();
		const resourceKey = getFirst(listAttackResourceKeys(translation));
		const resourceInfo = selectAttackResourceDescriptor(
			translation,
			resourceKey,
		);
		const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
			type: 'resource',
			key: resourceKey,
			before: 2,
			after: 5,
		};

		const formatted = formatDiffCommon('Change', diff, translation);

		expect(formatted.startsWith('Change:')).toBe(true);
		expect(formatted).toContain(resourceInfo.label ?? resourceKey);
		expect(formatted).toContain('+3');
	});

	it('formats stat diffs using the registered formatter', () => {
		const { translation } = createSyntheticEngineContext();
		const statKey = getFirst(listAttackStatKeys(translation));
		const statInfo = selectAttackStatDescriptor(translation, statKey);
		const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
			type: 'stat',
			key: statKey,
			before: 4,
			after: 9,
		};

		const formatted = formatDiffCommon('Update', diff, translation);

		expect(formatted.startsWith('Update:')).toBe(true);
		expect(formatted).toContain(statInfo.label ?? statKey);
		expect(formatted).toContain('+5');
		const before = formatStatValue(statKey, diff.before, translation.assets);
		const after = formatStatValue(statKey, diff.after, translation.assets);
		expect(formatted).toContain(before);
		expect(formatted).toContain(after);
		if (
			statInfo.displayAsPercent ||
			(Boolean(statInfo.format) &&
				typeof statInfo.format === 'object' &&
				Boolean(statInfo.format.percent))
		) {
			expect(formatted).toMatch(/%/);
		}
	});

	it('falls back to resource key when descriptor metadata is missing', () => {
		const resourceKey = SYNTH_RESOURCE_IDS.castleHP;
		const original = SYNTH_RESOURCE_METADATA[resourceKey];
		delete SYNTH_RESOURCE_METADATA[resourceKey];
		try {
			const { translation } = createSyntheticEngineContext();
			const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
				type: 'resource',
				key: resourceKey,
				before: 1,
				after: 4,
			};
			const formatted = formatDiffCommon('Change', diff, translation);
			const descriptor = selectAttackResourceDescriptor(
				translation,
				resourceKey,
			);
			const expectedLabel = descriptor.label ?? resourceKey;
			if (descriptor.icon) {
				expect(formatted).toContain(descriptor.icon);
			}
			expect(formatted).toContain(expectedLabel);
			expect(formatted).toContain('+3');
		} finally {
			if (original) {
				SYNTH_RESOURCE_METADATA[resourceKey] = original;
			}
		}
	});

	it('falls back to stat key when descriptor metadata is missing', () => {
		const statKey = SYNTH_STAT_IDS.armyStrength;
		suppressSyntheticStatDescriptor(statKey);
		try {
			const { translation } = createSyntheticEngineContext();
			const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
				type: 'stat',
				key: statKey,
				before: 6,
				after: 7,
			};
			const formatted = formatDiffCommon('Adjust', diff, translation);
			const descriptor = selectAttackStatDescriptor(translation, statKey);
			const expectedLabel = descriptor.label ?? statKey;
			if (descriptor.icon) {
				expect(formatted).toContain(descriptor.icon);
			}
			expect(formatted).toContain(expectedLabel);
			expect(formatted).toContain('+1');
		} finally {
			restoreSyntheticStatDescriptor(statKey);
		}
	});

	it('throws a clear error when a diff type has no registered formatter', () => {
		const { translation } = createSyntheticEngineContext();
		const unsupportedDiff = {
			type: 'unknown',
			key: 'mystery',
			before: 0,
			after: 1,
		} as unknown as AttackPlayerDiff;

		expect(() =>
			formatDiffCommon('Oops', unsupportedDiff, translation),
		).toThrow(/Unsupported attack diff type: unknown/);
	});
});
