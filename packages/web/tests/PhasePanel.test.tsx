/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import PhasePanel from '../src/components/phases/PhasePanel';
import type { PhaseStep } from '../src/state/phaseTypes';
import { createEngine } from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import { createTranslationContext } from '../src/translation/context';
import { snapshotEngine } from '../../engine/src/runtime/engine_snapshot';

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
const handleHoverCard = vi.fn();
const clearHoverCard = vi.fn();
const handlePerform = vi.fn().mockResolvedValue(undefined);
const runUntilActionPhase = vi.fn();
const handleEndTurn = vi.fn().mockResolvedValue(undefined);
const updateMainPhaseStep = vi.fn();
const onToggleDark = vi.fn();
const onToggleMusic = vi.fn();
const onToggleSound = vi.fn();

function createPhaseHistories(): Record<string, PhaseStep[]> {
	return Object.fromEntries(
		ctx.phases.map((phase) => [
			phase.id,
			[
				{
					title: `${phase.label} Step`,
					items: [{ text: `${phase.icon} ${phase.label}` }],
					active: false,
				},
			],
		]),
	) as Record<string, PhaseStep[]>;
}

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => {
		const [displayPhase, setDisplayPhase] = React.useState(
			ctx.game.currentPhase,
		);
		const [phaseSteps, setPhaseSteps] = React.useState<PhaseStep[]>([]);
		const [phaseHistories] =
			React.useState<Record<string, PhaseStep[]>>(createPhaseHistories);
		return {
			ctx,
			translationContext,
			log: [],
			hoverCard: null,
			handleHoverCard,
			clearHoverCard,
			phaseSteps,
			setPhaseSteps,
			phaseTimer: 0,
			mainApStart: 0,
			displayPhase,
			setDisplayPhase,
			phaseHistories,
			tabsEnabled: true,
			actionCostResource,
			handlePerform,
			runUntilActionPhase,
			handleEndTurn,
			updateMainPhaseStep,
			darkMode: false,
			onToggleDark,
			musicEnabled: true,
			onToggleMusic,
			soundEnabled: true,
			onToggleSound,
		};
	},
}));

beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
		value: vi.fn(),
		writable: true,
	});
});

describe('<PhasePanel />', () => {
	it('displays current turn and phases', () => {
		render(<PhasePanel />);
		const turnText = `Turn ${ctx.game.turn}`;
		const turnElement = screen.getByText(turnText);
		const turnContainer = turnElement.closest('div');
		expect(turnContainer).toBeTruthy();
		if (turnContainer) {
			expect(
				within(turnContainer).getByText(ctx.activePlayer.name),
			).toBeInTheDocument();
		}
		const firstPhase = ctx.phases[0];
		const firstPhaseButton = screen.getByRole('button', {
			name: firstPhase.label,
		});
		expect(firstPhaseButton).toBeInTheDocument();
		expect(
			within(firstPhaseButton).getByText(firstPhase.icon),
		).toBeInTheDocument();
	});

	it('highlights a phase when manually selected', () => {
		render(<PhasePanel />);
		const targetPhase = ctx.phases[1];
		const candidates = screen.getAllByRole('button', {
			name: targetPhase.label,
		});
		const targetButton = candidates.find((button) =>
			within(button).queryByText(targetPhase.icon),
		);
		expect(targetButton).toBeDefined();
		if (!targetButton) {
			return;
		}
		fireEvent.click(targetButton);
		expect(targetButton).toHaveClass('bg-gradient-to-r');
		expect(targetButton).toHaveClass('text-white');
	});
});
