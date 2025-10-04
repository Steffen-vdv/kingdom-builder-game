import { describe, it, expect, vi } from 'vitest';
import { summarizeEffects } from '../src/translation/effects';
import { summarizeContent } from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	SLOT_INFO,
} from '@kingdom-builder/contents';
import { LandMethods } from '@kingdom-builder/contents/config/builders';

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

describe('land till formatter', () => {
	it('summarizes till effect', () => {
		const ctx = createCtx();
		const summary = summarizeEffects(
			[{ type: 'land', method: LandMethods.TILL }],
			ctx,
		);
		expect(summary).toContain(`${SLOT_INFO.icon}+1`);
	});

	it('summarizes till action', () => {
		const ctx = createCtx();
		const tillId = Array.from(
			(
				ACTIONS as unknown as {
					map: Map<string, { effects: { type: string; method?: string }[] }>;
				}
			).map.entries(),
		).find(([, a]) =>
			a.effects.some(
				(e: { type: string; method?: string }) =>
					e.type === 'land' && e.method === LandMethods.TILL,
			),
		)?.[0] as string;
		const summary = summarizeContent('action', tillId, ctx);
		const hasIcon = summary.some(
			(i) => typeof i === 'string' && i.includes(SLOT_INFO.icon),
		);
		expect(hasIcon).toBe(true);
	});
});
