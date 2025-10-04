import { describe, it, expect, vi } from 'vitest';
import { summarizeContent } from '../src/translation/content';
import type { Summary } from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	RESOURCES,
	Resource,
} from '@kingdom-builder/contents';
import type { DevelopmentDef } from '@kingdom-builder/contents';

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
		const devEntry = Array.from(
			(
				DEVELOPMENTS as unknown as { map: Map<string, DevelopmentDef> }
			).map.values(),
		).find((d) => d.onGainIncomeStep);
		const devId = (devEntry as { id: string }).id;
		const summary = summarizeContent('development', devId, ctx);
		const flat = flatten(summary);
		const goldIcon = RESOURCES[Resource.gold].icon;
		const dev = DEVELOPMENTS.get(devId);
		const amt =
			(
				dev.onGainIncomeStep?.[0]?.effects?.[0]?.params as {
					amount?: number;
				}
			)?.amount ?? 0;
		expect(flat.some((l) => l.includes(`${goldIcon}+${amt}`))).toBe(true);
	});
});
