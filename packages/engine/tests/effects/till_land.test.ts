import { describe, it, expect } from 'vitest';
import { performAction } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { LandMethods } from '@kingdom-builder/contents/config/builderShared';

describe('land:till effect', () => {
	it('tills the specified land and marks it as tilled', () => {
		const content = createContentFactory();
		const tillAction = content.action({
			system: true,
			effects: [
				{ type: 'land', method: LandMethods.TILL, params: { landId: 'A-L2' } },
			],
		});
		const engineContext = createTestEngine({ actions: content.actions });
		engineContext.activePlayer.actions.add(tillAction.id);
		const land = engineContext.activePlayer.lands[1];
		const before = land.slotsMax;
		const expected = Math.min(
			before + 1,
			engineContext.services.rules.maxSlotsPerLand,
		);
		performAction(tillAction.id, engineContext);
		expect(land.slotsMax).toBe(expected);
		expect(land.tilled).toBe(true);
	});

	it('throws if the land is already tilled', () => {
		const content = createContentFactory();
		const tillAction = content.action({
			system: true,
			effects: [
				{ type: 'land', method: LandMethods.TILL, params: { landId: 'A-L2' } },
			],
		});
		const engineContext = createTestEngine({ actions: content.actions });
		engineContext.activePlayer.actions.add(tillAction.id);
		performAction(tillAction.id, engineContext);
		expect(() => performAction(tillAction.id, engineContext)).toThrow(
			/already tilled/,
		);
	});

	it('tills the first available land when no id is given', () => {
		const content = createContentFactory();
		const tillAction = content.action({
			system: true,
			effects: [{ type: 'land', method: LandMethods.TILL }],
		});
		const engineContext = createTestEngine({ actions: content.actions });
		engineContext.activePlayer.actions.add(tillAction.id);
		performAction(tillAction.id, engineContext);
		const tilledCount = engineContext.activePlayer.lands.filter(
			(land) => land.tilled,
		).length;
		expect(tilledCount).toBe(1);
	});
});
