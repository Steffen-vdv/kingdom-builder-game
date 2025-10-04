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

function collectText(summary: Summary | undefined): string[] {
	if (!summary) {
		return [];
	}
	const lines: string[] = [];
	const visit = (entries: Summary) => {
		for (const entry of entries) {
			if (typeof entry === 'string') {
				lines.push(entry);
				continue;
			}
			if (Array.isArray(entry.items)) {
				visit(entry.items as Summary);
			}
		}
	};
	visit(summary);
	return lines;
}

describe('raiders guild translation', () => {
	it('describes plunder action', () => {
		const ctx = createCtx();
		const summary = describeContent('building', 'raiders_guild', ctx);
		const { effects, description } = splitSummary(summary);
		expect(effects).toHaveLength(1);
		const build = effects[0] as { title: string; items?: unknown[] };
		const modifierLine = build.items?.[0];
		expect(typeof modifierLine).toBe('string');
		expect(modifierLine).toMatch(
			/^✨ Result Modifier on .*: Whenever it transfers resources, 🔁 (Increase|Decrease) transfer by 25%$/,
		);
		if (description) {
			const actionCard = (description as Summary)[0] as
				| string
				| { title: string; items?: unknown[]; _hoist?: true; _desc?: true };
			if (actionCard && typeof actionCard !== 'string') {
				expect(actionCard).toMatchObject({ _hoist: true, _desc: true });
				const cardItems = (actionCard.items ?? []) as string[];
				for (const item of cardItems) {
					expect(typeof item === 'string' ? item : '').not.toMatch(
						/Result Modifier/,
					);
				}
			}
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

	it('describes market modifier with detailed clause', () => {
		const ctx = createCtx();
		const summary = describeContent('building', 'market', ctx);
		const lines = collectText(summary);
		expect(lines).toContain(
			'✨ Result Modifier on 👥 Population through 💰 Tax: Whenever it grants resources, gain 🧺+1 more of that resource',
		);
	});

	it('describes mill modifier with detailed clause', () => {
		const ctx = createCtx();
		const summary = describeContent('building', 'mill', ctx);
		const lines = collectText(summary);
		expect(lines).toContain(
			'✨ Result Modifier on 🌾 Farm: Whenever it grants resources, gain 🧺+1 more of that resource',
		);
	});
});
