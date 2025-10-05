import { describe, expect, it, vi } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	PASSIVE_INFO,
	type ResourceKey,
} from '@kingdom-builder/contents';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

describe('passive log labels', () => {
	it('uses tier summary tokens without exposing raw ids', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const happinessKey = ctx.services.tieredResource.resourceKey as ResourceKey;

		const setHappiness = (value: number) => {
			ctx.activePlayer.resources[happinessKey] = value;
			ctx.services.handleTieredResourceChange(ctx, happinessKey);
		};

		setHappiness(0);
		const beforeActivation = snapshotPlayer(ctx.activePlayer, ctx);

		setHappiness(6);
		const afterActivation = snapshotPlayer(ctx.activePlayer, ctx);

		const activationLines = diffStepSnapshots(
			beforeActivation,
			afterActivation,
			undefined,
			ctx,
		);
		const activationLog = activationLines.find((line) =>
			line.includes('activated'),
		);
		expect(activationLog).toBeTruthy();
		expect(activationLog).not.toContain('happiness.tier.summary');
		if (PASSIVE_INFO.icon) {
			expect(activationLog?.startsWith(`${PASSIVE_INFO.icon} `)).toBe(true);
		}
		expect(activationLog).toContain('Joyful activated');

		const beforeExpiration = snapshotPlayer(ctx.activePlayer, ctx);
		setHappiness(0);
		const afterExpiration = snapshotPlayer(ctx.activePlayer, ctx);

		const expirationLines = diffStepSnapshots(
			beforeExpiration,
			afterExpiration,
			undefined,
			ctx,
		);
		const expirationLog = expirationLines.find((line) =>
			line.includes('deactivated'),
		);
		expect(expirationLog).toBeTruthy();
		expect(expirationLog).not.toContain('happiness.tier.summary');
		if (PASSIVE_INFO.icon) {
			expect(expirationLog?.startsWith(`${PASSIVE_INFO.icon} `)).toBe(true);
		}
		expect(expirationLog).toContain('Joyful deactivated');
	});

	it('formats building passives and skips bonus activations', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		const before = snapshotPlayer(ctx.activePlayer, ctx);
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: 'castle_walls' },
				},
			],
			ctx,
		);
		const after = snapshotPlayer(ctx.activePlayer, ctx);

		const lines = diffStepSnapshots(before, after, undefined, ctx);
		expect(lines.some((line) => line.includes('Castle Walls activated'))).toBe(
			false,
		);
		expect(lines.some((line) => line.includes('castle_walls_bonus'))).toBe(
			false,
		);
	});
});
