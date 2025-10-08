import { describe, expect, it, vi } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	LAND_INFO,
} from '@kingdom-builder/contents';
import { logContent } from '../src/translation/content';
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';
import {
	formatIconLabel,
	formatLogHeadline,
	LOG_KEYWORDS,
} from '../src/translation/log/logMessages';
import { createDiffContextFromEngine } from './helpers/createDiffContext';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createTestContext() {
	return createEngine({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});
}

describe('land change log formatting', () => {
	it('logs gained land entries with icon and label', () => {
		const ctx = createTestContext();
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		runEffects(
			[
				{
					type: 'land',
					method: 'add',
				},
			],
			ctx,
		);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		const diffContext = createDiffContextFromEngine(ctx);
		const lines = diffStepSnapshots(before, after, undefined, diffContext);
		const landLine = lines.find((line) => {
			return line.startsWith(LOG_KEYWORDS.gained);
		});
		expect(landLine).toBeTruthy();
		if (!landLine) {
			return;
		}
		const landLabel =
			formatIconLabel(LAND_INFO.icon, LAND_INFO.label) ||
			LAND_INFO.label ||
			'Land';
		const expectedLine = formatLogHeadline(LOG_KEYWORDS.gained, landLabel);
		expect(landLine).toBe(expectedLine);
	});

	it('logs developed entries for new land improvements', () => {
		const ctx = createTestContext();
		runEffects(
			[
				{
					type: 'land',
					method: 'add',
				},
			],
			ctx,
		);
		const targetLand =
			ctx.activePlayer.lands.at(-1) ?? ctx.activePlayer.lands[0];
		expect(targetLand).toBeTruthy();
		if (!targetLand) {
			return;
		}
		const developmentEntries = ctx.developments.entries();
		const developmentEntry = developmentEntries.find(([, def]) => {
			return Boolean(def?.icon) && Boolean(def?.name);
		});
		const fallbackDevelopment = developmentEntries[0];
		const [developmentId] = developmentEntry ?? fallbackDevelopment ?? [];
		expect(developmentId).toBeTruthy();
		if (!developmentId) {
			return;
		}
		const before = snapshotPlayer(ctx.activePlayer, ctx);
		runEffects(
			[
				{
					type: 'development',
					method: 'add',
					params: {
						id: developmentId,
						landId: targetLand.id,
					},
				},
			],
			ctx,
		);
		const after = snapshotPlayer(ctx.activePlayer, ctx);
		const diffContext = createDiffContextFromEngine(ctx);
		const lines = diffStepSnapshots(before, after, undefined, diffContext);
		const developmentLine = lines.find((line) => {
			return line.startsWith(LOG_KEYWORDS.developed);
		});
		expect(developmentLine).toBeTruthy();
		if (!developmentLine) {
			return;
		}
		const developmentContent = logContent('development', developmentId, ctx);
		const developmentLabel = developmentContent[0] ?? developmentId;
		const expectedLine = formatLogHeadline(
			LOG_KEYWORDS.developed,
			developmentLabel,
		);
		expect(developmentLine).toBe(expectedLine);
	});
});
