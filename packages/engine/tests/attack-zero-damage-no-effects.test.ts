import { describe, it, expect } from 'vitest';
import { runEffects, type EffectDef, type AttackLog } from '../src/index.ts';
import {
	Resource as CResource,
	Stat as CStat,
} from '@kingdom-builder/contents';
import { createTestEngine } from './helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';

const attackLogKey = 'attack:perform';

describe('attack:perform', () => {
	it('skips onDamage effects when damage is fully absorbed', () => {
		const engineContext = createTestEngine();
		const attacker = engineContext.activePlayer;
		const defender = engineContext.opponent;

		attacker.resourceValues[CStat.armyStrength] = 1;
		defender.resourceValues[CStat.absorption] = 1;
		defender.resourceValues[CStat.fortificationStrength] = 0;

		const previousState = {
			attacker: {
				hp: attacker.resourceValues[CResource.castleHP] ?? 0,
				gold: attacker.resourceValues[CResource.gold] ?? 0,
				happiness: attacker.resourceValues[CResource.happiness] ?? 0,
			},
			defender: {
				hp: defender.resourceValues[CResource.castleHP] ?? 0,
				gold: defender.resourceValues[CResource.gold] ?? 0,
				happiness: defender.resourceValues[CResource.happiness] ?? 0,
			},
		};

		const effect: EffectDef = {
			type: 'attack',
			method: 'perform',
			params: {
				target: { type: 'resource', key: CResource.castleHP },
				onDamage: {
					attacker: [
						{
							type: 'resource',
							method: 'add',
							params: { key: CResource.gold, amount: 1 },
						},
						{
							type: 'resource',
							method: 'add',
							params: { key: CResource.happiness, amount: 1 },
						},
					],
					defender: [
						{
							type: 'resource',
							method: 'add',
							params: { key: CResource.gold, amount: 1 },
						},
						{
							type: 'resource',
							method: 'add',
							params: { key: CResource.happiness, amount: 1 },
						},
					],
				},
			},
		};

		runEffects([effect], engineContext);

		expect(attacker.resourceValues[CResource.castleHP]).toBe(
			previousState.attacker.hp,
		);
		expect(attacker.resourceValues[CResource.gold]).toBe(
			previousState.attacker.gold,
		);
		expect(attacker.resourceValues[CResource.happiness]).toBe(
			previousState.attacker.happiness,
		);
		expect(defender.resourceValues[CResource.castleHP]).toBe(
			previousState.defender.hp,
		);
		expect(defender.resourceValues[CResource.gold]).toBe(
			previousState.defender.gold,
		);
		expect(defender.resourceValues[CResource.happiness]).toBe(
			previousState.defender.happiness,
		);
	});

	it('skips onDamage effects when buildings survive attacks', () => {
		const content = createContentFactory();
		const workshop = content.building({});
		const engineContext = createTestEngine({ buildings: content.buildings });
		const attacker = engineContext.activePlayer;
		const defender = engineContext.opponent;

		engineContext.game.currentPlayerIndex = 1;
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: workshop.id },
				},
			],
			engineContext,
		);
		engineContext.game.currentPlayerIndex = 0;

		attacker.resourceValues[CStat.armyStrength] = 2;
		defender.resourceValues[CStat.absorption] = 1;

		const effect: EffectDef = {
			type: 'attack',
			method: 'perform',
			params: {
				target: { type: 'building', id: workshop.id },
				onDamage: {
					attacker: [
						{
							type: 'resource',
							method: 'add',
							params: { key: CResource.gold, amount: 1 },
						},
					],
				},
			},
		};

		runEffects([effect], engineContext);

		expect(defender.buildings.has(workshop.id)).toBe(true);
		const attackLog = engineContext.pullEffectLog<AttackLog>(attackLogKey);
		expect(attackLog).toBeDefined();
		expect(attackLog!.onDamage).toHaveLength(0);
		expect(attackLog!.evaluation.target.type).toBe('building');
		if (attackLog!.evaluation.target.type === 'building') {
			expect(attackLog!.evaluation.target.destroyed).toBe(false);
			expect(attackLog!.evaluation.target.damage).toBe(0);
		}
	});

	it('applies onDamage effects for both sides when damage lands', () => {
		const engineContext = createTestEngine();
		const attacker = engineContext.activePlayer;
		const defender = engineContext.opponent;

		attacker.resourceValues[CStat.armyStrength] = 3;
		attacker.resourceValues[CResource.happiness] = 1;
		defender.resourceValues[CResource.happiness] = 3;

		const effect: EffectDef = {
			type: 'attack',
			method: 'perform',
			params: {
				target: { type: 'resource', key: CResource.castleHP },
				onDamage: {
					attacker: [
						{
							type: 'resource',
							method: 'add',
							params: { key: CResource.happiness, amount: 1 },
						},
					],
					defender: [
						{
							type: 'resource',
							method: 'add',
							params: { key: CResource.happiness, amount: -1 },
						},
					],
				},
			},
		};

		runEffects([effect], engineContext);

		expect(attacker.resourceValues[CResource.happiness]).toBe(2);
		expect(defender.resourceValues[CResource.happiness]).toBe(2);

		const attackLog = engineContext.pullEffectLog<AttackLog>(attackLogKey);
		expect(attackLog).toBeDefined();
		const defenderEntries = attackLog!.onDamage.filter(
			(entry) => entry.owner === 'defender',
		);
		expect(defenderEntries).toHaveLength(1);
		const defenderDiffs = defenderEntries[0]!.defender.filter(
			(diff) => diff.type === 'resource' && diff.key === CResource.happiness,
		);
		expect(defenderDiffs).toHaveLength(1);
		expect(defenderDiffs[0]!.before).toBe(3);
		expect(defenderDiffs[0]!.after).toBe(2);
	});
});
