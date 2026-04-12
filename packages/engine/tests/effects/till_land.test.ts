import { describe, it, expect } from 'vitest';
import { performAction } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@boardsmith/testing';
import { LandMethods, Resource as CResource } from '@boardsmith/contents';

describe('land:till effect', () => {
	it('tills the specified land and marks it as tilled', () => {
		const content = createContentFactory();
		const tillAction = content.action({
			tiers: {
				'1': {
					effects: [
						{
							type: 'land',
							method: LandMethods.TILL,
							params: { landId: 'A-L2' },
						},
					],
				},
			},
		});
		const engineContext = createTestEngine({ actions: content.actions });
		// Mark action as available (not locked, not pool-locked)
		engineContext.activePlayer.actionStates[tillAction.id] = {
			locked: false,
			poolLocked: false,
			currentTier: 1,
			exhausted: false,
		};
		engineContext.activePlayer.resourceValues[CResource.cp] = 10;
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
			tiers: {
				'1': {
					effects: [
						{
							type: 'land',
							method: LandMethods.TILL,
							params: { landId: 'A-L2' },
						},
					],
				},
			},
		});
		const engineContext = createTestEngine({ actions: content.actions });
		engineContext.activePlayer.actionStates[tillAction.id] = {
			locked: false,
			poolLocked: false,
			currentTier: 1,
			exhausted: false,
		};
		engineContext.activePlayer.resourceValues[CResource.cp] = 10;
		performAction(tillAction.id, engineContext);
		expect(() => performAction(tillAction.id, engineContext)).toThrow(
			/already tilled/,
		);
	});

	it('tills the first available land when no id is given', () => {
		const content = createContentFactory();
		const tillAction = content.action({
			tiers: {
				'1': {
					effects: [{ type: 'land', method: LandMethods.TILL }],
				},
			},
		});
		const engineContext = createTestEngine({ actions: content.actions });
		engineContext.activePlayer.actionStates[tillAction.id] = {
			locked: false,
			poolLocked: false,
			currentTier: 1,
			exhausted: false,
		};
		engineContext.activePlayer.resourceValues[CResource.cp] = 10;
		performAction(tillAction.id, engineContext);
		const tilledCount = engineContext.activePlayer.lands.filter(
			(land) => land.tilled,
		).length;
		expect(tilledCount).toBe(1);
	});
});
