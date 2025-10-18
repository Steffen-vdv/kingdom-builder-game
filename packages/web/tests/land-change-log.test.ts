import { describe, expect, it, vi } from 'vitest';
import { runEffects } from '@kingdom-builder/engine';
import type {
	PhaseConfig,
	RuleSet,
	StartConfig,
} from '@kingdom-builder/protocol';
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
import { createEngineTranslationContext } from './helpers/createEngineTranslationContext';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const TEST_PHASES: PhaseConfig[] = [
	{
		id: 'phase:action',
		label: 'Action Phase',
		icon: '🎯',
		action: true,
		steps: [{ id: 'phase:action:resolve', label: 'Resolve' }],
	},
];

const TEST_START: StartConfig = {
	player: {
		resources: {},
		stats: {},
		population: {},
		lands: [],
		buildings: [],
	},
	players: {
		opponent: {
			resources: {},
			stats: {},
			population: {},
			lands: [],
			buildings: [],
		},
	},
};

const TEST_RULES: RuleSet = {
	defaultActionAPCost: 1,
	absorptionCapPct: 1,
	absorptionRounding: 'nearest',
	tieredResourceKey: 'resource:test',
	tierDefinitions: [],
	slotsPerNewLand: 1,
	maxSlotsPerLand: 1,
	basePopulationCap: 1,
	winConditions: [],
};

function createTestContext() {
	const { engineContext, translationContext } = createEngineTranslationContext({
		phases: TEST_PHASES,
		start: TEST_START,
		rules: TEST_RULES,
		configureMetadata: (metadata) => ({
			...metadata,
			assets: {
				...(metadata.assets ?? {}),
				land: { label: 'Territory', icon: '🗺️' },
				slot: { label: 'Development Slot', icon: '🧩' },
			},
		}),
	});
	engineContext.assets = translationContext.assets;
	return engineContext;
}

describe('land change log formatting', () => {
	it('logs gained land entries with icon and label', () => {
		const engineContext = createTestContext();
		const before = snapshotPlayer(engineContext.activePlayer);
		runEffects(
			[
				{
					type: 'land',
					method: 'add',
				},
			],
			engineContext,
		);
		const after = snapshotPlayer(engineContext.activePlayer);
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
		const repeatLines = diffStepSnapshots(
			before,
			after,
			undefined,
			translationDiffContext,
		);
		expect(repeatLines).toContain(expectedLine);
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
		const before = snapshotPlayer(engineContext.activePlayer);
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
		const after = snapshotPlayer(engineContext.activePlayer);
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
		const repeatLines = diffStepSnapshots(
			before,
			after,
			undefined,
			translationDiffContext,
		);
		expect(repeatLines).toContain(expectedLine);
	});
});
