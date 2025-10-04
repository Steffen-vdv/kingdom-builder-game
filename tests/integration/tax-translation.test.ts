import { describe, it, expect } from 'vitest';
import { createEngine } from '@kingdom-builder/engine';
import { summarizeContent } from '@kingdom-builder/web/translation/content';
import {
	PHASES,
	POPULATIONS,
	GAME_START,
	RULES,
	Resource,
} from '@kingdom-builder/contents';
import { createContentFactory } from '../../packages/engine/tests/factories/content';

describe('Action translation with population scaling', () => {
	it('mentions population scaling', () => {
		const content = createContentFactory();
		const action = content.action({
			effects: [
				{
					evaluator: { type: 'population' },
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: { key: Resource.gold, amount: 1 },
						},
					],
				},
			],
		});
		const ctx = createEngine({
			actions: content.actions,
			buildings: content.buildings,
			developments: content.developments,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		const summary = summarizeContent('action', action.id, ctx) as (
			| string
			| { title: string; items: unknown[] }
		)[];
		const lines = summary.filter((i): i is string => typeof i === 'string');
		expect(lines.some((i) => i.includes('per 👥'))).toBe(true);
	});
});
