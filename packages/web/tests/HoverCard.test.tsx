/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import HoverCard from '../src/components/HoverCard';
import {
	createSnapshotPlayer,
	createSessionSnapshot,
} from './helpers/sessionFixtures';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createPassiveGame } from './helpers/createPassiveDisplayGame';
import { ACTION_EFFECT_DELAY } from '../src/state/useGameLog';
import { useActionResolution } from '../src/state/useActionResolution';
import { formatPhaseResolution } from '../src/state/formatPhaseResolution';
import { createTranslationDiffContext } from '../src/translation/log/resourceSources/context';
import type { PlayerSnapshot } from '../src/translation';
import { createContentFactory } from '@kingdom-builder/testing';
import type { EngineAdvanceResult } from '@kingdom-builder/engine';

type HoverCardScenario = ReturnType<typeof createHoverCardScenario>;

function createHoverCardScenario() {
	const { registries, metadata, phases, ruleSnapshot } =
		createTestSessionScaffold();
	const resourceKeys = Object.keys(registries.resources);
	const activePlayer = createSnapshotPlayer({
		id: 'player-1',
		name: 'Player One',
		resources: resourceKeys.reduce<Record<string, number>>(
			(acc, key, index) => {
				acc[key] = index + 2;
				return acc;
			},
			{},
		),
	});
	const opponent = createSnapshotPlayer({
		id: 'player-2',
		name: 'Player Two',
	});
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId: activePlayer.id,
		opponentId: opponent.id,
		phases,
		actionCostResource: ruleSnapshot.tieredResourceKey,
		ruleSnapshot,
		metadata,
	});
	const { mockGame } = createPassiveGame(sessionState, {
		registries,
		metadata,
		ruleSnapshot,
	});
	return {
		mockGame,
		registries,
		metadata,
		actionCostResource: sessionState.actionCostResource,
		translationContext: mockGame.translationContext,
		sessionState,
	};
}

let scenario: HoverCardScenario;
let mockGame: HoverCardScenario['mockGame'];

vi.mock('../src/state/GameContext', () => ({
	useGameEngine: () => mockGame,
}));

function resetHoverState() {
	mockGame.hoverCard = null;
}

beforeEach(() => {
	scenario = createHoverCardScenario();
	mockGame = scenario.mockGame;
	resetHoverState();
});

afterEach(() => {
	resetHoverState();
	vi.useRealTimers();
});

describe('<HoverCard />', () => {
	it('renders hover card details from context', () => {
		const costResourceKey = Object.keys(scenario.registries.resources).find(
			(key) => key !== scenario.actionCostResource,
		);
		const resolvedCostKey = costResourceKey ?? scenario.actionCostResource;
		const costIcon =
			scenario.translationContext.assets.resources[resolvedCostKey]?.icon ?? '';
		mockGame.hoverCard = {
			title: 'Construct Fortress',
			effects: ['Raise new defenses.'],
			requirements: ['Requires stone reserves.'],
			costs: { [resolvedCostKey]: 3 },
		};
		render(<HoverCard />);
		expect(screen.getByText('Construct Fortress')).toBeInTheDocument();
		expect(screen.getByText(`${costIcon}3`)).toBeInTheDocument();
		expect(screen.getByText('Requires stone reserves.')).toBeInTheDocument();
	});

	it('omits the Free label when hover data has no costs', () => {
		mockGame.hoverCard = {
			title: 'Population',
			effects: ['Add a new citizen.'],
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
		const activePlayer = mockGame.sessionView.active;
		if (!activePlayer) {
			throw new Error('Expected active player in session view.');
		}
		const resolutionSource = {
			kind: 'action' as const,
			label: 'Action',
			id: 'action.test',
			name: 'Test Action',
			icon: '🛠️',
		};
		let resolutionPromise: Promise<void> = Promise.resolve();
		act(() => {
			resolutionPromise = mockGame.showResolution({
				lines: ['First reveal', 'Second reveal'],
				player: { id: activePlayer.id, name: activePlayer.name },
				source: resolutionSource,
				actorLabel: 'Played by',
			});
		});
		const continueButton = screen.getByRole('button', { name: 'Continue' });
		expect(continueButton).toBeDisabled();
		const resolutionSteps =
			screen.getByText('Resolution steps').nextElementSibling;
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
		const activePlayer = mockGame.sessionView.active;
		if (!activePlayer) {
			throw new Error('Expected active player for phase resolution test.');
		}
		const availableKeys = Object.keys(scenario.registries.resources);
		const resourceKey =
			availableKeys.find((key) => key !== scenario.actionCostResource) ??
			scenario.actionCostResource;
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
			id: activePlayer.id,
			name: activePlayer.name,
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
					params: { key: resourceKey, amount: 3 },
				},
			],
			player: sessionPlayer,
		};
		const factory = createContentFactory();
		const diffContext = createTranslationDiffContext({
			activePlayer: {
				id: activePlayer.id,
				population: {},
				lands: [],
			},
			buildings: factory.buildings,
			developments: factory.developments,
			passives: { evaluationMods: new Map(), get: () => undefined },
			assets: scenario.translationContext.assets,
		});
		let resolutionPromise: Promise<void> = Promise.resolve();
		const formatted = formatPhaseResolution({
			advance,
			before,
			after,
			phaseDefinition,
			stepDefinition,
			diffContext,
			resourceKeys: [resourceKey],
		});
		act(() => {
			resolutionPromise = mockGame.showResolution({
				lines: formatted.lines,
				summaries: formatted.summaries,
				source: formatted.source,
				player: { id: sessionPlayer.id, name: sessionPlayer.name },
				actorLabel: formatted.actorLabel,
			});
		});
		const resolvedSourceLabel =
			typeof formatted.source === 'object' && formatted.source
				? (formatted.source.label ?? 'Phase')
				: 'Phase';
		const headerMatcher = (text: string) => {
			if (!text.includes(resolvedSourceLabel)) {
				return false;
			}
			if (formatted.actorLabel) {
				return text.includes(formatted.actorLabel);
			}
			return true;
		};
		const headerMatches = screen.getAllByText(headerMatcher);
		expect(headerMatches.length).toBeGreaterThan(0);
		expect(
			headerMatches.some((element) =>
				(element.textContent ?? '').includes(' - '),
			),
		).toBe(true);
		if (typeof formatted.source === 'object') {
			expect(mockGame.resolution?.source).toEqual(formatted.source);
		}
		if (formatted.actorLabel) {
			expect(mockGame.resolution?.actorLabel).toBe(formatted.actorLabel);
		}
		act(() => {
			vi.runAllTimers();
		});
		act(() => {
			mockGame.acknowledgeResolution();
		});
		await expect(resolutionPromise).resolves.toBeUndefined();
		expect(mockGame.resolution).toBeNull();
		expect(addLog).toHaveBeenCalled();
	});
});
