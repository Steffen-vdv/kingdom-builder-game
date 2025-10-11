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
} from '@kingdom-builder/contents';
import { LandMethods } from '@kingdom-builder/contents/config/builderShared';
import { createTranslationAssets } from '../src/translation/context/assets';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createEngineContext() {
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

const readSlotIcon = (
	engineContext: ReturnType<typeof createEngineContext>,
): string | undefined =>
	createTranslationAssets({
		populations: engineContext.populations,
		// No resource metadata is required for slot assets in these tests.
		resources: {} as Record<string, never>,
	}).slot.icon;

describe('land till formatter', () => {
	it('summarizes till effect', () => {
		const engineContext = createEngineContext();
		const slotIcon = readSlotIcon(engineContext);
		const summary = summarizeEffects(
			[{ type: 'land', method: LandMethods.TILL }],
			engineContext,
		);
		expect(summary).toContain(`${slotIcon}+1`);
	});

	it('summarizes till action', () => {
		const engineContext = createEngineContext();
		const slotIcon = readSlotIcon(engineContext);
		const tillId = Array.from(
			(
				ACTIONS as unknown as {
					map: Map<string, { effects: { type: string; method?: string }[] }>;
				}
			).map.entries(),
		).find(([, actionEntry]) =>
			actionEntry.effects.some(
				(e: { type: string; method?: string }) =>
					e.type === 'land' && e.method === LandMethods.TILL,
			),
		)?.[0] as string;
		const summary = summarizeContent('action', tillId, engineContext);
		const hasIcon = summary.some(
			(item) => typeof item === 'string' && item.includes(slotIcon),
		);
		expect(hasIcon).toBe(true);
	});
});
