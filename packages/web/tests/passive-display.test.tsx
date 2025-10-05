/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PassiveDisplay from '../src/components/player/PassiveDisplay';
import { createEngine, runEffects } from '@kingdom-builder/engine';
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
import { resolvePassivePresentation } from '../src/translation/log/passives';
import { buildTierEntries } from '../src/components/player/buildTierEntries';
import {
	createPassiveGame,
	type MockGame,
} from './helpers/createPassiveDisplayGame';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

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

		const { mockGame, handleHoverCard } = createPassiveGame(ctx);
		currentGame = mockGame;

		render(<PassiveDisplay player={ctx.activePlayer} />);
		const [summary] = ctx.passives.list(ctx.activePlayer.id);
		expect(summary).toBeDefined();
		const definitions = ctx.passives.values(ctx.activePlayer.id);
		const definition = definitions.find((def) => def.id === summary?.id);
		expect(definition).toBeDefined();
		const presentation = resolvePassivePresentation(summary!, { definition });
		expect(presentation.removal).toBeDefined();
		const hoverTarget = document.querySelector('div.hoverable');
		expect(hoverTarget).not.toBeNull();
		expect(hoverTarget?.textContent ?? '').toContain(presentation.label);
		expect(document.body).not.toHaveTextContent(presentation.removal ?? '');
		fireEvent.mouseEnter(hoverTarget!);
		expect(handleHoverCard).toHaveBeenCalled();
		const [hoverCard] = handleHoverCard.mock.calls.at(-1) ?? [{}];
		expect(hoverCard?.description).toBeUndefined();
		const tierDefinition = ctx.services.rules.tierDefinitions.find(
			(tier) => tier.preview?.id === summary?.id,
		);
		expect(tierDefinition).toBeDefined();
		if (tierDefinition) {
			const { entries } = buildTierEntries(
				[tierDefinition],
				tierDefinition.id,
				ctx,
				translationContext,
			);
			expect(hoverCard?.effects).toEqual(entries);
		}
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
		const { mockGame, handleHoverCard } = createPassiveGame(ctx);
		currentGame = mockGame;
		const view = render(<PassiveDisplay player={ctx.activePlayer} />);
		const { container } = view;
		const [summary] = ctx.passives.list(ctx.activePlayer.id);
		expect(summary).toBeDefined();
		const definitions = ctx.passives.values(ctx.activePlayer.id);
		const definition = definitions.find((def) => def.id === summary?.id);
		expect(definition).toBeDefined();
		const presentation = resolvePassivePresentation(summary!, { definition });
		expect(presentation.removal).toBeDefined();
		const hoverTarget = container.querySelector('div.hoverable');
		expect(hoverTarget).not.toBeNull();
		fireEvent.mouseEnter(hoverTarget!);
		expect(handleHoverCard).toHaveBeenCalled();
		const lastCall = handleHoverCard.mock.calls.at(-1);
		expect(lastCall).toBeDefined();
		expect(lastCall?.[0]?.description).toBeUndefined();
		const removalToken = summary?.meta?.removal?.token;
		if (removalToken) {
			expect(presentation.removal).toBe(formatPassiveRemoval(removalToken));
		}
		const logDetails = resolvePassivePresentation(summary!);
		expect(logDetails.removal).toBe(presentation.removal);
		expect(logDetails.label).toBe(presentation.label);
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
		
		const { mockGame } = createPassiveGame(ctx);
		currentGame = mockGame;

		const view = render(<PassiveDisplay player={ctx.activePlayer} />);
		const { container } = view;

		expect(container).toBeEmptyDOMElement();
	});

	it('omits building-derived passives from the panel', () => {
		const ctx = createEngine({
			actions: ACTIONS,
			buildings: BUILDINGS,
			developments: DEVELOPMENTS,
			populations: POPULATIONS,
			phases: PHASES,
			start: GAME_START,
			rules: RULES,
		});
		runEffects(
			[
				{
					type: 'building',
					method: 'add',
					params: { id: 'castle_walls' },
				},
			],
			ctx,
		);

		const { mockGame } = createPassiveGame(ctx);
		currentGame = mockGame;

		const view = render(<PassiveDisplay player={ctx.activePlayer} />);
		expect(view.container.querySelector('div.hoverable')).toBeNull();
		const text = view.container.textContent ?? '';
		expect(text).not.toContain('Castle Walls');
		expect(text).not.toContain('castle_walls_bonus');
	});
});
