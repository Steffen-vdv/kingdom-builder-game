import { describe, it, expect } from 'vitest';
import { performAction } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '../factories/content.ts';
import { LandMethods } from '@kingdom-builder/contents/config/builderShared';

describe('land:till effect', () => {
	it('tills the specified land and marks it as tilled', () => {
		const content = createContentFactory();
		const till = content.action({
			system: true,
			effects: [
				{ type: 'land', method: LandMethods.TILL, params: { landId: 'A-L2' } },
			],
		});
		const ctx = createTestEngine({ actions: content.actions });
		ctx.activePlayer.actions.add(till.id);
		const land = ctx.activePlayer.lands[1];
		const before = land.slotsMax;
		const expected = Math.min(before + 1, ctx.services.rules.maxSlotsPerLand);
		performAction(till.id, ctx);
		expect(land.slotsMax).toBe(expected);
		expect(land.tilled).toBe(true);
	});

	it('throws if the land is already tilled', () => {
		const content = createContentFactory();
		const till = content.action({
			system: true,
			effects: [
				{ type: 'land', method: LandMethods.TILL, params: { landId: 'A-L2' } },
			],
		});
		const ctx = createTestEngine({ actions: content.actions });
		ctx.activePlayer.actions.add(till.id);
		performAction(till.id, ctx);
		expect(() => performAction(till.id, ctx)).toThrow(/already tilled/);
	});

	it('tills the first available land when no id is given', () => {
		const content = createContentFactory();
		const till = content.action({
			system: true,
			effects: [{ type: 'land', method: LandMethods.TILL }],
		});
		const ctx = createTestEngine({ actions: content.actions });
		ctx.activePlayer.actions.add(till.id);
		performAction(till.id, ctx);
		const tilledCount = ctx.activePlayer.lands.filter((l) => l.tilled).length;
		expect(tilledCount).toBe(1);
	});
});
