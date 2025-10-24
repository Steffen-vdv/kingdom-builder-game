import { describe, it, expect } from 'vitest';
import { resolveAttack, runEffects } from '../src/index.ts';
import { createTestEngine } from './helpers.ts';
import { Resource, Stat } from '../src/state/index.ts';
import { createContentFactory } from '@kingdom-builder/testing';
import { ResourceV2Id } from '@kingdom-builder/contents';

const ABSORPTION_ID = ResourceV2Id.Absorption;

function ensureAbsorptionRegistered(
	engineContext: ReturnType<typeof createTestEngine>,
): string {
	const registry = engineContext.resourceV2.getRegistry();
	if (!registry) {
		throw new Error('ResourceV2 registry is not initialized.');
	}
	registry.getResource(ABSORPTION_ID);
	return ABSORPTION_ID;
}

function setAbsorption(
	engineContext: ReturnType<typeof createTestEngine>,
	player: ReturnType<typeof createTestEngine>['activePlayer'],
	value: number,
): void {
	const id = ensureAbsorptionRegistered(engineContext);
	const current = player.resourceV2.amounts[id] ?? 0;
	const delta = value - current;
	if (delta === 0) {
		return;
	}
	const originalIndex = engineContext.game.currentPlayerIndex;
	const playerIndex = engineContext.game.players.indexOf(player);
	engineContext.game.currentPlayerIndex = playerIndex;
	engineContext.resourceV2.applyValueChange(engineContext, player, id, {
		delta,
		reconciliation: 'clamp',
	});
	engineContext.game.currentPlayerIndex = originalIndex;
}

function absorptionOptions<T extends Record<string, unknown>>(
	engineContext: ReturnType<typeof createTestEngine>,
	overrides: T = {} as T,
): T & { absorptionResourceId: string } {
	return {
		absorptionResourceId: ensureAbsorptionRegistered(engineContext),
		...overrides,
	};
}

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
		setAbsorption(engineContext, defender, 1);
		defender.fortificationStrength = 0;

		const castleBefore = defender.resources[Resource.castleHP];
		const result = resolveAttack(
			defender,
			3,
			engineContext,
			{
				type: 'building',
				id: bastion.id,
			},
			absorptionOptions(engineContext),
		);

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

		const result = resolveAttack(
			defender,
			5,
			engineContext,
			{
				type: 'building',
				id: fortress.id,
			},
			absorptionOptions(engineContext),
		);

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

		setAbsorption(engineContext, defender, 0.9);
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
			absorptionOptions(engineContext, {
				ignoreAbsorption: true,
				ignoreFortification: true,
			}),
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
