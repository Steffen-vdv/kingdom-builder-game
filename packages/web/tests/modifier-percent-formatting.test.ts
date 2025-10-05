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
} from '@kingdom-builder/contents';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createCtx() {
	return createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});
}

describe('modifier percent formatting', () => {
	it('describes rounded percent bonuses and penalties', () => {
		const bonusCtx = createCtx();
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

		const penaltyCtx = createCtx();
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
