import { describe, it, expect } from 'vitest';
import { performAction, advance, getActionCosts } from '../../src';
import { createTestEngine } from '../helpers';
import { createContentFactory } from '@kingdom-builder/testing';
import { Resource as CResource, PhaseId } from '@kingdom-builder/contents';

describe('population effects', () => {
	it('adds and removes population', () => {
		const content = createContentFactory();
		const role = content.population();
		const add = content.action({
			effects: [
				{ type: 'population', method: 'add', params: { role: role.id } },
				{ type: 'population', method: 'add', params: { role: role.id } },
			],
		});
		const remove = content.action({
			effects: [
				{ type: 'population', method: 'remove', params: { role: role.id } },
			],
		});
		const engineContext = createTestEngine(content);
		while (engineContext.game.currentPhase !== PhaseId.Main) {
			advance(engineContext);
		}
		let cost = getActionCosts(add.id, engineContext);
		engineContext.activePlayer.ap = cost[CResource.ap] ?? 0;
		performAction(add.id, engineContext);
		const added = add.effects.filter((e) => e.method === 'add').length;
		expect(engineContext.activePlayer.population[role.id]).toBe(added);
		cost = getActionCosts(remove.id, engineContext);
		engineContext.activePlayer.ap = cost[CResource.ap] ?? 0;
		performAction(remove.id, engineContext);
		const removed = remove.effects.filter((e) => e.method === 'remove').length;
		expect(engineContext.activePlayer.population[role.id]).toBe(
			added - removed,
		);
	});
});
