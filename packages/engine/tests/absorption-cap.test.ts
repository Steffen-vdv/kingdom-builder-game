import { describe, it, expect } from 'vitest';
import { resolveAttack } from '../src/index.ts';
import {
	createTestEngine,
	getAbsorptionResourceId,
	setPlayerResourceV2Amount,
} from './helpers.ts';
import { Resource } from '../src/state/index.ts';

describe('absorption cap', () => {
	it('caps absorption at 100%', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.game.opponent;
		const absorptionResourceId = getAbsorptionResourceId();
		setPlayerResourceV2Amount(
			engineContext,
			defender,
			absorptionResourceId,
			1.5,
		);
		const start = defender.resources[Resource.castleHP];
		const result = resolveAttack(defender, 5, engineContext, {
			type: 'resource',
			key: Resource.castleHP,
		});
		expect(result.damageDealt).toBe(0);
		expect(defender.resources[Resource.castleHP]).toBe(start);
	});
});
