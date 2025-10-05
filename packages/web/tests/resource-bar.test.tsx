/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { createEngine } from '@kingdom-builder/engine';
import type { EngineContext } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	RESOURCES,
	type ResourceKey,
} from '@kingdom-builder/contents';
import ResourceBar from '../src/components/player/ResourceBar';
import { describeEffects, splitSummary } from '../src/translation';
import { MAX_TIER_SUMMARY_LINES } from '../src/components/player/buildTierEntries';
vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});
type MockGame = {
	ctx: EngineContext;
	handleHoverCard: ReturnType<typeof vi.fn>;
	clearHoverCard: ReturnType<typeof vi.fn>;
};
type TierDefinition =
	EngineContext['services']['rules']['tierDefinitions'][number];

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

function formatTierRange(tier: TierDefinition) {
	const { min, max } = tier.range;
	if (max === undefined) {
		return `${min}+`;
	}
	if (min === max) {
		return `${min}`;
	}
	return `${min} - ${max}`;
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
		ctx.activePlayer.resources[happinessKey] = 6;
		ctx.services.handleTieredResourceChange(ctx, happinessKey);
		const handleHoverCard = vi.fn();
		const clearHoverCard = vi.fn();
		currentGame = {
			ctx,
			handleHoverCard,
			clearHoverCard,
		} as MockGame;
		render(<ResourceBar player={ctx.activePlayer} />);
		const resourceInfo = RESOURCES[happinessKey];
		const resourceValue = ctx.activePlayer.resources[happinessKey] ?? 0;
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
		const tierSections = (hoverCard?.effects ?? []).filter(
			(section): section is SummaryGroupLike => typeof section !== 'string',
		);
		expect(tierSections).toHaveLength(3);
		const groupedByTitle = Object.fromEntries(
			tierSections.map((section) => [section.title ?? '', section]),
		);
		const currentSection = groupedByTitle['Current tier'];
		expect(currentSection).toBeTruthy();
		const risingSection = groupedByTitle['If happiness rises'];
		expect(risingSection).toBeTruthy();
		const fallingSection = groupedByTitle['If happiness falls'];
		expect(fallingSection).toBeTruthy();
		const extractNestedEntry = (
			section: SummaryGroupLike | undefined,
		): SummaryGroupLike | undefined => {
			if (!section) {
				return undefined;
			}
			return (section.items ?? []).find(
				(item): item is SummaryGroupLike =>
					Boolean(item) && typeof item === 'object',
			);
		};
		const currentEntry = extractNestedEntry(currentSection);
		expect(currentEntry).toBeTruthy();
		const currentClassName = currentEntry?.className ?? '';
		expect(currentClassName.includes('text-emerald-600')).toBe(true);
		const risingEntry = extractNestedEntry(risingSection);
		const fallingEntry = extractNestedEntry(fallingSection);
		expect(risingEntry).toBeTruthy();
		expect(fallingEntry).toBeTruthy();
		const nestedTierEntries = [risingEntry, currentEntry, fallingEntry].filter(
			(entry): entry is SummaryGroupLike => Boolean(entry),
		);
		expect(nestedTierEntries).toHaveLength(3);
		const tiers = ctx.services.rules.tierDefinitions;
		const getRangeStart = (tier: TierDefinition) =>
			tier.range.min ?? Number.NEGATIVE_INFINITY;
		const orderedTiers = [...tiers].sort(
			(a, b) => getRangeStart(b) - getRangeStart(a),
		);
		const tierResourceIcon = RESOURCES[happinessKey]?.icon || '';
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
		) => {
			if (!tier) {
				expect(entry).toBeUndefined();
				return;
			}
			expect(entry).toBeTruthy();
			const expectedTitlePart = (() => {
				const rangeLabel = formatTierRange(tier);
				if (!tierResourceIcon) {
					return `(${rangeLabel})`;
				}
				return `(${tierResourceIcon} ${rangeLabel})`;
			})();
			expect((entry?.title ?? '').includes(expectedTitlePart)).toBe(true);
			const items = entry?.items ?? [];
			expect(items.length).toBeLessThanOrEqual(MAX_TIER_SUMMARY_LINES);
			const summaryEntries = tier.preview?.effects?.length
				? describeEffects(tier.preview.effects, ctx)
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
		expectTierEntryMatches(higherTier, risingEntry);
		expectTierEntryMatches(activeTier, currentEntry);
		expectTierEntryMatches(lowerTier, fallingEntry);
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
