/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import HoverCard from '../src/components/HoverCard';
import {
	createEngine,
	getActionCosts,
	getActionRequirements,
} from '@kingdom-builder/engine';
import {
	RESOURCES,
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	POPULATIONS,
	PHASES,
	GAME_START,
	RULES,
} from '@kingdom-builder/contents';
import { createTranslationContext } from '../src/translation/context';
import { translateRequirementFailure } from '../src/translation';
import { snapshotEngine } from '../../engine/src/runtime/engine_snapshot';
import { selectSessionView } from '../src/state/sessionSelectors';
import { createSessionRegistries } from './helpers/sessionRegistries';
import {
	useActionResolution,
	type ActionResolution,
} from '../src/state/useActionResolution';
import { ACTION_EFFECT_DELAY } from '../src/state/useGameLog';

vi.mock('@kingdom-builder/engine', async () => {
	return await import('../../engine/src');
});

const engineContext = createEngine({
	actions: ACTIONS,
	buildings: BUILDINGS,
	developments: DEVELOPMENTS,
	populations: POPULATIONS,
	phases: PHASES,
	start: GAME_START,
	rules: RULES,
});
const engineSnapshot = snapshotEngine(engineContext);
const actionCostResource = engineSnapshot.actionCostResource;
const sessionRegistries = createSessionRegistries();
const sessionView = selectSessionView(engineSnapshot, sessionRegistries);
const translationContext = createTranslationContext(
	engineSnapshot,
	sessionRegistries,
	engineSnapshot.metadata,
	{
		ruleSnapshot: engineSnapshot.rules,
		passiveRecords: engineSnapshot.passiveRecords,
	},
);

const findActionWithReq = () => {
	for (const [id] of (ACTIONS as unknown as { map: Map<string, unknown> })
		.map) {
		const failures = getActionRequirements(id, engineContext);
		const requirements = failures.map((failure) =>
			translateRequirementFailure(failure, engineContext),
		);
		const costs = getActionCosts(id, engineContext);
		if (
			requirements.length &&
			Object.keys(costs).some((costKey) => costKey !== actionCostResource)
		) {
			return { id, requirements, costs } as const;
		}
	}
	return { id: '', requirements: [], costs: {} } as const;
};
const actionData = findActionWithReq();
const mockGame = {
	session: {
		getActionCosts: vi.fn(),
		getActionRequirements: vi.fn(),
		getActionOptions: vi.fn(),
	},
	sessionState: engineSnapshot,
	sessionView,
	translationContext,
	ruleSnapshot: engineSnapshot.rules,
	log: [],
	logOverflowed: false,
	hoverCard: null as unknown as {
		title: string;
		effects: unknown[];
		requirements: string[];
		costs?: Record<string, number>;
	} | null,
	handleHoverCard: vi.fn(),
	clearHoverCard: vi.fn(),
	phase: {
		currentPhaseId: engineSnapshot.game.currentPhase,
		isActionPhase: Boolean(
			engineSnapshot.phases[engineSnapshot.game.phaseIndex]?.action,
		),
		canEndTurn: true,
		isAdvancing: false,
	},
	actionCostResource,
	handlePerform: vi.fn().mockResolvedValue(undefined),
	runUntilActionPhase: vi.fn(),
	handleEndTurn: vi.fn().mockResolvedValue(undefined),
	refreshPhaseState: vi.fn(),
	darkMode: false,
	onToggleDark: vi.fn(),
	resolution: null as ActionResolution | null,
	showResolution: vi.fn().mockResolvedValue(undefined),
	acknowledgeResolution: vi.fn(),
};

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

function resetResolutionState() {
	mockGame.hoverCard = null;
	mockGame.resolution = null;
	mockGame.showResolution = vi.fn().mockResolvedValue(undefined);
	mockGame.acknowledgeResolution = vi.fn();
}

beforeEach(() => {
	resetResolutionState();
});

afterEach(() => {
	resetResolutionState();
	vi.useRealTimers();
});

