import { describe, it, expect } from 'vitest';
import { runEffects, type EffectDef, type AttackLog } from '../src/index.ts';
import { Resource } from '../src/state/index.ts';
import {
	createTestEngine,
	getAbsorptionResourceId,
	setPlayerResourceV2Amount,
} from './helpers.ts';
import { createContentFactory } from '@kingdom-builder/testing';

const attackLogKey = 'attack:perform';

const ABSORPTION_RESOURCE_ID = getAbsorptionResourceId();

describe('attack:perform', () => {
	it('skips onDamage effects when damage is fully absorbed', () => {
		const engineContext = createTestEngine();
		const attacker = engineContext.activePlayer;
		const defender = engineContext.opponent;

		attacker.armyStrength = 1;
		setPlayerResourceV2Amount(
			engineContext,
			defender,
			ABSORPTION_RESOURCE_ID,
			1,
		);
		defender.fortificationStrength = 0;

		const previousState = {
			attacker: {
				hp: attacker.resources[Resource.castleHP],
				gold: attacker.gold,
				happiness: attacker.happiness,
			},
			defender: {
				hp: defender.resources[Resource.castleHP],
				gold: defender.gold,
				happiness: defender.happiness,
			},
		};

		const effect: EffectDef = {
			type: 'attack',
			method: 'perform',
			params: {
				target: { type: 'resource', key: Resource.castleHP },
				onDamage: {
					attacker: [
						{
							type: 'resource',
							method: 'add',
							params: { key: Resource.gold, amount: 1 },
						},
						{
							type: 'resource',
							method: 'add',
							params: { key: Resource.happiness, amount: 1 },
						},
					],
					defender: [
						{
							type: 'resource',
							method: 'add',
							params: { key: Resource.gold, amount: 1 },
						},
						{
							type: 'resource',
							method: 'add',
							params: { key: Resource.happiness, amount: 1 },
						},
					],
				},
			},
		};

		runEffects([effect], engineContext);

		expect(attacker.resources[Resource.castleHP]).toBe(
			previousState.attacker.hp,
		);
		expect(attacker.gold).toBe(previousState.attacker.gold);
		expect(attacker.happiness).toBe(previousState.attacker.happiness);
		expect(defender.resources[Resource.castleHP]).toBe(
			previousState.defender.hp,
		);
		expect(defender.gold).toBe(previousState.defender.gold);
		expect(defender.happiness).toBe(previousState.defender.happiness);
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

		attacker.armyStrength = 2;
		setPlayerResourceV2Amount(
			engineContext,
			defender,
			ABSORPTION_RESOURCE_ID,
			1,
		);

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
							params: { key: Resource.gold, amount: 1 },
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

		attacker.armyStrength = 3;
		attacker.happiness = 1;
		defender.happiness = 3;

		const effect: EffectDef = {
			type: 'attack',
			method: 'perform',
			params: {
				target: { type: 'resource', key: Resource.castleHP },
				onDamage: {
					attacker: [
						{
							type: 'resource',
							method: 'add',
							params: { key: Resource.happiness, amount: 1 },
						},
					],
					defender: [
						{
							type: 'resource',
							method: 'add',
							params: { key: Resource.happiness, amount: -1 },
						},
					],
				},
			},
		};

		runEffects([effect], engineContext);

		expect(attacker.happiness).toBe(2);
		expect(defender.happiness).toBe(2);

		const attackLog = engineContext.pullEffectLog<AttackLog>(attackLogKey);
		expect(attackLog).toBeDefined();
		const defenderEntries = attackLog!.onDamage.filter(
			(entry) => entry.owner === 'defender',
		);
		expect(defenderEntries).toHaveLength(1);
		const defenderDiffs = defenderEntries[0]!.defender.filter(
			(diff) => diff.type === 'resource' && diff.key === Resource.happiness,
		);
		expect(defenderDiffs).toHaveLength(1);
		expect(defenderDiffs[0]!.before).toBe(3);
		expect(defenderDiffs[0]!.after).toBe(2);
	});
});
