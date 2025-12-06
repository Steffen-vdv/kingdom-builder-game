import { describe, it, expect } from 'vitest';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { performAction, advance } from '../src';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from './helpers';
import { resourceAmountParams } from './helpers/resourceV2Params.ts';

describe('result modifiers', () => {
	it('stack for the same action', () => {
		const resourceKey = Object.values(CResource)[0];
		const baseGain = 1;
		const modGainA = 2;
		const modGainB = 3;

		const content = createContentFactory();
		const base = resourceAmountParams({ key: resourceKey, amount: baseGain });
		const action = content.action({
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: base,
				},
			],
		});

		const passiveA = {
			id: 'pa',
			effects: [
				{
					type: 'result_mod',
					method: 'add',
					params: { id: 'ma', actionId: action.id },
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: resourceAmountParams({
								key: resourceKey,
								amount: modGainA,
							}),
						},
					],
				},
			],
		};

		const passiveB = {
			id: 'pb',
			effects: [
				{
					type: 'result_mod',
					method: 'add',
					params: { id: 'mb', actionId: action.id },
					effects: [
						{
							type: 'resource',
							method: 'add',
							params: resourceAmountParams({
								key: resourceKey,
								amount: modGainB,
							}),
						},
					],
				},
			],
		};

		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}

		engineContext.passives.addPassive(passiveA, engineContext);
		engineContext.passives.addPassive(passiveB, engineContext);

		// Give player AP to perform the action
		engineContext.activePlayer.resourceValues[CResource.ap] = 1;

		// CResource values ARE ResourceV2 IDs directly - no mapper needed
		const before = engineContext.activePlayer.resourceValues[resourceKey] ?? 0;
		performAction(action.id, engineContext);
		const after = engineContext.activePlayer.resourceValues[resourceKey] ?? 0;

		expect(after).toBe(before + baseGain + modGainA + modGainB);
	});
});
