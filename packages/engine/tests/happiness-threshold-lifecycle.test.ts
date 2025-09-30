import { describe, it, expect } from 'vitest';
import { runEffects, performAction, resolveAttack } from '../src';
import { setupHappinessThresholdTest } from './happiness-thresholds.setup';

describe('Happiness threshold lifecycle', () => {
	it('responds to happiness changes from costs and attacks', () => {
		const {
			ctx,
			action,
			tierKey,
			lowTierId,
			highTierId,
			lowPassiveId,
			highPassiveId,
		} = setupHappinessThresholdTest();
		const player = ctx.activePlayer;
		const opponent = ctx.opponent;

		const addTierResource = (amount: number) =>
			runEffects(
				[
					{
						type: 'resource',
						method: 'add',
						params: { key: tierKey, amount },
					},
				],
				ctx,
			);

		addTierResource(10);

		expect(player.happinessTierId).toBe(highTierId);
		expect(ctx.passives.list(player.id)).toContain(highPassiveId);

		performAction(action.id, ctx);

		expect(player.happinessTierId).toBe(lowTierId);
		expect(ctx.passives.list(player.id)).toContain(lowPassiveId);
		expect(ctx.passives.list(player.id)).not.toContain(highPassiveId);

		const originalIndex = ctx.game.currentPlayerIndex;
		ctx.game.currentPlayerIndex = 1;
		addTierResource(3);
		ctx.game.currentPlayerIndex = originalIndex;

		expect(opponent.happinessTierId).toBe(highTierId);
		expect(ctx.passives.list(opponent.id)).toContain(highPassiveId);

		resolveAttack(opponent, 3, ctx, { type: 'resource', key: tierKey });

		expect(opponent.happinessTierId).toBe(lowTierId);
		expect(ctx.passives.list(opponent.id)).toContain(lowPassiveId);
		expect(ctx.passives.list(opponent.id)).not.toContain(highPassiveId);
	});
});
