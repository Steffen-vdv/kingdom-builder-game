import { describe, it, expect } from 'vitest';
import { runEffects } from '../../src/effects/index.ts';
import { createTestEngine } from '../helpers.ts';

describe('land:add effect', () => {
	it('appends new lands to the end', () => {
		const ctx = createTestEngine();
		const beforeIds = ctx.activePlayer.lands.map((land) => land.id);
		const beforeCount = beforeIds.length;

		runEffects(
			[
				{
					type: 'land',
					method: 'add',
					params: { count: 2 },
				},
			],
			ctx,
		);

		const lands = ctx.activePlayer.lands;
		expect(lands.length).toBe(beforeCount + 2);
		expect(lands.slice(0, beforeCount).map((land) => land.id)).toEqual(
			beforeIds,
		);
		expect(lands[beforeCount]?.id).toBe(
			`${ctx.activePlayer.id}-L${beforeCount + 1}`,
		);
		expect(lands[beforeCount + 1]?.id).toBe(
			`${ctx.activePlayer.id}-L${beforeCount + 2}`,
		);
	});
});
