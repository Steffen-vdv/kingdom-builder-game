import { describe, expect, it, vi } from 'vitest';
import { summarizeEffects, describeEffects } from '../src/translation/effects';
import { createEngine } from '@kingdom-builder/engine';
import type { EffectDef } from '@kingdom-builder/engine';
import {
        ACTIONS,
        BUILDINGS,
        DEVELOPMENTS,
        POPULATIONS,
        PHASES,
        GAME_START,
        RULES,
        STATS,
} from '@kingdom-builder/contents';
import type { TranslationAssets, TranslationContext } from '../src/translation/context';
import {
        createTranslationContextStub,
        toTranslationPlayer,
        wrapTranslationRegistry,
} from './helpers/translationContextStub';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function buildAssets(): TranslationAssets {
        const stats = Object.fromEntries(
                Object.entries(STATS).map(([key, info]) => [
                        key,
                        {
                                icon: info.icon,
                                label: info.label ?? info.name ?? key,
                        },
                ]),
        );
        return {
                resources: {},
                stats,
                populations: {},
                population: { icon: '👥', label: 'Population' },
                land: {},
                slot: {},
                passive: {},
                triggers: {},
                modifiers: {},
                formatPassiveRemoval: (description) => `Active as long as ${description}`,
        } satisfies TranslationAssets;
}

function createTranslationContext(): TranslationContext {
        const engineContext = createEngine({
                actions: ACTIONS,
                buildings: BUILDINGS,
                developments: DEVELOPMENTS,
                populations: POPULATIONS,
                phases: PHASES,
                start: GAME_START,
                rules: RULES,
        });
        const wrap = <T>(registry: { get(id: string): T; has(id: string): boolean }) =>
                wrapTranslationRegistry({
                        get(id: string) {
                                return registry.get(id);
                        },
                        has(id: string) {
                                return registry.has(id);
                        },
                });
        const phases = engineContext.phases.map((phase) => ({
                id: phase.id,
                icon: phase.icon,
                label: phase.label,
                steps: phase.steps?.map((step) => ({
                        id: step.id,
                        triggers: step.triggers ? [...step.triggers] : undefined,
                })),
        }));
        const player = toTranslationPlayer({
                id: engineContext.activePlayer.id,
                name: engineContext.activePlayer.name,
                resources: engineContext.activePlayer.resources,
                population: engineContext.activePlayer.population,
                stats: engineContext.activePlayer.stats,
        });
        return createTranslationContextStub({
                phases,
                actionCostResource: engineContext.actionCostResource ?? '',
                actions: wrap(engineContext.actions),
                buildings: wrap(engineContext.buildings),
                developments: wrap(engineContext.developments),
                populations: wrap(engineContext.populations),
                activePlayer: player,
                opponent: player,
                rules: engineContext.rules,
                assets: buildAssets(),
        });
}

describe('modifier percent formatting', () => {
	it('describes rounded percent bonuses and penalties', () => {
                const bonusCtx = createTranslationContext();
		const bonus: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'synthetic:income',
				evaluation: { type: 'development' },
				percent: 0.2,
			},
			round: 'up',
		};
		const bonusSummary = summarizeEffects([bonus], bonusCtx);
		expect(bonusSummary).toEqual([expect.stringContaining('Income')]);
		expect(bonusSummary[0]).toContain('gain 20% more');
		expect(bonusSummary[0]).toContain('rounded up');
		const bonusDescription = describeEffects([bonus], bonusCtx);
		expect(bonusDescription[0]).toContain('Income');
		expect(bonusDescription[0]).toContain(
			'20% more of that resource (rounded up)',
		);

                const penaltyCtx = createTranslationContext();
		const penalty: EffectDef = {
			type: 'result_mod',
			method: 'add',
			params: {
				id: 'synthetic:income:penalty',
				evaluation: { type: 'development' },
				percent: -0.25,
			},
			round: 'down',
		};
		const penaltySummary = summarizeEffects([penalty], penaltyCtx);
		expect(penaltySummary[0]).toContain('gain 25% less');
		expect(penaltySummary[0]).toContain('rounded down');
		const penaltyDescription = describeEffects([penalty], penaltyCtx);
		expect(penaltyDescription[0]).toContain(
			'25% less of that resource (rounded down)',
		);
	});
});
