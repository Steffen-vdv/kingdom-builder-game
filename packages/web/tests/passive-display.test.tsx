/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PassiveDisplay from '../src/components/player/PassiveDisplay';
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
	formatPassiveRemoval,
	type ResourceKey,
} from '@kingdom-builder/contents';
import { resolvePassiveLogDetails } from '../src/translation/log/passives';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

type MockGame = {
	ctx: EngineContext;
	handleHoverCard: ReturnType<typeof vi.fn>;
	clearHoverCard: ReturnType<typeof vi.fn>;
};

let currentGame: MockGame;

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => currentGame,
}));

describe('<PassiveDisplay />', () => {
	it('shows passive labels and removal text from metadata', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const tieredResource = ctx.services.tieredResource;
		const happinessKey = tieredResource.resourceKey as ResourceKey;
		ctx.activePlayer.resources[happinessKey] = 6;
		ctx.services.handleTieredResourceChange(ctx, happinessKey);

		const handleHoverCard = vi.fn();
		const clearHoverCard = vi.fn();
		currentGame = {
			ctx,
			handleHoverCard,
			clearHoverCard,
		} as MockGame;

		render(<PassiveDisplay player={ctx.activePlayer} />);
		const [summary] = ctx.passives.list(ctx.activePlayer.id);
		expect(summary).toBeDefined();
		const removalToken = summary?.meta?.removal?.token;
		expect(removalToken).toBeDefined();
		const expectedRemoval = formatPassiveRemoval(removalToken!);
		const summaryLabel = summary?.name;
		const hoverTarget = document.querySelector('div.hoverable');
		expect(hoverTarget).not.toBeNull();
		if (summaryLabel) {
			expect(hoverTarget?.textContent ?? '').toContain(summaryLabel);
		}
		expect(document.body).not.toHaveTextContent(expectedRemoval);
		fireEvent.mouseEnter(hoverTarget!);
		expect(handleHoverCard).toHaveBeenCalled();
		const [{ description }] = handleHoverCard.mock.calls.at(-1) ?? [{}];
		const descriptionEntries = Array.isArray(description)
			? (description as string[])
			: [];
		expect(descriptionEntries.length).toBeGreaterThan(0);
		expect(descriptionEntries).toContain(expectedRemoval);
	});

	it('uses shared passive removal formatter for UI and logs', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const tieredResource = ctx.services.tieredResource;
		const happinessKey = tieredResource.resourceKey as ResourceKey;
		ctx.activePlayer.resources[happinessKey] = 6;
		ctx.services.handleTieredResourceChange(ctx, happinessKey);
		const handleHoverCard = vi.fn();
		const clearHoverCard = vi.fn();
		currentGame = {
			ctx,
			handleHoverCard,
			clearHoverCard,
		} as MockGame;
		const view = render(<PassiveDisplay player={ctx.activePlayer} />);
		const { container } = view;
		const [summary] = ctx.passives.list(ctx.activePlayer.id);
		expect(summary).toBeDefined();
		const removalToken = summary?.meta?.removal?.token;
		expect(removalToken).toBeDefined();
		const expectedRemoval = formatPassiveRemoval(removalToken!);
		const hoverTarget = container.querySelector('div.hoverable');
		expect(hoverTarget).not.toBeNull();
		fireEvent.mouseEnter(hoverTarget!);
		expect(handleHoverCard).toHaveBeenCalled();
		const lastCall = handleHoverCard.mock.calls.at(-1);
		expect(lastCall).toBeDefined();
		const descriptionEntries = Array.isArray(lastCall?.[0]?.description)
			? (lastCall?.[0]?.description as string[])
			: [];
		expect(descriptionEntries).toContain(expectedRemoval);
		const logDetails = resolvePassiveLogDetails(summary!);
		expect(logDetails.removal).toBe(expectedRemoval);
	});

	it('renders no passive cards when the active tier lacks passives', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const tieredResource = ctx.services.tieredResource;
		const happinessKey = tieredResource.resourceKey as ResourceKey;
		ctx.activePlayer.resources[happinessKey] = 0;
		ctx.services.handleTieredResourceChange(ctx, happinessKey);

		const handleHoverCard = vi.fn();
		const clearHoverCard = vi.fn();
		currentGame = {
			ctx,
			handleHoverCard,
			clearHoverCard,
		} as MockGame;

		const view = render(<PassiveDisplay player={ctx.activePlayer} />);
		const { container } = view;

		expect(container).toBeEmptyDOMElement();
	});
});
