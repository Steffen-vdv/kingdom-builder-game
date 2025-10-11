import { describe, expect, it, vi } from 'vitest';
import { createEngine, runEffects } from '@kingdom-builder/engine';
import { PHASES, GAME_START, RULES } from '@kingdom-builder/contents';
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
import { createSessionRegistries } from './helpers/sessionRegistries';
import { createTranslationAssets } from '../src/translation/context/assets';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

function createTestContext() {
	const registries = createSessionRegistries();
	const engineContext = createEngine({
		actions: registries.actions,
		buildings: registries.buildings,
		developments: registries.developments,
		populations: registries.populations,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
	});
	engineContext.assets = createTranslationAssets({
		populations: registries.populations,
		resources: registries.resources,
	});
	return engineContext;
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
		const landInfo = engineContext.assets.land;
		const landLabel =
			formatIconLabel(landInfo.icon, landInfo.label) ||
			landInfo.label ||
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
