/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
	it('uses shared passive removal formatting in UI and logs', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const { resourceKey } = ctx.services.tieredResource;
		const happinessKey = resourceKey as ResourceKey;
		const { activePlayer } = ctx;
		activePlayer.resources[happinessKey] = 6;
		ctx.services.handleTieredResourceChange(ctx, happinessKey);

		const handleHoverCard = vi.fn();
		const clearHoverCard = vi.fn();
		currentGame = {
			ctx,
			handleHoverCard,
			clearHoverCard,
		} as MockGame;

		const summaries = ctx.passives.list(activePlayer.id);
		expect(summaries).not.toHaveLength(0);
		const passiveSummary = summaries[0];
		const removalToken = passiveSummary.meta?.removal?.token;
		expect(removalToken).toBeTruthy();
		const expectedRemoval = formatPassiveRemoval(removalToken!);

		render(<PassiveDisplay player={activePlayer} />);

		const badgeLabel = screen.getByText(/joyful/i);
		expect(badgeLabel).toBeInTheDocument();
		expect(screen.queryByText(expectedRemoval)).not.toBeInTheDocument();

		const hoverTarget = badgeLabel.closest('div.hoverable');
		expect(hoverTarget).not.toBeNull();
		fireEvent.mouseEnter(hoverTarget!);
		expect(handleHoverCard).toHaveBeenCalled();
		const [{ description }] = handleHoverCard.mock.calls.at(-1) ?? [{}];
		expect(description).toBeDefined();
		const entries = Array.isArray(description) ? description : [];
		expect(entries).toContain(expectedRemoval);
		expect(entries.some((entry) => /Income \+25%/i.test(entry))).toBe(true);

		const details = resolvePassiveLogDetails(passiveSummary);
		expect(details.removal).toBe(expectedRemoval);
	});

	it('renders no passive cards when the tier lacks passives', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		const { resourceKey } = ctx.services.tieredResource;
		const happinessKey = resourceKey as ResourceKey;
		const { activePlayer } = ctx;
		activePlayer.resources[happinessKey] = 0;
		ctx.services.handleTieredResourceChange(ctx, happinessKey);

		const handleHoverCard = vi.fn();
		const clearHoverCard = vi.fn();
		currentGame = {
			ctx,
			handleHoverCard,
			clearHoverCard,
		} as MockGame;

		const { container } = render(<PassiveDisplay player={activePlayer} />);

		expect(container).toBeEmptyDOMElement();
	});
});
