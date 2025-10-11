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
	type EngineAdvanceResult,
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
	type ResourceKey,
} from '@kingdom-builder/contents';
import { createContentFactory } from '@kingdom-builder/testing';
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
import { formatPhaseResolution } from '../src/state/formatPhaseResolution';
import { createTranslationDiffContext } from '../src/translation/log/resourceSources/context';
import type { PlayerSnapshot } from '../src/translation';

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

	it('renders formatted phase resolutions and logs phase advances', async () => {
		vi.useFakeTimers();
		const addLog = vi.fn();
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
					addLog,
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

		const activePlayerView = mockGame.sessionView.active;
		if (!activePlayerView) {
			throw new Error('Expected active player for phase resolution test');
		}
		const availableResourceKeys = Object.keys(RESOURCES) as Array<
			keyof typeof RESOURCES
		>;
		const resourceKey = (availableResourceKeys.find((key) => {
			return key !== mockGame.actionCostResource;
		}) ?? availableResourceKeys[0]!) as ResourceKey;
		const createPlayerSnapshot = (
			resources: Record<string, number>,
		): PlayerSnapshot => {
			return {
				resources,
				stats: {},
				population: {},
				buildings: [],
				lands: [],
				passives: [],
			};
		};
		const before = createPlayerSnapshot({ [resourceKey]: 2 });
		const after = createPlayerSnapshot({ [resourceKey]: 5 });
		const sessionPlayer: EngineAdvanceResult['player'] = {
			id: activePlayerView.id,
			name: activePlayerView.name,
			resources: { ...after.resources },
			stats: {},
			statsHistory: {},
			population: {},
			lands: [],
			buildings: [],
			actions: [],
			statSources: {},
			skipPhases: {},
			skipSteps: {},
			passives: [],
		};
		const phaseDefinition = {
			id: 'phase_harvest',
			label: 'Dawn',
			icon: '🌅',
			steps: [
				{
					id: 'step_income',
					title: 'Collect tribute',
					effects: [],
				},
			],
		};
		const stepDefinition = phaseDefinition.steps[0]!;
		const advance: EngineAdvanceResult = {
			phase: phaseDefinition.id,
			step: stepDefinition.id,
			effects: [
				{
					type: 'resource',
					method: 'add',
					params: {
						key: resourceKey,
						amount: 3,
					},
				},
			],
			player: sessionPlayer,
		};
		const factory = createContentFactory();
		const diffContext = createTranslationDiffContext({
			activePlayer: {
				id: activePlayerView.id,
				population: {},
				lands: [],
			},
			buildings: factory.buildings,
			developments: factory.developments,
			passives: { evaluationMods: new Map(), get: () => undefined },
		});
		const formatted = formatPhaseResolution({
			advance,
			before,
			after,
			phaseDefinition,
			stepDefinition,
			diffContext,
			resourceKeys: [resourceKey],
		});
		let resolutionPromise: Promise<void> = Promise.resolve();
		act(() => {
			resolutionPromise = mockGame.showResolution({
				lines: formatted.lines,
				summaries: formatted.summaries,
				source: formatted.source,
				player: {
					id: sessionPlayer.id,
					name: sessionPlayer.name,
				},
				actorLabel: formatted.actorLabel,
			});
		});
		const resolvedSourceLabel =
			typeof formatted.source === 'object' && formatted.source
				? (formatted.source.label ?? 'Phase')
				: formatted.source === 'phase'
					? 'Phase'
					: 'Action';
		const expectedHeader = formatted.actorLabel
			? `${resolvedSourceLabel} - ${formatted.actorLabel}`
			: `${resolvedSourceLabel} resolution`;
		expect(screen.getByText(expectedHeader)).toBeInTheDocument();
		expect(
			screen.getByText(`Phase owner ${sessionPlayer.name}`),
		).toBeInTheDocument();
		const continueButton = screen.getByRole('button', {
			name: 'Continue',
		});
		expect(continueButton).toBeDisabled();
		const firstLine = formatted.lines[0]!;
		expect(screen.getByText(firstLine)).toBeInTheDocument();
		expect(addLog).toHaveBeenCalledWith(firstLine, {
			id: sessionPlayer.id,
			name: sessionPlayer.name,
		});
		act(() => {
			vi.advanceTimersByTime(ACTION_EFFECT_DELAY - 1);
		});
		expect(continueButton).toBeDisabled();
		const secondLine = formatted.lines[1]!;
		expect(screen.queryByText(secondLine)).not.toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		const visibleMatches = screen.getAllByText(secondLine);
		expect(visibleMatches.length).toBeGreaterThanOrEqual(2);
		expect(addLog).toHaveBeenCalledWith(secondLine, {
			id: sessionPlayer.id,
			name: sessionPlayer.name,
		});
		expect(continueButton).not.toBeDisabled();
		act(() => {
			mockGame.acknowledgeResolution();
		});
		await expect(resolutionPromise).resolves.toBeUndefined();
		expect(mockGame.resolution).toBeNull();
	});
});
