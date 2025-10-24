import { describe, it, expect } from 'vitest';
import { resolveAttack, runEffects, type EffectDef } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Resource, Stat } from '../src/state/index.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { resourceV2Add, ResourceV2Id } from '@kingdom-builder/contents';

function makeAbsorptionEffect(amount: number): EffectDef {
	return resourceV2Add(ResourceV2Id.Absorption).amount(amount).build();
}

function makeFortificationEffect(amount: number): EffectDef {
	return {
		type: 'stat',
		method: 'add',
		params: { key: Stat.fortificationStrength, amount },
	};
}

describe('resolveAttack', () => {
	it('runs onBeforeAttacked triggers before damage calc', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.activePlayer;
		engineContext.passives.addPassive(
			{
				id: 'shield',
				effects: [],
				onBeforeAttacked: [makeAbsorptionEffect(0.5)],
			},
			engineContext,
		);
		const result = resolveAttack(defender, 10, engineContext, {
			type: 'resource',
			key: Resource.castleHP,
		});
		expect(result.damageDealt).toBe(5);
	});

	it('applies fortification before running post-attack resolution', () => {
		const engineContext = createTestEngine();
		const attacker = engineContext.activePlayer;
		const defender = engineContext.game.opponent;
		defender.stats[Stat.fortificationStrength] = 1;
		defender.gold = 100;
		attacker.gold = 0;
		const startHP = defender.resources[Resource.castleHP];
		const startGold = defender.gold;
		const result = resolveAttack(defender, 5, engineContext, {
			type: 'resource',
			key: Resource.castleHP,
		});
		expect(result.damageDealt).toBe(4);
		expect(defender.resources[Resource.castleHP]).toBe(
			startHP - result.damageDealt,
		);
		expect(defender.fortificationStrength).toBe(0);
		expect(defender.gold).toBe(startGold);
		expect(attacker.gold).toBe(0);
		expect(defender.happiness).toBe(0);
		expect(attacker.happiness).toBe(0);
		expect(attacker.warWeariness).toBe(0);
	});

	it('rounds absorbed damage up when rules specify', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.game.opponent;
		engineContext.services.rules.absorptionRounding = 'up';
		defender.absorption = 0.5;
		const start = defender.resources[Resource.castleHP];
		const result = resolveAttack(defender, 1, engineContext, {
			type: 'resource',
			key: Resource.castleHP,
		});
		expect(result.damageDealt).toBe(1);
		expect(defender.resources[Resource.castleHP]).toBe(start - 1);
	});

	it('rounds absorbed damage to nearest when rules specify', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.game.opponent;
		engineContext.services.rules.absorptionRounding = 'nearest';
		defender.absorption = 0.6;
		const result = resolveAttack(defender, 1, engineContext, {
			type: 'resource',
			key: Resource.castleHP,
		});
		expect(result.damageDealt).toBe(0);
	});

	it('can ignore absorption and fortification when options specify', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.game.opponent;
		defender.absorption = 0.5;
		defender.stats[Stat.fortificationStrength] = 5;
		const result = resolveAttack(
			defender,
			10,
			engineContext,
			{ type: 'resource', key: Resource.castleHP },
			{
				ignoreAbsorption: true,
				ignoreFortification: true,
			},
		);
		expect(result.damageDealt).toBe(10);
		expect(defender.fortificationStrength).toBe(5);
		expect(defender.resources[Resource.castleHP]).toBe(0);
	});

	it('removes towers and grants rewards after damage is resolved', () => {
		const content = createContentFactory();
		const tower = content.development({
			onBeforeAttacked: [
				{
					type: 'stat',
					method: 'add',
					params: { key: Stat.fortificationStrength, amount: 4 },
				},
			],
			onAttackResolved: [
				{
					type: 'resource',
					method: 'add',
					params: { key: Resource.gold, amount: 1 },
				},
			],
		});
		const engineContext = createTestEngine({
			developments: content.developments,
		});
		const defender = engineContext.game.opponent;
		const landId = defender.lands[1].id;
		engineContext.game.currentPlayerIndex = 1;
		// switch to defender to build tower
		runEffects(
			[
				{
					type: 'development',
					method: 'add',
					params: { id: tower.id, landId },
				},
			],
			engineContext,
		);
		engineContext.game.currentPlayerIndex = 0;
		const beforeGold = defender.gold;
		const result = resolveAttack(defender, 4, engineContext, {
			type: 'resource',
			key: Resource.castleHP,
		});
		expect(result.damageDealt).toBe(0);
		expect(defender.resources[Resource.castleHP]).toBe(10);
		expect(defender.fortificationStrength).toBe(0);
		expect(defender.absorption).toBe(0);
		expect(defender.gold).toBe(beforeGold + 1);
	});

	it('ignores post-attack boosts for the damage calculation', () => {
		const engineContext = createTestEngine();
		const attacker = engineContext.activePlayer;
		const defender = engineContext.game.opponent;
		engineContext.game.currentPlayerIndex = 1;
		// switch to defender to add passive
		engineContext.passives.addPassive(
			{
				id: 'bastion',
				effects: [],
				onBeforeAttacked: [
					makeAbsorptionEffect(0.5),
					makeFortificationEffect(1),
				],
				onAttackResolved: [
					makeAbsorptionEffect(0.5),
					makeFortificationEffect(5),
				],
			},
			engineContext,
		);
		engineContext.game.currentPlayerIndex = 0;

		runEffects(
			[
				{
					type: 'stat',
					method: 'add',
					params: { key: Stat.armyStrength, amount: 5 },
				},
			],
			engineContext,
		);
		const startHP = defender.resources[Resource.castleHP];
		const result = resolveAttack(
			defender,
			attacker.armyStrength as number,
			engineContext,
			{
				type: 'resource',
				key: Resource.castleHP,
			},
		);
		const rounding = engineContext.services.rules.absorptionRounding;
		const base = attacker.armyStrength as number;
		const reduced =
			rounding === 'down'
				? Math.floor(base * (1 - 0.5))
				: rounding === 'up'
					? Math.ceil(base * (1 - 0.5))
					: Math.round(base * (1 - 0.5));
		const expected = Math.max(0, reduced - 1);
		expect(result.damageDealt).toBe(expected);
		expect(defender.resources[Resource.castleHP]).toBe(startHP - expected);
		expect(defender.absorption).toBe(1);
		expect(defender.fortificationStrength).toBe(5);
	});

	it('records a victory when the defender castle falls', () => {
		const engineContext = createTestEngine();
		const defender = engineContext.game.opponent;
		const startHp = defender.resources[Resource.castleHP];
		expect(engineContext.game.conclusion).toBeUndefined();
		resolveAttack(defender, startHp, engineContext, {
			type: 'resource',
			key: Resource.castleHP,
		});
		expect(engineContext.game.conclusion?.conditionId).toBe('castle-destroyed');
		expect(engineContext.game.conclusion?.winnerId).toBe(
			engineContext.game.active.id,
		);
		expect(engineContext.game.conclusion?.loserId).toBe(defender.id);
		expect(engineContext.game.conclusion?.triggeredBy).toBe(defender.id);
	});
});
