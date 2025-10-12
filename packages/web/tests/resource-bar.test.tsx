/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import ResourceBar from '../src/components/player/ResourceBar';
import { describeEffects, splitSummary } from '../src/translation';
import { MAX_TIER_SUMMARY_LINES } from '../src/components/player/buildTierEntries';
import type { LegacyGameEngineContextValue } from '../src/state/GameContext.types';
import { createTestRegistryMetadata } from './helpers/registryMetadata';
import { RegistryMetadataProvider } from '../src/contexts/RegistryMetadataContext';
import {
	formatDescriptorSummary,
	toDescriptorDisplay,
} from '../src/components/player/registryDisplays';
import { createTierPassiveScenario } from './helpers/passiveDisplayFixtures';

type MockGame = LegacyGameEngineContextValue;

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
		const scenario = createTierPassiveScenario();
		const {
			mockGame,
			handleHoverCard,
			activePlayer,
			ruleSnapshot,
			registries,
			metadata,
		} = scenario;
		currentGame = mockGame;
		const metadataSelectors = createTestRegistryMetadata(registries, metadata);
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<ResourceBar player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const happinessKey = ruleSnapshot.tieredResourceKey;
		const resourceDescriptor = toDescriptorDisplay(
			metadataSelectors.resourceMetadata.select(happinessKey),
		);
		const resourceValue = activePlayer.resources[happinessKey] ?? 0;
		const button = screen.getByRole('button', {
			name: `${resourceDescriptor.label}: ${resourceValue}`,
		});
		fireEvent.mouseEnter(button);
		expect(handleHoverCard).toHaveBeenCalled();
		const hoverCard = handleHoverCard.mock.calls.at(-1)?.[0];
		expect(hoverCard).toBeTruthy();
		expect(hoverCard?.title).toBe(formatDescriptorSummary(resourceDescriptor));
		expect(hoverCard?.description).toBeUndefined();
		expect(hoverCard?.effectsTitle).toBe(
			`Happiness thresholds (current: ${resourceValue})`,
		);
		const tierDefinitions = ruleSnapshot.tierDefinitions;
		const tierEntries = (hoverCard?.effects ?? []).filter(
			(section): section is SummaryGroupLike =>
				Boolean(section) && typeof section === 'object',
		);
		const expectedTierCount = Math.min(3, tierDefinitions.length);
		expect(tierEntries).toHaveLength(expectedTierCount);
		const [higherEntry, currentEntry, lowerEntry] = tierEntries;
		const currentClassName = currentEntry?.className ?? '';
		expect(currentClassName.includes('text-emerald-600')).toBe(true);
		const getRangeStart = (tier: (typeof tierDefinitions)[number]) =>
			tier.range.min ?? Number.NEGATIVE_INFINITY;
		const orderedTiers = [...tierDefinitions].sort(
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
			tier: (typeof tierDefinitions)[number] | undefined,
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
		const tierContexts = [
			{ tier: higherTier, entry: higherEntry, orientation: 'higher' as const },
			{
				tier: activeTier,
				entry: currentEntry,
				orientation: 'current' as const,
			},
			{ tier: lowerTier, entry: lowerEntry, orientation: 'lower' as const },
		];
		for (const context of tierContexts) {
			expectTierEntryMatches(context.tier, context.entry, context.orientation);
		}
	});

	it('uses fallback descriptors when metadata omits resource icons and labels', () => {
		const scenario = createTierPassiveScenario();
		const { mockGame, activePlayer, registries, metadata } = scenario;
		currentGame = mockGame;
		const metadataSelectors = createTestRegistryMetadata(registries, metadata);
		const displays = metadataSelectors.resourceMetadata.list.map((descriptor) =>
			toDescriptorDisplay(descriptor),
		);
		const fallbackDisplay = displays.find(
			(display) => display.icon === undefined,
		);
		if (!fallbackDisplay) {
			throw new Error('Expected a resource descriptor without an icon.');
		}
		render(
			<RegistryMetadataProvider registries={registries} metadata={metadata}>
				<ResourceBar player={activePlayer} />
			</RegistryMetadataProvider>,
		);
		const value = activePlayer.resources[fallbackDisplay.id] ?? 0;
		const buttons = screen.getAllByRole('button', {
			name: `${fallbackDisplay.label}: ${value}`,
		});
		expect(buttons.length).toBeGreaterThan(0);
		expect(fallbackDisplay.icon).toBeUndefined();
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
