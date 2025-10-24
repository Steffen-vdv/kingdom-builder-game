import { describe, it, expect } from 'vitest';
import { resolveAttack, runEffects } from '../src/index.ts';
import {
	createTestEngine,
	getAbsorptionResourceId,
	setPlayerResourceV2Amount,
} from './helpers.ts';
import { Resource, Stat } from '../src/state/index.ts';
import { createContentFactory } from '@kingdom-builder/testing';

const ABSORPTION_RESOURCE_ID = getAbsorptionResourceId();

describe('resolveAttack buildings', () => {
	it('keeps buildings intact when damage is fully mitigated', () => {
		const content = createContentFactory();
		const bastion = content.building({});
		const engineContext = createTestEngine({
			buildings: content.buildings,
		});
		const defender = engineContext.game.opponent;
		engineContext.game.currentPlayerIndex = 1;
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: bastion.id },
				},
			],
			engineContext,
		);
		engineContext.game.currentPlayerIndex = 0;
		setPlayerResourceV2Amount(
			engineContext,
			defender,
			ABSORPTION_RESOURCE_ID,
			1,
		);
		defender.fortificationStrength = 0;

		const castleBefore = defender.resources[Resource.castleHP];
		const result = resolveAttack(defender, 3, engineContext, {
			type: 'building',
			id: bastion.id,
		});

		expect(result.damageDealt).toBe(0);
		expect(defender.buildings.has(bastion.id)).toBe(true);
		expect(defender.resources[Resource.castleHP]).toBe(castleBefore);
		expect(result.evaluation.target.type).toBe('building');
		if (result.evaluation.target.type === 'building') {
			expect(result.evaluation.target.existed).toBe(true);
			expect(result.evaluation.target.destroyed).toBe(false);
			expect(result.evaluation.target.damage).toBe(0);
		}
	});

	it('destroys buildings without spilling damage onto the castle', () => {
		const content = createContentFactory();
		const fortress = content.building({
			onBuild: [
				{
					type: 'stat',
					method: 'add',
					params: { key: Stat.fortificationStrength, amount: 3 },
				},
			],
		});
		const engineContext = createTestEngine({
			buildings: content.buildings,
		});
		const defender = engineContext.game.opponent;
		engineContext.game.currentPlayerIndex = 1;
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: fortress.id },
				},
			],
			engineContext,
		);
		engineContext.game.currentPlayerIndex = 0;

		const castleBefore = defender.resources[Resource.castleHP];
		expect(defender.fortificationStrength).toBe(3);

		const result = resolveAttack(defender, 5, engineContext, {
			type: 'building',
			id: fortress.id,
		});

		expect(result.damageDealt).toBe(2);
		expect(defender.buildings.has(fortress.id)).toBe(false);
		expect(defender.resources[Resource.castleHP]).toBe(castleBefore);
		expect(defender.fortificationStrength).toBe(0);
		expect(result.evaluation.target.type).toBe('building');
		if (result.evaluation.target.type === 'building') {
			expect(result.evaluation.target.destroyed).toBe(true);
			expect(result.evaluation.target.damage).toBe(result.damageDealt);
		}
	});

	it('respects ignore flags when targeting buildings', () => {
		const content = createContentFactory();
		const stronghold = content.building({});
		const engineContext = createTestEngine({
			buildings: content.buildings,
		});
		const defender = engineContext.game.opponent;
		engineContext.game.currentPlayerIndex = 1;
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: stronghold.id },
				},
			],
			engineContext,
		);
		engineContext.game.currentPlayerIndex = 0;

		setPlayerResourceV2Amount(
			engineContext,
			defender,
			ABSORPTION_RESOURCE_ID,
			0.9,
		);
		defender.fortificationStrength = 10;
		const castleBefore = defender.resources[Resource.castleHP];

		const result = resolveAttack(
			defender,
			4,
			engineContext,
			{
				type: 'building',
				id: stronghold.id,
			},
			{ ignoreAbsorption: true, ignoreFortification: true },
		);

		expect(result.damageDealt).toBe(4);
		expect(result.evaluation.absorption.ignored).toBe(true);
		expect(result.evaluation.fortification.ignored).toBe(true);
		expect(defender.fortificationStrength).toBe(10);
		expect(defender.resources[Resource.castleHP]).toBe(castleBefore);
		expect(defender.buildings.has(stronghold.id)).toBe(false);
		expect(result.evaluation.target.type).toBe('building');
		if (result.evaluation.target.type === 'building') {
			expect(result.evaluation.target.destroyed).toBe(true);
		}
	});
});
