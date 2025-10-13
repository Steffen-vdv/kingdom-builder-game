import type { AttackPlayerDiff } from '@kingdom-builder/engine';
import { describe, expect, it } from 'vitest';

import './helpers/armyAttackSyntheticRegistries';

import { formatDiffCommon } from '../src/translation/effects/formatters/attack/shared';
import {
	listAttackResourceKeys,
	listAttackStatKeys,
	selectAttackResourceDescriptor,
	selectAttackStatDescriptor,
	withAttackTranslationContext,
} from '../src/translation/effects/formatters/attack/registrySelectors';
import {
	createSyntheticCtx,
	suppressSyntheticStatDescriptor,
	restoreSyntheticStatDescriptor,
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
		const { translation } = createSyntheticCtx();
		const formatted = withAttackTranslationContext(translation, () => {
			const resourceKey = getFirst(listAttackResourceKeys());
			const resourceInfo = selectAttackResourceDescriptor(resourceKey);
			const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
				type: 'resource',
				key: resourceKey,
				before: 2,
				after: 5,
			};
			const result = formatDiffCommon('Change', diff, translation);
			expect(result.startsWith('Change:')).toBe(true);
			expect(result).toContain(resourceInfo.label ?? resourceKey);
			expect(result).toContain('+3');
			return result;
		});
		expect(formatted).toBeDefined();
	});

	it('formats stat diffs using the registered formatter', () => {
		const { translation } = createSyntheticCtx();
		const formatted = withAttackTranslationContext(translation, () => {
			const statKey = getFirst(listAttackStatKeys());
			const statInfo = selectAttackStatDescriptor(statKey);
			const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
				type: 'stat',
				key: statKey,
				before: 4,
				after: 9,
			};
			const result = formatDiffCommon('Update', diff, translation);
			expect(result.startsWith('Update:')).toBe(true);
			expect(result).toContain(statInfo.label ?? statKey);
			expect(result).toContain('+5');
			return result;
		});
		expect(formatted).toBeDefined();
	});

	it('falls back to resource key when descriptor metadata is missing', () => {
		const { translation } = createSyntheticCtx();
		const resourceKey = SYNTH_RESOURCE_IDS.castleHP;
		const original = SYNTH_RESOURCE_METADATA[resourceKey];
		delete SYNTH_RESOURCE_METADATA[resourceKey];
		try {
			const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
				type: 'resource',
				key: resourceKey,
				before: 1,
				after: 4,
			};
			const formatted = withAttackTranslationContext(translation, () =>
				formatDiffCommon('Change', diff, translation),
			);
			expect(formatted).toContain('Castle HP');
			expect(formatted).not.toContain(resourceKey);
			expect(formatted).toContain('+3');
		} finally {
			if (original) {
				SYNTH_RESOURCE_METADATA[resourceKey] = original;
			}
		}
	});

	it('falls back to stat key when descriptor metadata is missing', () => {
		const { translation } = createSyntheticCtx();
		const statKey = SYNTH_STAT_IDS.armyStrength;
		suppressSyntheticStatDescriptor(statKey);
		try {
			const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
				type: 'stat',
				key: statKey,
				before: 6,
				after: 7,
			};
			const formatted = withAttackTranslationContext(translation, () =>
				formatDiffCommon('Adjust', diff, translation),
			);
			expect(formatted).toContain('Army Strength');
			expect(formatted).not.toContain(statKey);
			expect(formatted).toContain('+1');
		} finally {
			restoreSyntheticStatDescriptor(statKey);
		}
	});

	it('throws a clear error when a diff type has no registered formatter', () => {
		const unsupportedDiff = {
			type: 'unknown',
			key: 'mystery',
			before: 0,
			after: 1,
		} as unknown as AttackPlayerDiff;

		const { translation } = createSyntheticCtx();
		expect(() =>
			withAttackTranslationContext(translation, () =>
				formatDiffCommon('Oops', unsupportedDiff, translation),
			),
		).toThrow(/Unsupported attack diff type: unknown/);
	});
});
