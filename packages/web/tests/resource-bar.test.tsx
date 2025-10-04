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
import { translateTierSummary } from '../src/translation';
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

const REMOVAL_PATTERN = /Active as long as/i;

function expectNoRemovalLore(items: unknown[]) {
	items.forEach((item) => {
		if (typeof item === 'string') {
			expect(item).not.toMatch(REMOVAL_PATTERN);
		}
	});
}

function expectSummaryMatches(items: unknown[], summary: string) {
	const summaryLines = summary
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0)
		.map((line) => `- ${line}`);
	expect(items).toEqual(expect.arrayContaining(summaryLines));
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
		expect(hoverCard?.description).toEqual([`Current value: ${resourceValue}`]);
		const tierEntries = hoverCard?.effects ?? [];
		expect(tierEntries).toHaveLength(ctx.services.rules.tierDefinitions.length);
		const activeEntry = tierEntries.find(
			(entry: unknown) =>
				typeof entry !== 'string' &&
				Boolean((entry as { title?: string }).title?.includes('🟢')),
		) as { items: unknown[] } | undefined;
		expect(activeEntry).toBeTruthy();
		const tiers = ctx.services.rules.tierDefinitions;
		const getRangeStart = (tier: TierDefinition) =>
			tier.range.min ?? Number.NEGATIVE_INFINITY;
		const orderedTiers = [...tiers].sort(
			(a, b) => getRangeStart(b) - getRangeStart(a),
		);
		orderedTiers.forEach((tier, index) => {
			const entry = tierEntries.at(index) as { items?: unknown[] } | undefined;
			expect(entry).toBeTruthy();
			const items = entry?.items ?? [];
			expect(items.length).toBeLessThanOrEqual(4);
			expectNoRemovalLore(items);
			const summaryToken = tier.display?.summaryToken;
			const translatedSummary = translateTierSummary(summaryToken);
			if (translatedSummary) {
				expectSummaryMatches(items, translatedSummary);
			}
		});
	});
});
