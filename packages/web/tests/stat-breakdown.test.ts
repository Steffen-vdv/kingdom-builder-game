import { describe, it, expect, vi } from 'vitest';
import { createEngine, runEffects, advance } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	PopulationRole,
	Stat,
} from '@kingdom-builder/contents';
import { getStatBreakdownSummary } from '../src/utils/stats';

const isSummaryObject = (
	entry: unknown,
): entry is { title: string; items: unknown[] } =>
	typeof entry === 'object' &&
	entry !== null &&
	'title' in entry &&
	'items' in entry &&
	Array.isArray((entry as { items?: unknown }).items);

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('stat breakdown summary', () => {
	it('includes ongoing and permanent army strength sources', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		runEffects(
			[
				{
					type: 'population',
					method: 'add',
					params: { role: PopulationRole.Legion },
				},
			],
			ctx,
		);

		const raiseStrengthPhase = ctx.phases.find((phase) =>
			phase.steps.some((step) => step.id === 'raise-strength'),
		);
		expect(raiseStrengthPhase).toBeDefined();
		let result;
		do {
			result = advance(ctx);
		} while (
			result.phase !== raiseStrengthPhase!.id ||
			result.step !== 'raise-strength'
		);

		const breakdown = getStatBreakdownSummary(
			Stat.armyStrength,
			ctx.activePlayer,
			ctx,
		);
		expect(breakdown.length).toBeGreaterThanOrEqual(2);
		const objectEntries = breakdown.filter(isSummaryObject);
		const ongoing = objectEntries.find((entry) =>
			entry.title.includes('Legion'),
		);
		expect(ongoing).toBeTruthy();
		expect(ongoing?.items).toEqual(
			expect.arrayContaining([
				expect.stringContaining('⚔️ +1'),
				expect.objectContaining({
					title: expect.stringContaining('Ongoing'),
					items: expect.arrayContaining([
						expect.stringContaining('While 🎖️ Legion'),
						expect.stringContaining('Active as long as'),
					]),
				}),
			]),
		);
		const permanent = objectEntries.find((entry) =>
			entry.title.includes('Raise Strength'),
		);
		expect(permanent).toBeTruthy();
		expect(permanent?.items).toEqual(
			expect.arrayContaining([
				expect.stringContaining('⚔️ +1'),
				expect.objectContaining({
					title: expect.stringContaining('Permanent'),
					items: expect.arrayContaining([
						expect.stringContaining('Triggered by 🎖️ Legion'),
						expect.stringContaining('Triggered by 📈 Growth'),
					]),
				}),
			]),
		);
	});
});
