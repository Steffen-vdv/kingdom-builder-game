import { describe, it, expect, vi } from 'vitest';
import {
	describeContent,
	splitSummary,
	summarizeContent,
	type Summary,
} from '../src/translation/content';
import { createEngine } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	MODIFIER_INFO,
	POPULATION_INFO,
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

describe('raiders guild translation', () => {
	it('describes plunder action', () => {
		const ctx = createCtx();
		const summary = describeContent('building', 'raiders_guild', ctx);
		const { effects, description } = splitSummary(summary);
		expect(effects).toHaveLength(1);
		const build = effects[0] as { title: string; items?: unknown[] };
		expect(build.items?.[0]).toBe(
			'✨ Result Modifier on 🏴‍☠️ Plunder: Whenever it transfers resources, 🔁 Increase transfer by 25%',
		);
		expect(description).toBeDefined();
		const actionCard = (description as Summary)[0] as {
			title: string;
			items?: unknown[];
		};
		expect(actionCard.title).toBe('🏴‍☠️ Plunder');
		const cardItems = (actionCard.items ?? []) as string[];
		for (const item of cardItems) {
			expect(typeof item === 'string' ? item : '').not.toMatch(
				/Result Modifier/,
			);
		}
		expect(JSON.stringify({ effects, description })).not.toMatch(
			/Immediately|🎯/,
		);
	});

	it('summarizes market modifier compactly', () => {
		const ctx = createCtx();
		const summary = summarizeContent('building', 'market', ctx);
		const market = ctx.buildings.get('market');
		expect(market).toBeDefined();
		const tax = ctx.actions.get('tax');
		const expected = `${MODIFIER_INFO.result.icon}${POPULATION_INFO.icon}(${tax.icon}): 🧺+1`;
		const lines = summary.flatMap((entry) =>
			typeof entry === 'string'
				? [entry]
				: Array.isArray(entry.items)
					? (entry.items as string[])
					: [],
		);
		expect(lines).toContain(expected);
	});

	it('summarizes mill modifier compactly', () => {
		const ctx = createCtx();
		const summary = summarizeContent('building', 'mill', ctx);
		const farm = ctx.developments.get('farm');
		expect(farm).toBeDefined();
		const expected = `${MODIFIER_INFO.result.icon}${farm.icon}: 🧺+1`;
		const lines = summary.flatMap((entry) =>
			typeof entry === 'string'
				? [entry]
				: Array.isArray(entry.items)
					? (entry.items as string[])
					: [],
		);
		expect(lines).toContain(expected);
	});
});
