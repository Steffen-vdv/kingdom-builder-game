import type { AttackPlayerDiff } from '@kingdom-builder/engine';
import { describe, expect, it } from 'vitest';

import './helpers/armyAttackSyntheticRegistries';

import {
	formatDiffCommon,
	iconLabel,
} from '../src/translation/effects/formatters/attack/shared';
import {
	listAttackResourceKeys,
	listAttackStatKeys,
	selectAttackResourceDescriptor,
	selectAttackStatDescriptor,
} from '../src/translation/effects/formatters/attack/registrySelectors';
import {
	suppressSyntheticStatDescriptor,
	restoreSyntheticStatDescriptor,
	createSyntheticCtx,
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

		const formatted = formatDiffCommon('Change', diff, undefined, translation);

		expect(formatted.startsWith('Change:')).toBe(true);
		expect(formatted).toContain(resourceInfo.label ?? resourceKey);
		expect(formatted).toContain('+3');
	});

	it('formats stat diffs using the registered formatter', () => {
		const { translation } = createSyntheticCtx();
		const statKey = getFirst(listAttackStatKeys(translation));
		const statInfo = selectAttackStatDescriptor(translation, statKey);
		const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
			type: 'stat',
			key: statKey,
			before: 4,
			after: 9,
		};

		const formatted = formatDiffCommon('Update', diff, undefined, translation);

		expect(formatted.startsWith('Update:')).toBe(true);
		expect(formatted).toContain(statInfo.label ?? statKey);
		expect(formatted).toContain('+5');
	});

	it('falls back to resource key when descriptor metadata is missing', () => {
		const resourceKey = SYNTH_RESOURCE_IDS.castleHP;
		const original = SYNTH_RESOURCE_METADATA[resourceKey];
		delete SYNTH_RESOURCE_METADATA[resourceKey];
		try {
			const { translation } = createSyntheticCtx();
			const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
				type: 'resource',
				key: resourceKey,
				before: 1,
				after: 4,
			};
			const formatted = formatDiffCommon(
				'Change',
				diff,
				undefined,
				translation,
			);
			const descriptor = selectAttackResourceDescriptor(
				translation,
				resourceKey,
			);
			expect(formatted).toContain(iconLabel(descriptor.icon, descriptor.label));
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
			const { translation } = createSyntheticCtx();
			const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
				type: 'stat',
				key: statKey,
				before: 6,
				after: 7,
			};
			const formatted = formatDiffCommon(
				'Adjust',
				diff,
				undefined,
				translation,
			);
			const descriptor = selectAttackStatDescriptor(translation, statKey);
			expect(formatted).toContain(iconLabel(descriptor.icon, descriptor.label));
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

		expect(() => formatDiffCommon('Oops', unsupportedDiff)).toThrow(
			/Unsupported attack diff type/,
		);
	});
});