describe('<HoverCard />', () => {
	it('renders hover card details from context', () => {
		const { id, requirements, costs } = actionData;
		const actionDefinition = ACTIONS.get(id);
		const title = `${actionDefinition.icon} ${actionDefinition.name}`;
		mockGame.hoverCard = {
			title,
			effects: [],
			requirements,
			costs,
		};
		render(<HoverCard />);
		expect(screen.getByText(title)).toBeInTheDocument();
		const costResource = Object.keys(costs).find(
			(costKey) => costKey !== actionCostResource,
		)!;
		const costIcon = RESOURCES[costResource].icon;
		expect(
			screen.getByText(`${costIcon}${costs[costResource]}`),
		).toBeInTheDocument();
		expect(screen.getByText(requirements[0]!)).toBeInTheDocument();
	});

	it('omits the Free label when hover data has no costs', () => {
		mockGame.hoverCard = {
			title: 'Population',
			effects: [],
			requirements: [],
			description: 'Details about population.',
		};
		render(<HoverCard />);
		expect(screen.queryByText('Free')).not.toBeInTheDocument();
	});

	it('disables acknowledgement until the final resolution step', async () => {
		vi.useFakeTimers();
		const ResolutionHarness = () => {
			const timeScaleRef = React.useRef(1);
			const mountedRef = React.useRef(true);
			React.useEffect(() => {
				return () => {
					mountedRef.current = false;
				};
			}, []);
			const { resolution, showResolution, acknowledgeResolution } =
				useActionResolution({
					addLog: vi.fn(),
					setTrackedTimeout: (callback, delay) =>
						window.setTimeout(callback, delay),
					timeScaleRef,
					mountedRef,
				});
			mockGame.resolution = resolution;
			mockGame.showResolution = showResolution;
			mockGame.acknowledgeResolution = acknowledgeResolution;
			return <HoverCard />;
		};
		render(<ResolutionHarness />);
		let resolutionPromise: Promise<void> = Promise.resolve();
		const activePlayerView = mockGame.sessionView.active;
		if (!activePlayerView) {
			throw new Error('Expected active player in session view');
		}
		const actionDefinition = ACTIONS.get(actionData.id);
		if (!actionDefinition) {
			throw new Error('Expected action definition for resolution test');
		}
		const resolutionSource = {
			kind: 'action' as const,
			label: 'Action',
			id: actionDefinition.id,
			name: actionDefinition.name,
			icon: actionDefinition.icon,
		};
		act(() => {
			resolutionPromise = mockGame.showResolution({
				lines: ['First reveal', 'Second reveal'],
				player: {
					id: activePlayerView.id,
					name: activePlayerView.name,
				},
				action: {
					id: actionDefinition.id,
					name: actionDefinition.name,
					icon: actionDefinition.icon,
				},
				source: resolutionSource,
				actorLabel: 'Played by',
			});
		});
		const continueButton = screen.getByRole('button', {
			name: 'Continue',
		});
		expect(continueButton).toBeDisabled();
		const resolutionSteps =
			screen.getByText('Resolution steps').nextElementSibling;
		expect(resolutionSteps).not.toBeNull();
		expect(resolutionSteps?.textContent ?? '').toContain('First reveal');
		expect(screen.queryByText('Second reveal')).not.toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(ACTION_EFFECT_DELAY - 1);
		});
		expect(continueButton).toBeDisabled();
		expect(screen.queryByText('Second reveal')).not.toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(screen.getByText('Second reveal')).toBeInTheDocument();
		expect(mockGame.resolution?.source).toEqual(resolutionSource);
		expect(mockGame.resolution?.actorLabel).toBe('Played by');
		expect(continueButton).not.toBeDisabled();
		act(() => {
			mockGame.acknowledgeResolution();
		});
		await expect(resolutionPromise).resolves.toBeUndefined();
		expect(mockGame.resolution).toBeNull();
	});
});
