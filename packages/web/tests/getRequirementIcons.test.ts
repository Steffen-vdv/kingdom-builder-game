import { describe, expect, it } from 'vitest';
import {
        getRequirementIcons,
        registerRequirementIconGetter,
} from '../src/utils/getRequirementIcons';
import type { TranslationAssets, TranslationRegistry } from '../src/translation/context';
import {
        createTranslationContextStub,
        toTranslationPlayer,
        wrapTranslationRegistry,
} from './helpers/translationContextStub';

function createRegistry<TDefinition>(definition: TDefinition): TranslationRegistry<TDefinition> {
        return wrapTranslationRegistry<TDefinition>({
                get() {
                        return definition;
                },
                has() {
                        return true;
                },
        });
}

function createTranslationContext(
        requirements: unknown[],
        assets: TranslationAssets,
) {
        const actions = new Map<string, unknown>([
                [
                        'test-action',
                        {
                                requirements,
                        },
                ],
        ]);
        const registry = wrapTranslationRegistry({
                get(id: string) {
                        return actions.get(id) as unknown;
                },
                has(id: string) {
                        return actions.has(id);
                },
        });
        const emptyRegistry = createRegistry({});
        const player = toTranslationPlayer({
                id: 'A',
                name: 'Player A',
                resources: {},
                population: {},
        });
        return createTranslationContextStub({
                phases: [],
                actionCostResource: '',
                actions: registry,
                buildings: emptyRegistry,
                developments: emptyRegistry,
                populations: emptyRegistry,
                activePlayer: player,
                opponent: player,
                assets,
        });
}

describe('getRequirementIcons', () => {
        it('includes icons derived from evaluator compare requirements', () => {
                const assets: TranslationAssets = {
                        resources: {},
                        stats: {
                                attack: { icon: '⚔️' },
                        },
                        populations: {
                                legion: { icon: '🎖️' },
                        },
                        population: { icon: '👥' },
                        land: {},
                        slot: {},
                        passive: {},
                        triggers: {},
                        modifiers: {},
                        formatPassiveRemoval: (description) => description,
                };
                const translationContext = createTranslationContext(
                        [
                                {
                                        type: 'evaluator',
                                        method: 'compare',
                                        params: {
                                                left: {
                                                        type: 'stat',
                                                        params: { key: 'attack' },
                                                },
                                                right: {
                                                        type: 'population',
                                                        params: { role: 'legion' },
                                                },
                                        },
                                },
                        ],
                        assets,
                );

                const icons = getRequirementIcons('test-action', translationContext);
                expect(icons).toContain('⚔️');
                expect(icons).toContain('🎖️');
        });

        it('falls back to generic population icons when metadata is missing', () => {
                const assets: TranslationAssets = {
                        resources: {},
                        stats: {},
                        populations: {
                                citizen: {},
                        },
                        population: { icon: '👥' },
                        land: {},
                        slot: {},
                        passive: {},
                        triggers: {},
                        modifiers: {},
                        formatPassiveRemoval: (description) => description,
                };
                const translationContext = createTranslationContext(
                        [
                                {
                                        type: 'evaluator',
                                        method: 'compare',
                                        params: {
                                                right: {
                                                        type: 'population',
                                                        params: { role: 'citizen' },
                                                },
                                        },
                                },
                        ],
                        assets,
                );

                const icons = getRequirementIcons('test-action', translationContext);
                expect(icons).toEqual(['👥']);
        });

        it('allows registering custom requirement icon handlers', () => {
                const assets: TranslationAssets = {
                        resources: {},
                        stats: {},
                        populations: {},
                        population: {},
                        land: {},
                        slot: {},
                        passive: {},
                        triggers: {},
                        modifiers: {},
                        formatPassiveRemoval: (description) => description,
                };
                const translationContext = createTranslationContext(
                        [
                                {
                                        type: 'mock',
                                        method: 'handler',
                                        params: {},
                                },
                        ],
                        assets,
                );

                const unregister = registerRequirementIconGetter('mock', 'handler', () => [
                        '🧪',
                ]);

                const icons = getRequirementIcons('test-action', translationContext);
                expect(icons).toContain('🧪');

                unregister();
        });
});
