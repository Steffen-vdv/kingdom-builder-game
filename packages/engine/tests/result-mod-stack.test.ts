import { describe, it, expect } from 'vitest';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';
import { performAction, advance } from '../src';
import { createContentFactory } from '@kingdom-builder/testing';
import { createTestEngine } from './helpers';

describe('result modifiers', () => {
	it('stack for the same action', () => {
		const resourceKey = Object.values(CResource)[0];
		const baseGain = 1;
		const modGainA = 2;
		const modGainB = 3;

		const content = createContentFactory();
		const action = content.action({
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: { key: resourceKey, amount: baseGain },
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
							params: { key: resourceKey, amount: modGainA },
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
							params: { key: resourceKey, amount: modGainB },
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

		const before = engineContext.activePlayer.resources[resourceKey] ?? 0;
		performAction(action.id, engineContext);
		const after = engineContext.activePlayer.resources[resourceKey] ?? 0;

		expect(after).toBe(before + baseGain + modGainA + modGainB);
	});
});
