import { describe, it, expect } from 'vitest';
import { resolveAttack } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Resource } from '@kingdom-builder/contents';

describe('absorption cap', () => {
	it('caps absorption at 100%', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.game.opponent;
		defender.resourceValues[Resource.absorption] = 1.5;
		// PlayerState uses resourceValues for all resources
		const start = defender.resourceValues[Resource.castleHP];
		const result = resolveAttack(defender, 5, engineContext, {
			type: 'resource',
			resourceId: Resource.castleHP,
		});
		expect(result.damageDealt).toBe(0);
		expect(defender.resourceValues[Resource.castleHP]).toBe(start);
	});
});
