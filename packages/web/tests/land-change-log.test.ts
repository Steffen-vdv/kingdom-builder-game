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
import {
	snapshotPlayer,
	diffStepSnapshots,
	createTranslationDiffContext,
} from '../src/translation/log';
import {
	formatIconLabel,
	formatLogHeadline,
	LOG_KEYWORDS,
} from '../src/translation/log/logMessages';

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
		const engineContext = createTestContext();
		const before = snapshotPlayer(engineContext.activePlayer, engineContext);
		runEffects(
			[
				{
					type: 'land',
					method: 'add',
				},
			],
			engineContext,
		);
		const after = snapshotPlayer(engineContext.activePlayer, engineContext);
		const translationDiffContext = createTranslationDiffContext(engineContext);
		const lines = diffStepSnapshots(
			before,
			after,
			undefined,
			translationDiffContext,
		);
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
		const engineContext = createTestContext();
		runEffects(
			[
				{
					type: 'land',
					method: 'add',
				},
			],
			engineContext,
		);
		const targetLand =
			engineContext.activePlayer.lands.at(-1) ??
			engineContext.activePlayer.lands[0];
		expect(targetLand).toBeTruthy();
		if (!targetLand) {
			return;
		}
		const developmentEntries = engineContext.developments.entries();
		const developmentEntry = developmentEntries.find(([, definition]) => {
			return Boolean(definition?.icon) && Boolean(definition?.name);
		});
		const fallbackDevelopment = developmentEntries[0];
		const [developmentId] = developmentEntry ?? fallbackDevelopment ?? [];
		expect(developmentId).toBeTruthy();
		if (!developmentId) {
			return;
		}
		const before = snapshotPlayer(engineContext.activePlayer, engineContext);
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
			engineContext,
		);
		const after = snapshotPlayer(engineContext.activePlayer, engineContext);
		const translationDiffContext = createTranslationDiffContext(engineContext);
		const lines = diffStepSnapshots(
			before,
			after,
			undefined,
			translationDiffContext,
		);
		const developmentLine = lines.find((line) => {
			return line.startsWith(LOG_KEYWORDS.developed);
		});
		expect(developmentLine).toBeTruthy();
		if (!developmentLine) {
			return;
		}
		const developmentContent = logContent(
			'development',
			developmentId,
			engineContext,
		);
		const developmentLabel = developmentContent[0] ?? developmentId;
		const expectedLine = formatLogHeadline(
			LOG_KEYWORDS.developed,
			developmentLabel,
		);
		expect(developmentLine).toBe(expectedLine);
	});
});
