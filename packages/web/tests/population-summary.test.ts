import { describe, it, expect, vi } from 'vitest';
import {
	summarizeContent,
	summarizeEffects,
	describeEffects,
	type Summary,
} from '../src/translation';
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
	const engineContext = createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});

	it('summarizes population-raising action for specific role', () => {
		const raiseEntry = Array.from(
			(
				ACTIONS as unknown as {
					map: Map<
						string,
						{
							effects: {
								type: string;
								method?: string;
								params?: { role?: string };
							}[];
						}
					>;
				}
			).map.entries(),
		).find(([, a]) =>
			a.effects.some(
				(e: { type: string; method?: string }) =>
					e.type === 'population' && e.method === 'add',
			),
		);
		const raiseId = raiseEntry?.[0] as string;
		const roleEffect = raiseEntry?.[1].effects.find(
			(e: { type: string; method?: string }) =>
				e.type === 'population' && e.method === 'add',
		);
		const roleId = (roleEffect?.params as { role?: string } | undefined)?.role;
		if (!raiseId || !roleId) {
			throw new Error('Unable to locate population-raising action.');
		}
		const summary = summarizeContent('action', raiseId, engineContext, {
			role: roleId,
		});
		const flat = flatten(summary);
		const expected = summarizeEffects(
			[
				{
					type: 'population',
					method: 'add',
					params: { role: roleId },
				},
			],
			engineContext,
		)[0];
		expect(flat).toContain(expected);
	});

	it('handles population removal effect', () => {
		const removalRole = Array.from(
			(
				ACTIONS as unknown as {
					map: Map<
						string,
						{
							effects: {
								type: string;
								method?: string;
								params?: { role?: string };
							}[];
						}
					>;
				}
			).map.values(),
		)
			.flatMap((action) => action.effects)
			.find((effect) => effect.type === 'population' && effect.params?.role)
			?.params?.role as string | undefined;
		if (!removalRole) {
			throw new Error('No population role found for removal test.');
		}
		const removalEffect = {
			type: 'population' as const,
			method: 'remove' as const,
			params: { role: removalRole },
		};
		const summary = summarizeEffects([removalEffect], engineContext);
		const desc = describeEffects([removalEffect], engineContext);
		const expectedSummary = summarizeEffects([removalEffect], engineContext)[0];
		const expectedDesc = describeEffects([removalEffect], engineContext)[0];
		expect(summary).toContain(expectedSummary);
		expect(desc).toContain(expectedDesc);
	});
});
