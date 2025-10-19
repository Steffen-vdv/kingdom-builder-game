/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ResourceBar from '../src/components/player/ResourceBar';
import { describeEffects, splitSummary } from '../src/translation';
import { MAX_TIER_SUMMARY_LINES } from '../src/components/player/buildTierEntries';
import type { GameEngineContextValue } from '../src/state/GameContext.types';
import type { PlayerId, RuleSnapshot } from '@kingdom-builder/engine';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { selectSessionView } from '../src/state/sessionSelectors';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import {
	formatIconLabel,
	toDescriptorDisplay,
} from '../src/components/player/registryDisplays';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createPassiveGame } from './helpers/createPassiveDisplayGame';

type MockGame = GameEngineContextValue;
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

function createResourceBarScenario() {
	const scaffold = createTestSessionScaffold();
	const resourceKeys = Object.keys(scaffold.registries.resources);
	const happinessKey = scaffold.ruleSnapshot.tieredResourceKey;
	const actionCostResource =
		resourceKeys.find((key) => key !== happinessKey) ??
		resourceKeys[0] ??
		happinessKey;
	const tierDefinitions: TierDefinition[] = [
		{
			id: 'tier.strained',
			range: { max: 3 },
			effect: { incomeMultiplier: 0 },
			preview: {
				id: 'tier.strained.passive',
				effects: [
					{
						type: 'resource',
						method: 'remove',
						params: { key: happinessKey, amount: 1 },
					},
				],
			},
			text: {
				summary: 'Lose key resources to unrest.',
				removal: 'The populace rallies.',
			},
			display: {
				title: 'Strained Spirits',
				icon: '⚠️',
				summaryToken: 'tier.strained.summary',
				removalCondition: 'Restore hope to recover.',
			},
		},
		{
			id: scaffold.neutralTierId,
			range: { min: 4, max: 6 },
			effect: { incomeMultiplier: 1 },
			preview: {
				id: scaffold.tierPassiveId,
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: { key: happinessKey, amount: 1 },
					},
				],
			},
			text: {
				summary: 'Hold steady without bonuses.',
				removal: 'Resolve slips away.',
			},
			display: {
				title: 'Steady Resolve',
				summaryToken: 'tier.neutral.summary',
			},
		},
		{
			id: 'tier.glory',
			range: { min: 7 },
			effect: { incomeMultiplier: 2 },
			preview: {
				id: 'tier.glory.passive',
				effects: [
					{
						type: 'resource',
						method: 'add',
						params: { key: happinessKey, amount: 2 },
					},
				],
			},
			text: {
				summary: 'Gain celebratory gifts.',
				removal: 'Celebrations cease.',
			},
			display: {
				title: 'Glory Days',
				icon: '🎆',
				summaryToken: 'tier.glory.summary',
				removalCondition: 'Keep morale blazing.',
			},
		},
	];
	const ruleSnapshot: RuleSnapshot = {
		...scaffold.ruleSnapshot,
		tieredResourceKey: happinessKey,
		tierDefinitions,
	};
	const activePlayerId = 'player-1' as PlayerId;
	const opponentId = 'player-2' as PlayerId;
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: { [happinessKey]: 6 },
	});
	const opponent = createSnapshotPlayer({
		id: opponentId,
		name: 'Player Two',
	});
	const metadata = structuredClone(scaffold.metadata);
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId,
		opponentId,
		phases: scaffold.phases,
		actionCostResource,
		ruleSnapshot,
		metadata,
	});
	const { mockGame, handleHoverCard, clearHoverCard, registries } =
		createPassiveGame(sessionState, {
			ruleSnapshot,
			registries: scaffold.registries,
			metadata,
		});
	const sessionView = selectSessionView(sessionState, scaffold.registries);
	mockGame.selectors.sessionView = sessionView;
	mockGame.sessionSnapshot = sessionState;
	mockGame.handleHoverCard = handleHoverCard;
	mockGame.clearHoverCard = clearHoverCard;
	const metadataSelectors = createTestRegistryMetadata(
		registries,
		sessionState.metadata,
	);
	return {
		mockGame,
		registries,
		metadata: sessionState.metadata,
		ruleSnapshot,
		happinessKey,
		activePlayer,
		metadataSelectors,
		sessionState,
		sessionView,
		handleHoverCard,
	};
}

let currentGame: MockGame;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
}));

describe('<ResourceBar /> happiness hover card', () => {
	it('lists happiness tiers with concise summaries and highlights the active threshold', () => {
		const scenario = createResourceBarScenario();
		const {
			mockGame,
			registries,
			metadata,
			ruleSnapshot,
			happinessKey,
			activePlayer,
			metadataSelectors,
			handleHoverCard,
		} = scenario;
		currentGame = mockGame;
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<ResourceBar player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const resourceDescriptor = toDescriptorDisplay(
			metadataSelectors.resourceMetadata.select(happinessKey),
		);
		const resourceValue = activePlayer.resources[happinessKey] ?? 0;
		const button = screen.getByRole('button', {
			name: `${resourceDescriptor.label}: ${resourceValue}`,
		});
		const descriptorIcon = resourceDescriptor.icon;
		expect(descriptorIcon).toBeDefined();
		expect(button).toHaveTextContent(descriptorIcon as string);
		fireEvent.mouseEnter(button);
		expect(handleHoverCard).toHaveBeenCalled();
		const hoverCard = handleHoverCard.mock.calls.at(-1)?.[0];
		expect(hoverCard).toBeTruthy();
		expect(hoverCard?.title).toBe(formatIconLabel(resourceDescriptor));
		expect(hoverCard?.description).toBeUndefined();
		expect(hoverCard?.effectsTitle).toBe(
			`Happiness thresholds (current: ${resourceValue})`,
		);
		const tierEntries = (hoverCard?.effects ?? []).filter(
			(section): section is SummaryGroupLike =>
				Boolean(section) && typeof section === 'object',
		);
		expect(tierEntries).toHaveLength(3);
		const titles = tierEntries.map((entry) => entry?.title ?? '');
		expect(titles.join(' ')).toContain('Glory Days');
		expect(titles.join(' ')).toContain('Steady Resolve');
		expect(titles.join(' ')).toContain('Strained Spirits');
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
		const tierResourceIcon = resourceDescriptor.icon ?? '❔';
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
				? describeEffects(tier.preview.effects, mockGame.translationContext)
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
