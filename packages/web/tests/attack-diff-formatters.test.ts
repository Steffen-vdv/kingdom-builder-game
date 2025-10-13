import type { AttackPlayerDiff } from '@kingdom-builder/engine';
import { describe, expect, it } from 'vitest';

import { formatDiffCommon } from '../src/translation/effects/formatters/attack/shared';
import {
	listAttackResourceKeys,
	listAttackStatKeys,
	selectAttackResourceDescriptor,
	selectAttackStatDescriptor,
} from '../src/translation/effects/formatters/attack/registrySelectors';
import {
	suppressSyntheticStatDescriptor,
	restoreSyntheticStatDescriptor,
} from './helpers/armyAttackFactories';
import {
	SYNTH_RESOURCE_IDS,
	SYNTH_RESOURCE_METADATA,
	SYNTH_STAT_IDS,
	SYNTH_STAT_METADATA,
} from './helpers/armyAttackConfig';
import {
	createTranslationContextStub,
	toTranslationPlayer,
	wrapTranslationRegistry,
} from './helpers/translationContextStub';
import type { TranslationAssets } from '../src/translation/context';
import { humanizeIdentifier } from '../src/translation/effects/stringUtils';

const translationAssets: TranslationAssets = {
	resources: Object.fromEntries(
		Object.values(SYNTH_RESOURCE_METADATA).map((descriptor) => [
			descriptor.key,
			{ icon: descriptor.icon, label: descriptor.label },
		]),
	),
	stats: Object.fromEntries(
		Object.values(SYNTH_STAT_METADATA).map((descriptor) => [
			descriptor.key,
			{ icon: descriptor.icon, label: descriptor.label },
		]),
	),
	populations: {},
	population: {},
	land: {},
	slot: {},
	passive: {},
	upkeep: {},
	modifiers: {},
	triggers: {},
	tierSummaries: {},
	formatPassiveRemoval: (description: string) =>
		`Active as long as ${description}`,
};

const baseTranslationOptions = {
	phases: [],
	actionCostResource: SYNTH_RESOURCE_IDS.gold,
	actions: wrapTranslationRegistry({
		get(id: string) {
			return { id, icon: '', name: id };
		},
		has() {
			return true;
		},
	}),
	buildings: wrapTranslationRegistry({
		get(id: string) {
			return { id, icon: '', name: id };
		},
		has() {
			return true;
		},
	}),
	developments: wrapTranslationRegistry({
		get(id: string) {
			return { id, icon: '', name: id };
		},
		has() {
			return true;
		},
	}),
	activePlayer: toTranslationPlayer({
		id: 'A',
		name: 'Player A',
		resources: {},
		population: {},
	}),
	opponent: toTranslationPlayer({
		id: 'B',
		name: 'Player B',
		resources: {},
		population: {},
	}),
} as const;

const createContext = (assets: TranslationAssets) =>
	createTranslationContextStub({
		...baseTranslationOptions,
		assets,
	});

const translationContext = createContext(translationAssets);

const getFirst = <T>(values: readonly T[]): T => {
	if (!values.length) {
		throw new Error('Expected at least one registry entry for test setup');
	}
	return values[0] as T;
};

describe('attack diff formatters registry', () => {
	it('formats resource diffs using the registered formatter', () => {
		const resourceKey = getFirst(listAttackResourceKeys(translationContext));
		const resourceInfo = selectAttackResourceDescriptor(
			translationContext,
			resourceKey,
		);
		const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
			type: 'resource',
			key: resourceKey,
			before: 2,
			after: 5,
		};

		const formatted = formatDiffCommon(translationContext, 'Change', diff);

		expect(formatted.startsWith('Change:')).toBe(true);
		expect(formatted).toContain(resourceInfo.label ?? resourceKey);
		expect(formatted).toContain('+3');
	});

	it('formats stat diffs using the registered formatter', () => {
		const statKey = getFirst(listAttackStatKeys(translationContext));
		const statInfo = selectAttackStatDescriptor(translationContext, statKey);
		const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
			type: 'stat',
			key: statKey,
			before: 4,
			after: 9,
		};

		const formatted = formatDiffCommon(translationContext, 'Update', diff);

		expect(formatted.startsWith('Update:')).toBe(true);
		expect(formatted).toContain(statInfo.label ?? statKey);
		expect(formatted).toContain('+5');
	});

	it('falls back to a humanized resource key when descriptor metadata is missing', () => {
		const resourceKey = SYNTH_RESOURCE_IDS.castleHP;
		const original = SYNTH_RESOURCE_METADATA[resourceKey];
		delete SYNTH_RESOURCE_METADATA[resourceKey];
		try {
			const fallbackAssets: TranslationAssets = {
				...translationAssets,
				resources: { ...translationAssets.resources },
			};
			const mutableResources = fallbackAssets.resources as unknown as {
				[key: string]: unknown;
			};
			delete mutableResources[resourceKey];
			const fallbackContext = createContext(fallbackAssets);
			const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
				type: 'resource',
				key: resourceKey,
				before: 1,
				after: 4,
			};
			const formatted = formatDiffCommon(fallbackContext, 'Change', diff);
			const expectedLabel = humanizeIdentifier(resourceKey) || resourceKey;
			expect(formatted).toContain(expectedLabel);
			expect(formatted).toContain('+3');
		} finally {
			if (original) {
				SYNTH_RESOURCE_METADATA[resourceKey] = original;
			}
		}
	});

	it('falls back to a humanized stat key when descriptor metadata is missing', () => {
		const statKey = SYNTH_STAT_IDS.armyStrength;
		suppressSyntheticStatDescriptor(statKey);
		try {
			const fallbackAssets: TranslationAssets = {
				...translationAssets,
				stats: { ...translationAssets.stats },
			};
			const mutableStats = fallbackAssets.stats as unknown as {
				[key: string]: unknown;
			};
			delete mutableStats[statKey];
			const fallbackContext = createContext(fallbackAssets);
			const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
				type: 'stat',
				key: statKey,
				before: 6,
				after: 7,
			};
			const formatted = formatDiffCommon(fallbackContext, 'Adjust', diff);
			const expectedLabel = humanizeIdentifier(statKey) || statKey;
			expect(formatted).toContain(expectedLabel);
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

		expect(() =>
			formatDiffCommon(translationContext, 'Oops', unsupportedDiff),
		).toThrow(/Unsupported attack diff type: unknown/);
	});
});
