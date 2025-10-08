import { describe, expect, it, vi } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation/log';
import { logContent } from '../src/translation/content';
import { LOG_KEYWORDS } from '../src/translation/log/logMessages';
import {
	ACTIONS,
	BUILDINGS,
	BuildingId,
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
			ctx.services.handleTieredResourceChange(
				ctx,
				ctx.activePlayer,
				happinessKey,
			);
		};

		setHappiness(0);
		const beforeActivation = snapshotPlayer(ctx.activePlayer, ctx);

		setHappiness(6);
		const afterActivation = snapshotPlayer(ctx.activePlayer, ctx);

		const diffContext = createTranslationDiffContext(ctx);
		const activationLines = diffStepSnapshots(
			beforeActivation,
			afterActivation,
			undefined,
			diffContext,
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
			diffContext,
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
					params: { id: BuildingId.CastleWalls },
				},
			],
			ctx,
		);
		const after = snapshotPlayer(ctx.activePlayer, ctx);

		const diffContext = createTranslationDiffContext(ctx);
		const lines = diffStepSnapshots(before, after, undefined, diffContext);
		expect(lines.some((line) => line.includes('Castle Walls activated'))).toBe(
			false,
		);
		expect(lines.some((line) => line.includes('castle_walls_bonus'))).toBe(
			false,
		);
	});

	it('omits development passives and keeps stat changes grouped', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});

		runEffects(
			[
				{
					type: 'land',
					method: 'add',
				},
			],
			ctx,
		);

		const targetLand = ctx.activePlayer.lands.at(-1);
		expect(targetLand).toBeTruthy();
		if (!targetLand) {
			return;
		}

		const before = snapshotPlayer(ctx.activePlayer, ctx);
		runEffects(
			[
				{
					type: 'development',
					method: 'add',
					params: {
						id: 'watchtower',
						landId: targetLand.id,
					},
				},
			],
			ctx,
		);
		const after = snapshotPlayer(ctx.activePlayer, ctx);

		const diffContext = createTranslationDiffContext(ctx);
		const lines = diffStepSnapshots(before, after, undefined, diffContext);
		expect(lines.some((line) => line.includes('activated'))).toBe(false);

		const label =
			logContent('development', 'watchtower', ctx)[0] ?? 'Watchtower';
		const expectedHeadline = `${LOG_KEYWORDS.developed} ${label}`;
		expect(lines).toContain(expectedHeadline);
		expect(
			lines.some(
				(line) =>
					line.includes('Fortification Strength') && line.includes('+2'),
			),
		).toBe(true);
		expect(
			lines.some(
				(line) => line.includes('Absorption') && line.includes('+50%'),
			),
		).toBe(true);
	});
});
