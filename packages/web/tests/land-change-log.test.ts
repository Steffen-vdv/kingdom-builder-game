import { describe, expect, it } from 'vitest';
import type {
	SessionPhaseDefinition,
	SessionPlayerStateSnapshot,
	SessionRuleSnapshot,
	SessionSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { logContent } from '../src/translation/content';
import { snapshotPlayer, diffStepSnapshots } from '../src/translation/log';
import {
	formatIconLabel,
	formatLogHeadline,
	LOG_KEYWORDS,
} from '../src/translation/log/logMessages';
import { createSessionTranslationContext } from '../src/state/createSessionTranslationContext';
import { createSessionRegistries } from './helpers/sessionRegistries';
import {
	createEmptySnapshotMetadata,
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';

const TEST_PHASES: SessionPhaseDefinition[] = [
	{
		id: 'phase:action',
		label: 'Action Phase',
		icon: '🎯',
		action: true,
		steps: [{ id: 'phase:action:resolve', label: 'Resolve' }],
	},
];

const BASE_METADATA: SessionSnapshotMetadata = createEmptySnapshotMetadata({
	assets: {
		land: { label: 'Territory', icon: '🗺️' },
		slot: { label: 'Development Slot', icon: '🧩' },
		passive: { label: 'Passive', icon: '✨' },
	},
});

function createRuleSnapshot(resourceKey: string): SessionRuleSnapshot {
	return {
		tieredResourceKey: resourceKey,
		tierDefinitions: [],
		winConditions: [],
	} satisfies SessionRuleSnapshot;
}

function createSessionState(
	players: SessionPlayerStateSnapshot[],
	metadata: SessionSnapshotMetadata,
	ruleSnapshot: SessionRuleSnapshot,
	phases: SessionPhaseDefinition[],
	actionCostResource: SessionSnapshot['actionCostResource'],
): SessionSnapshot {
	return createSessionSnapshot({
		players,
		activePlayerId: players[0]!.id,
		opponentId: players[1]!.id,
		phases,
		actionCostResource,
		ruleSnapshot,
		metadata,
	});
}

describe('land change log formatting', () => {
	it('logs gained land entries with icon and label', () => {
		const registries = createSessionRegistries();
		const resourceKey = Object.keys(registries.resources)[0] ?? 'resource:test';
		const ruleSnapshot = createRuleSnapshot(resourceKey);
		const metadata = {
			...BASE_METADATA,
		} satisfies SessionSnapshotMetadata;
		const opponent = createSnapshotPlayer({ id: 'player:opponent' });
		const baseLand = {
			id: 'land:existing',
			slotsMax: 1,
			slotsUsed: 0,
			tilled: true,
			developments: [],
		} satisfies SessionPlayerStateSnapshot['lands'][number];
		const beforePlayer = createSnapshotPlayer({
			id: 'player:active',
			lands: [baseLand],
		});
		const afterPlayer = createSnapshotPlayer({
			id: beforePlayer.id,
			lands: [
				baseLand,
				{
					id: 'land:new',
					slotsMax: 1,
					slotsUsed: 0,
					tilled: false,
					developments: [],
				},
			],
		});
		const beforeSession = createSessionState(
			[beforePlayer, opponent],
			metadata,
			ruleSnapshot,
			TEST_PHASES,
			resourceKey,
		);
		const afterSession = createSessionState(
			[afterPlayer, opponent],
			metadata,
			ruleSnapshot,
			TEST_PHASES,
			resourceKey,
		);
		const before = snapshotPlayer(beforeSession.game.players[0]!);
		const after = snapshotPlayer(afterSession.game.players[0]!);
		const { diffContext, translationContext } = createSessionTranslationContext(
			{
				snapshot: afterSession,
				ruleSnapshot: afterSession.rules,
				passiveRecords: afterSession.passiveRecords,
				registries,
			},
		);
		const translationDiffContext = diffContext;
		const landInfo = translationContext.assets.land;
		const landLabel =
			formatIconLabel(landInfo.icon, landInfo.label) ||
			landInfo.label ||
			'Land';
		const lines = diffStepSnapshots(
			before,
			after,
			undefined,
			translationDiffContext,
		);
		const landLine = lines.find((line) => {
			return line.startsWith(landLabel);
		});
		expect(landLine).toBeTruthy();
		if (!landLine) {
			return;
		}
		const previousCount = before.lands.length;
		const expectedLine = `${landLabel} +1 (${previousCount}→${previousCount + 1})`;
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
		const registries = createSessionRegistries();
		const resourceKey = Object.keys(registries.resources)[0] ?? 'resource:test';
		const ruleSnapshot = createRuleSnapshot(resourceKey);
		const metadata = {
			...BASE_METADATA,
		} satisfies SessionSnapshotMetadata;
		const opponent = createSnapshotPlayer({ id: 'player:opponent' });
		const targetLand = {
			id: 'land:target',
			slotsMax: 1,
			slotsUsed: 0,
			tilled: true,
			developments: [],
		} satisfies SessionPlayerStateSnapshot['lands'][number];
		const beforePlayer = createSnapshotPlayer({
			id: 'player:active',
			lands: [targetLand],
		});
		const developmentEntries = Array.from(registries.developments.entries());
		const developmentEntry = developmentEntries.find(([, definition]) => {
			return Boolean(definition?.icon) && Boolean(definition?.name);
		});
		const fallbackDevelopment = developmentEntries[0];
		const [developmentId] = developmentEntry ?? fallbackDevelopment ?? [];
		expect(developmentId).toBeTruthy();
		if (!developmentId) {
			return;
		}
		const afterPlayer = createSnapshotPlayer({
			id: beforePlayer.id,
			lands: [
				{
					...targetLand,
					developments: [developmentId],
				},
			],
		});
		const beforeSession = createSessionState(
			[beforePlayer, opponent],
			metadata,
			ruleSnapshot,
			TEST_PHASES,
			resourceKey,
		);
		const afterSession = createSessionState(
			[afterPlayer, opponent],
			metadata,
			ruleSnapshot,
			TEST_PHASES,
			resourceKey,
		);
		const before = snapshotPlayer(beforeSession.game.players[0]!);
		const after = snapshotPlayer(afterSession.game.players[0]!);
		const { diffContext, translationContext } = createSessionTranslationContext(
			{
				snapshot: afterSession,
				ruleSnapshot: afterSession.rules,
				passiveRecords: afterSession.passiveRecords,
				registries,
			},
		);
		const translationDiffContext = diffContext;
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
			translationContext,
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
