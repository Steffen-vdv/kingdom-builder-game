import type { AttackPlayerDiff } from '@kingdom-builder/engine';
import { describe, expect, it } from 'vitest';

import { formatDiffCommon } from '../src/translation/effects/formatters/attack/shared';
import {
createTranslationContextStub,
toTranslationPlayer,
wrapTranslationRegistry,
} from './helpers/translationContextStub';

const RESOURCE_KEY = 'synthetic:resource';
const STAT_KEY = 'synthetic:stat';

const STUB_ASSETS = {
resources: {
[RESOURCE_KEY]: { icon: '💠', label: 'Synthetic Resource' },
},
stats: {
[STAT_KEY]: { icon: '📊', label: 'Synthetic Stat' },
},
populations: {},
population: {},
land: {},
slot: {},
passive: {},
modifiers: {},
formatPassiveRemoval: (description: string) => `Active as long as ${description}`,
} as const;

const STUB_PLAYER = toTranslationPlayer({
id: 'player',
name: 'Player',
resources: {},
population: {},
});

const STUB_REGISTRY = wrapTranslationRegistry({
get(id: string) {
return { id };
},
has() {
return true;
},
});

const CONTEXT = createTranslationContextStub({
phases: [],
actionCostResource: undefined,
actions: STUB_REGISTRY,
buildings: STUB_REGISTRY,
developments: STUB_REGISTRY,
activePlayer: STUB_PLAYER,
opponent: STUB_PLAYER,
assets: STUB_ASSETS,
});

describe('attack diff formatters registry', () => {
        it('formats resource diffs using the registered formatter', () => {
                const diff: Extract<AttackPlayerDiff, { type: 'resource' }> = {
                        type: 'resource',
                        key: RESOURCE_KEY,
                        before: 2,
                        after: 5,
                };

                const formatted = formatDiffCommon('Change', diff, CONTEXT);

                expect(formatted.startsWith('Change:')).toBe(true);
                expect(formatted).toContain(STUB_ASSETS.resources[RESOURCE_KEY]!.label!);
                expect(formatted).toContain('+3');
        });

        it('formats stat diffs using the registered formatter', () => {
                const diff: Extract<AttackPlayerDiff, { type: 'stat' }> = {
                        type: 'stat',
                        key: STAT_KEY,
                        before: 4,
                        after: 9,
                };

                const formatted = formatDiffCommon('Update', diff, CONTEXT);

                expect(formatted.startsWith('Update:')).toBe(true);
                expect(formatted).toContain(STUB_ASSETS.stats[STAT_KEY]!.label!);
                expect(formatted).toContain('+5');
        });

        it('throws a clear error when a diff type has no registered formatter', () => {
                const unsupportedDiff = {
			type: 'unknown',
			key: 'mystery',
			before: 0,
			after: 1,
		} as unknown as AttackPlayerDiff;

                expect(() => formatDiffCommon('Oops', unsupportedDiff, CONTEXT)).toThrow(
                        /Unsupported attack diff type: unknown/,
                );
        });
});
