import { describe, it, expect, vi } from 'vitest';
import { summarizeContent } from '../src/translation/content';
import type { Summary } from '../src/translation/content';
import {
	logEffects,
	describeEffects,
	summarizeEffects,
} from '../src/translation/effects';
import { createEngine } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	Resource,
} from '@kingdom-builder/contents';
import type { DevelopmentDef } from '@kingdom-builder/contents';
import { createTranslationContextForEngine } from './helpers/createTranslationContextForEngine';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function flatten(summary: Summary): string[] {
	const result: string[] = [];
	for (const entry of summary) {
		if (typeof entry === 'string') {
			result.push(entry);
		} else {
			result.push(...flatten(entry.items));
		}
	}
	return result;
}

describe('development translation', () => {
	it('includes phase effects for a development', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const translationContext = createTranslationContextForEngine(ctx);
		const devEntry = Array.from(
			(
				DEVELOPMENTS as unknown as { map: Map<string, DevelopmentDef> }
			).map.values(),
		).find((d) => d.onGainIncomeStep);
		const devId = (devEntry as { id: string }).id;
		const summary = summarizeContent('development', devId, translationContext);
		const flat = flatten(summary);
		const goldIcon =
			translationContext.assets.resources[Resource.gold]?.icon ?? '';
		const dev = translationContext.developments.get(devId);
		const amount =
			(
				dev.onGainIncomeStep?.[0]?.effects?.[0]?.params as {
					amount?: number;
				}
			)?.amount ?? 0;
		const expectedGoldGain = `${goldIcon}+${amount}`;
		expect(flat.some((line) => line.includes(expectedGoldGain))).toBe(true);
	});

	it('uses shared helper for add and remove effects', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const translationContext = createTranslationContextForEngine(ctx);
		const devId = DEVELOPMENTS.keys()[0] as string;
		const development = translationContext.developments.get(devId);
		const display =
			[development?.icon ?? '', development?.name ?? devId]
				.filter(Boolean)
				.join(' ')
				.trim() || devId;
		const addSummary = summarizeEffects(
			[{ type: 'development', method: 'add', params: { id: devId } }],
			translationContext,
		);
		expect(flatten(addSummary)).toContain(display);
		const addDescription = describeEffects(
			[{ type: 'development', method: 'add', params: { id: devId } }],
			translationContext,
		);
		expect(flatten(addDescription)).toContain(`Add ${display}`);
		const removeSummary = summarizeEffects(
			[{ type: 'development', method: 'remove', params: { id: devId } }],
			translationContext,
		);
		expect(flatten(removeSummary)).toContain(display);
		const removeDescription = describeEffects(
			[{ type: 'development', method: 'remove', params: { id: devId } }],
			translationContext,
		);
		expect(flatten(removeDescription)).toContain(`Remove ${display}`);
		const removeLog = logEffects(
			[{ type: 'development', method: 'remove', params: { id: devId } }],
			translationContext,
		);
		expect(removeLog).toContain(`Removed ${display}`);
	});
});
