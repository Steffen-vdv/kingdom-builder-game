import { describe, it, expect, vi } from 'vitest';
import { runEffects, type EffectDef, type AttackLog } from '../src/index.ts';
import { Resource } from '../src/state/index.ts';
import { createTestEngine } from './helpers.ts';
import { createContentFactory } from './factories/content.ts';
import { attackTargetHandlers } from '../src/effects/attack_target_handlers/index.ts';

describe('attack:perform', () => {
	it('does not run onDamage effects when damage is fully absorbed', () => {
		const ctx = createTestEngine();
		const attacker = ctx.activePlayer;
		const defender = ctx.opponent;

		attacker.armyStrength = 1;
		defender.absorption = 1;
		defender.fortificationStrength = 0;

		const before = {
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

		runEffects([effect], ctx);

		expect(attacker.resources[Resource.castleHP]).toBe(before.attacker.hp);
		expect(attacker.gold).toBe(before.attacker.gold);
		expect(attacker.happiness).toBe(before.attacker.happiness);
		expect(defender.resources[Resource.castleHP]).toBe(before.defender.hp);
		expect(defender.gold).toBe(before.defender.gold);
		expect(defender.happiness).toBe(before.defender.happiness);
	});

	it('does not run onDamage effects when a building survives the attack', () => {
		const content = createContentFactory();
		const workshop = content.building({});
		const ctx = createTestEngine({ buildings: content.buildings });
		const attacker = ctx.activePlayer;
		const defender = ctx.opponent;

		ctx.game.currentPlayerIndex = 1;
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: workshop.id },
				},
			],
			ctx,
		);
		ctx.game.currentPlayerIndex = 0;

		attacker.armyStrength = 2;
		defender.absorption = 1;

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

		runEffects([effect], ctx);

		expect(defender.buildings.has(workshop.id)).toBe(true);
		const log = ctx.pullEffectLog<AttackLog>('attack:perform');
		expect(log).toBeDefined();
		expect(log!.onDamage).toHaveLength(0);
		expect(log!.evaluation.target.type).toBe('building');
		if (log!.evaluation.target.type === 'building') {
			expect(log!.evaluation.target.destroyed).toBe(false);
			expect(log!.evaluation.target.damage).toBe(0);
		}
	});

	it('applies attacker and defender onDamage effects when damage lands', () => {
		const ctx = createTestEngine();
		const attacker = ctx.activePlayer;
		const defender = ctx.opponent;

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

		runEffects([effect], ctx);

		expect(attacker.happiness).toBe(2);
		expect(defender.happiness).toBe(2);

		const log = ctx.pullEffectLog<AttackLog>('attack:perform');
		expect(log).toBeDefined();
		const defenderEntries = log!.onDamage.filter(
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

	it('derives evaluation modifier keys for non-building targets via handler', () => {
		const ctx = createTestEngine();
		const attacker = ctx.activePlayer;
		attacker.armyStrength = 2;

		const target = { type: 'resource', key: Resource.castleHP } as const;
		const originalGetKey =
			attackTargetHandlers.resource.getEvaluationModifierKey.bind(
				attackTargetHandlers.resource,
			) as typeof attackTargetHandlers.resource.getEvaluationModifierKey;
		const derivedKey = 'resource-eval-key';
		const getKeySpy = vi.fn(() => derivedKey) as typeof originalGetKey;
		attackTargetHandlers.resource.getEvaluationModifierKey = getKeySpy;
		const evalSpy = vi.spyOn(ctx.passives, 'runEvaluationMods');

		try {
			runEffects(
				[
					{
						type: 'attack',
						method: 'perform',
						params: { target },
					},
				],
				ctx,
			);

			expect(getKeySpy).toHaveBeenCalledWith(target);
			expect(evalSpy).toHaveBeenCalled();
			const mods = evalSpy.mock.calls[0]![2];
			expect(mods[0]!.key).toBe(derivedKey);
		} finally {
			attackTargetHandlers.resource.getEvaluationModifierKey = originalGetKey;
			evalSpy.mockRestore();
		}
	});

	it('derives evaluation modifier keys for building targets via handler', () => {
		const content = createContentFactory();
		const workshop = content.building({});
		const ctx = createTestEngine({ buildings: content.buildings });
		const attacker = ctx.activePlayer;
		attacker.armyStrength = 3;

		const target = { type: 'building', id: workshop.id } as const;
		const originalGetKey =
			attackTargetHandlers.building.getEvaluationModifierKey.bind(
				attackTargetHandlers.building,
			) as typeof attackTargetHandlers.building.getEvaluationModifierKey;
		const derivedKey = 'building-eval-key';
		const getKeySpy = vi.fn(() => derivedKey) as typeof originalGetKey;
		attackTargetHandlers.building.getEvaluationModifierKey = getKeySpy;
		const evalSpy = vi.spyOn(ctx.passives, 'runEvaluationMods');

		try {
			runEffects(
				[
					{
						type: 'attack',
						method: 'perform',
						params: { target },
					},
				],
				ctx,
			);

			expect(getKeySpy).toHaveBeenCalledWith(target);
			expect(evalSpy).toHaveBeenCalled();
			const mods = evalSpy.mock.calls[0]![2];
			expect(mods[0]!.key).toBe(derivedKey);
		} finally {
			attackTargetHandlers.building.getEvaluationModifierKey = originalGetKey;
			evalSpy.mockRestore();
		}
	});
});
