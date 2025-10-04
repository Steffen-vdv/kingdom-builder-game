import { describe, it, expect, vi } from 'vitest';
import {
	summarizeContent,
	summarizeEffects,
	describeEffects,
	type Summary,
} from '../src/translation';
import { createEngine, PopulationRole } from '@kingdom-builder/engine';
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

describe('population effect translation', () => {
	const ctx = createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});

	it('summarizes population-raising action for specific role', () => {
		const raiseId = Array.from(
			(
				ACTIONS as unknown as {
					map: Map<string, { effects: { type: string; method?: string }[] }>;
				}
			).map.entries(),
		).find(([, a]) =>
			a.effects.some(
				(e: { type: string; method?: string }) =>
					e.type === 'population' && e.method === 'add',
			),
		)?.[0] as string;
		const summary = summarizeContent('action', raiseId, ctx, {
			role: PopulationRole.Council,
		});
		const flat = flatten(summary);
		const expected = summarizeEffects(
			[
				{
					type: 'population',
					method: 'add',
					params: { role: PopulationRole.Council },
				},
			],
			ctx,
		)[0];
		expect(flat).toContain(expected);
	});

	it('handles population removal effect', () => {
		const summary = summarizeEffects(
			[
				{
					type: 'population',
					method: 'remove',
					params: { role: PopulationRole.Council },
				},
			],
			ctx,
		);
		const desc = describeEffects(
			[
				{
					type: 'population',
					method: 'remove',
					params: { role: PopulationRole.Council },
				},
			],
			ctx,
		);
		const expectedSummary = summarizeEffects(
			[
				{
					type: 'population',
					method: 'remove',
					params: { role: PopulationRole.Council },
				},
			],
			ctx,
		)[0];
		const expectedDesc = describeEffects(
			[
				{
					type: 'population',
					method: 'remove',
					params: { role: PopulationRole.Council },
				},
			],
			ctx,
		)[0];
		expect(summary).toContain(expectedSummary);
		expect(desc).toContain(expectedDesc);
	});
});
