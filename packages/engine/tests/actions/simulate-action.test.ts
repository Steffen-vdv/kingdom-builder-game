import { describe, it, expect } from 'vitest';
import { simulateAction, performAction } from '../../src/index.ts';
import { createTestEngine } from '../helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { LandMethods, Resource as CResource } from '@kingdom-builder/contents';

describe('simulateAction', () => {
	it('does not mutate state when previewing an action', () => {
		const content = createContentFactory();
		const till = content.action({
			locked: true,
			effects: [{ type: 'land', method: LandMethods.TILL }],
		});
		const engineContext = createTestEngine({ actions: content.actions });
		engineContext.activePlayer.actions.add(till.id);
		engineContext.activePlayer.resourceValues[CResource.ap] = 10;

		expect(engineContext.activePlayer.lands.some((land) => land.tilled)).toBe(
			false,
		);

		simulateAction(till.id, engineContext);

		expect(engineContext.activePlayer.lands.some((land) => land.tilled)).toBe(
			false,
		);

		performAction(till.id, engineContext);

		expect(engineContext.activePlayer.lands.some((land) => land.tilled)).toBe(
			true,
		);
	});

	it('throws when the simulated action would fail', () => {
		const content = createContentFactory();
		const tripleTill = content.action({
			locked: true,
			effects: Array.from({ length: 3 }, () => ({
				type: 'land',
				method: LandMethods.TILL,
			})),
		});
		const engineContext = createTestEngine({ actions: content.actions });
		engineContext.activePlayer.actions.add(tripleTill.id);
		engineContext.activePlayer.resourceValues[CResource.ap] = 10;

		expect(() => simulateAction(tripleTill.id, engineContext)).toThrow(
			/No tillable land available/,
		);
	});
});
