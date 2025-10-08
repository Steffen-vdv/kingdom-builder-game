import { describe, it, expect, vi } from 'vitest';
import { collectResourceSources } from '../../src/translation/log/resourceSources';
import { type StepEffects } from '../../src/translation/log/statBreakdown';
import { type TranslationDiffContext } from '../../src/translation/log/resourceSources/context';
import { type PassiveModifierMap } from '../../src/translation/log/resourceSources/types';

describe('translation diff resource source context', () => {
	it('uses evaluator counts and passive modifiers from the diff context', () => {
		const ownerId = 'player:active';
		const resourceKey = 'resource:synthetic';
		const evaluationMods = new Map<string, Map<string, unknown>>([
			[
				'development:synthetic',
				new Map([[`syntheticBuilding_${ownerId}`, {}]]),
			],
		]) as PassiveModifierMap;
		const evaluateMock = vi.fn(() => 2);
		const resourceEffect = {
			type: 'resource' as const,
			method: 'add' as const,
			params: { key: resourceKey },
		};
		const context: TranslationDiffContext = {
			activePlayer: {
				id: ownerId,
			} as TranslationDiffContext['activePlayer'],
			buildings: {
				get(id: string) {
					if (id === 'syntheticBuilding') {
						return { icon: '🏛️' } as { icon?: string };
					}
					return undefined;
				},
			} as TranslationDiffContext['buildings'],
			developments: {
				get(id: string) {
					if (id === 'synthetic') {
						return { icon: '🌾' } as { icon?: string };
					}
					return undefined;
				},
			} as TranslationDiffContext['developments'],
			passives: {
				evaluationMods,
				get: vi.fn(() => ({ icon: '✨' })),
			},
			evaluate: evaluateMock,
		};
		const step: StepEffects = {
			effects: [
				{
					type: 'result_mod',
					method: 'add',
					evaluator: {
						type: 'development',
						params: { id: 'synthetic' },
					},
					effects: [resourceEffect],
				},
			],
		};
		const sources = collectResourceSources(step, context);
		expect(evaluateMock).toHaveBeenCalledWith({
			type: 'development',
			params: { id: 'synthetic' },
		});
		expect(sources[resourceKey]).toBe('🌾🌾+🏛️');
	});
});
