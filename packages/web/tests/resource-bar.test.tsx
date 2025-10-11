/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { createTranslationContext } from '../src/translation/context';
import { PHASES, RULES, type ResourceKey } from '@kingdom-builder/contents';
import ResourceBar from '../src/components/player/ResourceBar';
import { describeEffects, splitSummary } from '../src/translation';
import { MAX_TIER_SUMMARY_LINES } from '../src/components/player/buildTierEntries';
import type { LegacyGameEngineContextValue } from '../src/state/GameContext.types';
import type {
	EngineSession,
	PlayerId,
	RuleSnapshot,
} from '@kingdom-builder/engine';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { selectSessionView } from '../src/state/sessionSelectors';
import { createSessionRegistries } from './helpers/sessionRegistries';
type MockGame = LegacyGameEngineContextValue;
type TierDefinition = RuleSnapshot['tierDefinitions'][number];

type SummaryGroupLike = {
	title?: string;
	items?: unknown[];
	className?: string;
};

function flattenSummary(entries: unknown[]): string[] {
	const lines: string[] = [];
	const queue = [...entries];
	while (queue.length) {
		const entry = queue.shift();
		if (entry === undefined) {
			continue;
		}
		if (typeof entry === 'string') {
			lines.push(entry);
			continue;
		}
		if (entry && typeof entry === 'object') {
			const group = entry as { title?: string; items?: unknown[] };
			if (group.title) {
				lines.push(group.title);
			}
			if (Array.isArray(group.items)) {
				queue.unshift(...group.items);
			}
		}
	}
	return lines;
}

