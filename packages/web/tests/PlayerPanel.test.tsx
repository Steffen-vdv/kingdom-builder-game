/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PlayerPanel from '../src/components/player/PlayerPanel';
import { createEngine } from '@kingdom-builder/engine';
import {
	RESOURCES,
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
	STATS,
} from '@kingdom-builder/contents';
import { createTranslationContext } from '../src/translation/context';
import { snapshotEngine } from '../../engine/src/runtime/engine_snapshot';
import { formatStatValue } from '../src/utils/stats';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const ctx = createEngine({
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
	rules: RULES,
});
const actionCostResource = ctx.actionCostResource;
const translationContext = createTranslationContext(
	snapshotEngine(ctx),
	{
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
	},
	{
		pullEffectLog: (key) => ctx.pullEffectLog(key),
		passives: ctx.passives,
	},
);
const mockGame = {
	ctx,
	translationContext,
	log: [],
	hoverCard: null,
	handleHoverCard: vi.fn(),
	clearHoverCard: vi.fn(),
	phaseSteps: [],
	setPhaseSteps: vi.fn(),
	phaseTimer: 0,
	mainApStart: 0,
	displayPhase: ctx.game.currentPhase,
	setDisplayPhase: vi.fn(),
	phaseHistories: {},
	tabsEnabled: true,
	actionCostResource,
	handlePerform: vi.fn().mockResolvedValue(undefined),
	runUntilActionPhase: vi.fn(),
	handleEndTurn: vi.fn().mockResolvedValue(undefined),
	updateMainPhaseStep: vi.fn(),
	darkMode: false,
	onToggleDark: vi.fn(),
};

const resourceForecast = Object.keys(RESOURCES).reduce<Record<string, number>>(
	(acc, key, index) => {
		const offset = index + 1;
		acc[key] = index % 2 === 0 ? offset : -offset;
		return acc;
	},
	{},
);

const displayableStatKeys = Object.entries(ctx.activePlayer.stats)
	.filter(([statKey, statValue]) => {
		const info = STATS[statKey as keyof typeof STATS];
		return (
			!info.capacity &&
			(statValue !== 0 || ctx.activePlayer.statsHistory?.[statKey])
		);
	})
	.map(([statKey]) => statKey);

const statForecast = displayableStatKeys.reduce<Record<string, number>>(
	(acc, key, index) => {
		const offset = index + 2;
		acc[key] = index % 2 === 0 ? offset : -offset;
		return acc;
	},
	{},
);

const forecastByPlayerId = {
	[mockGame.ctx.activePlayer.id]: {
		resources: resourceForecast,
		stats: statForecast,
		population: {},
	},
};

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

vi.mock('../src/state/useNextTurnForecast', () => ({
	useNextTurnForecast: () => forecastByPlayerId,
}));

describe('<PlayerPanel />', () => {
	it('renders player name and resource icons', () => {
		render(<PlayerPanel player={ctx.activePlayer} />);
		expect(screen.getByText(ctx.activePlayer.name)).toBeInTheDocument();
		for (const [key, info] of Object.entries(RESOURCES)) {
			const amount = ctx.activePlayer.resources[key] ?? 0;
			expect(screen.getByText(`${info.icon}${amount}`)).toBeInTheDocument();
		}
	});

	it('renders next-turn forecasts with accessible labels', () => {
		expect(displayableStatKeys.length).toBeGreaterThan(0);
		render(<PlayerPanel player={ctx.activePlayer} />);
		const [firstResourceKey] = Object.keys(RESOURCES);
		const resourceInfo = RESOURCES[firstResourceKey];
		const resourceValue = ctx.activePlayer.resources[firstResourceKey] ?? 0;
		const resourceDelta = resourceForecast[firstResourceKey]!;
		const formattedResourceDelta = `${
			resourceDelta > 0 ? '+' : ''
		}${resourceDelta}`;
		const resourceButtons = screen.getAllByRole('button', {
			name: `${resourceInfo.label}: ${resourceValue} (${formattedResourceDelta})`,
		});
		expect(resourceButtons.length).toBeGreaterThan(0);
		const [resourceButton] = resourceButtons;
		const resourceForecastBadge = within(resourceButton).getByText(
			`(${formattedResourceDelta})`,
		);
		expect(resourceForecastBadge).toBeInTheDocument();
		expect(resourceForecastBadge).toHaveClass('text-emerald-300');
		const negativeResourceKey = Object.keys(RESOURCES).find(
			(key) => resourceForecast[key]! < 0,
		);
		if (negativeResourceKey) {
			const negativeResourceInfo = RESOURCES[negativeResourceKey];
			const negativeResourceValue =
				ctx.activePlayer.resources[negativeResourceKey] ?? 0;
			const negativeResourceDelta = resourceForecast[negativeResourceKey]!;
			const formattedNegativeDelta = `${
				negativeResourceDelta > 0 ? '+' : ''
			}${negativeResourceDelta}`;
			const negativeResourceButtons = screen.getAllByRole('button', {
				name: `${negativeResourceInfo.label}: ${negativeResourceValue} (${
					formattedNegativeDelta
				})`,
			});
			expect(negativeResourceButtons.length).toBeGreaterThan(0);
			const [negativeResourceButton] = negativeResourceButtons;
			const negativeForecastBadge = within(negativeResourceButton).getByText(
				`(${formattedNegativeDelta})`,
			);
			expect(negativeForecastBadge).toHaveClass('text-rose-300');
		}
		const [firstStatKey] = displayableStatKeys;
		const statInfo = STATS[firstStatKey as keyof typeof STATS];
		const statValue = ctx.activePlayer.stats[firstStatKey] ?? 0;
		const formattedStatValue = formatStatValue(
			firstStatKey as keyof typeof STATS,
			statValue,
		);
		const statDelta = statForecast[firstStatKey]!;
		const formattedStatDelta = `${statDelta > 0 ? '+' : '-'}${formatStatValue(
			firstStatKey as keyof typeof STATS,
			Math.abs(statDelta),
		)}`;
		const statButtons = screen.getAllByRole('button', {
			name: `${statInfo.label}: ${formattedStatValue} (${formattedStatDelta})`,
		});
		expect(statButtons.length).toBeGreaterThan(0);
		const [statButton] = statButtons;
		const statForecastBadge = within(statButton).getByText(
			`(${formattedStatDelta})`,
		);
		expect(statForecastBadge).toBeInTheDocument();
		expect(statForecastBadge).toHaveClass('text-emerald-300');
	});
});