function normalizeSummary(summary: string | undefined): string[] {
	if (!summary) {
		return [];
	}
	return summary
		.split(/\r?\n/u)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);
}
let currentGame: MockGame;
vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
}));
describe('<ResourceBar /> happiness hover card', () => {
	it('lists happiness tiers with concise summaries and highlights the active threshold', () => {
		const happinessKey = RULES.tieredResourceKey as ResourceKey;
		const activePlayerId = 'player-1' as PlayerId;
		const opponentId = 'player-2' as PlayerId;
		const tierDefinitions = RULES.tierDefinitions.map((tier) => ({
			...tier,
			display: {
				...(tier.display ?? {}),
				title: `Snapshot ${tier.id}`,
			},
		}));
		const ruleSnapshot = {
			...RULES,
			tierDefinitions,
		};
		const activePlayer = createSnapshotPlayer({
			id: activePlayerId,
			name: 'Player One',
			resources: { [happinessKey]: 6 },
		});
		const opponent = createSnapshotPlayer({
			id: opponentId,
			name: 'Player Two',
		});
		const sessionState = createSessionSnapshot({
			players: [activePlayer, opponent],
			activePlayerId,
			opponentId,
			phases: PHASES,
			actionCostResource: RULES.tieredResourceKey as ResourceKey,
			ruleSnapshot,
		});
		const handleHoverCard = vi.fn();
		const clearHoverCard = vi.fn();
		const sessionRegistries = createSessionRegistries();
		const translationContext = createTranslationContext(
			sessionState,
			sessionRegistries,
			sessionState.metadata,
			{
				ruleSnapshot,
				passiveRecords: sessionState.passiveRecords,
			},
		);
		const sessionView = selectSessionView(sessionState, sessionRegistries);
		currentGame = {
			sessionId: 'test-session',
			sessionSnapshot: sessionState,
			cachedSessionSnapshot: sessionState,
			selectors: { sessionView },
			translationContext,
			ruleSnapshot,
			log: [],
			logOverflowed: false,
			resolution: null,
			showResolution: vi.fn().mockResolvedValue(undefined),
			acknowledgeResolution: vi.fn(),
			hoverCard: null,
			handleHoverCard,
			clearHoverCard,
			phaseSteps: [],
			setPhaseSteps: vi.fn(),
			phaseTimer: 0,
			mainApStart: 0,
			displayPhase: '',
			setDisplayPhase: vi.fn(),
			phaseHistories: {},
			tabsEnabled: true,
			actionCostResource: sessionState.actionCostResource as ResourceKey,
			requests: {
				performAction: vi.fn().mockResolvedValue(undefined),
				advancePhase: vi.fn().mockResolvedValue(undefined),
				refreshSession: vi.fn().mockResolvedValue(undefined),
			},
			metadata: {
				getRuleSnapshot: () => ruleSnapshot,
				getSessionView: () => sessionView,
				getTranslationContext: () => translationContext,
			},
			runUntilActionPhase: vi.fn().mockResolvedValue(undefined),
			updateMainPhaseStep: vi.fn(),
			darkMode: true,
			onToggleDark: vi.fn(),
			musicEnabled: true,
			onToggleMusic: vi.fn(),
			soundEnabled: true,
			onToggleSound: vi.fn(),
			backgroundAudioMuted: true,
			onToggleBackgroundAudioMute: vi.fn(),
			timeScale: 1,
			setTimeScale: vi.fn(),
			toasts: [],
			pushToast: vi.fn(),
			pushErrorToast: vi.fn(),
			pushSuccessToast: vi.fn(),
			dismissToast: vi.fn(),
			playerName: 'Player',
			onChangePlayerName: vi.fn(),
			session: {} as EngineSession,
			sessionState,
			sessionView,
			handlePerform: vi.fn().mockResolvedValue(undefined),
			handleEndTurn: vi.fn().mockResolvedValue(undefined),
		} as MockGame;
		render(<ResourceBar player={activePlayer} />);
		const resourceInfo = sessionRegistries.resources[happinessKey];
		const resourceValue = activePlayer.resources[happinessKey] ?? 0;
		const button = screen.getByRole('button', {
			name: `${resourceInfo.label}: ${resourceValue}`,
		});
		fireEvent.mouseEnter(button);
		expect(handleHoverCard).toHaveBeenCalled();
		const hoverCard = handleHoverCard.mock.calls.at(-1)?.[0];
		expect(hoverCard).toBeTruthy();
		expect(hoverCard?.title).toBe(`${resourceInfo.icon} ${resourceInfo.label}`);
		expect(hoverCard?.description).toBeUndefined();
		expect(hoverCard?.effectsTitle).toBe(
			`Happiness thresholds (current: ${resourceValue})`,
		);
		const tierEntries = (hoverCard?.effects ?? []).filter(
			(section): section is SummaryGroupLike =>
				Boolean(section) && typeof section === 'object',
		);
		expect(tierEntries).toHaveLength(3);
		expect(
			tierEntries.some((entry) => (entry?.title ?? '').includes('Snapshot')),
		).toBe(true);
		const [higherEntry, currentEntry, lowerEntry] = tierEntries;
		expect(higherEntry).toBeTruthy();
		expect(currentEntry).toBeTruthy();
		expect(lowerEntry).toBeTruthy();
		const currentClassName = currentEntry?.className ?? '';
		expect(currentClassName.includes('text-emerald-600')).toBe(true);
		const tiers = ruleSnapshot.tierDefinitions;
		const getRangeStart = (tier: TierDefinition) =>
			tier.range.min ?? Number.NEGATIVE_INFINITY;
		const orderedTiers = [...tiers].sort(
			(a, b) => getRangeStart(b) - getRangeStart(a),
		);
		const tierResourceIcon =
			sessionRegistries.resources[happinessKey]?.icon || '';
		const activeTierIndex = orderedTiers.findIndex((tier) => {
			const { min, max } = tier.range;
			return valueInRange(resourceValue, min, max);
		});
		expect(activeTierIndex).toBeGreaterThanOrEqual(0);
		const activeTier = orderedTiers.at(activeTierIndex);
		const higherTier =
			activeTierIndex > 0 ? orderedTiers[activeTierIndex - 1] : undefined;
		const lowerTier =
			activeTierIndex + 1 < orderedTiers.length
				? orderedTiers[activeTierIndex + 1]
				: undefined;
		const expectTierEntryMatches = (
			tier: TierDefinition | undefined,
			entry: SummaryGroupLike | undefined,
			orientation: 'higher' | 'current' | 'lower',
		) => {
			if (!tier) {
				expect(entry).toBeUndefined();
				return;
			}
			expect(entry).toBeTruthy();
			const title = entry?.title ?? '';
			if (orientation === 'current') {
				expect(title.includes('(')).toBe(false);
			} else {
				const threshold =
					orientation === 'higher'
						? tier.range.min
						: (tier.range.max ?? tier.range.min);
				if (threshold !== undefined) {
					const thresholdSuffix = `${threshold}${
						orientation === 'higher' ? '+' : '-'
					}`;
					const expectedLabel = tierResourceIcon
						? `${tierResourceIcon} ${thresholdSuffix}`
						: thresholdSuffix;
					expect(title.includes(expectedLabel)).toBe(true);
					expect(title.includes('(')).toBe(true);
				}
			}
			const items = entry?.items ?? [];
			expect(items.length).toBeLessThanOrEqual(MAX_TIER_SUMMARY_LINES);
			const summaryEntries = tier.preview?.effects?.length
				? describeEffects(tier.preview.effects, translationContext)
				: normalizeSummary(tier.text?.summary);
			const baseSummary = summaryEntries.length
				? summaryEntries
				: ['No effect'];
			const { effects } = splitSummary(baseSummary);
			const expectedEffects = effects.slice(0, MAX_TIER_SUMMARY_LINES);
			expect(items).toEqual(expectedEffects);
			const removalText = tier.text?.removal;
			if (removalText) {
				expect(flattenSummary(items)).not.toContain(removalText);
			}
		};
		expectTierEntryMatches(higherTier, higherEntry, 'higher');
		expectTierEntryMatches(activeTier, currentEntry, 'current');
		expectTierEntryMatches(lowerTier, lowerEntry, 'lower');
	});
});

function valueInRange(value: number, min?: number, max?: number) {
	if (min !== undefined && value < min) {
		return false;
	}
	if (max !== undefined && value > max) {
		return false;
	}
	return true;
}
