/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import HoverCard from '../src/components/HoverCard';
import {
	createSessionSnapshot,
	createSnapshotPlayer,
} from './helpers/sessionFixtures';
import { selectSessionView } from '../src/state/sessionSelectors';
import { createTestSessionScaffold } from './helpers/testSessionScaffold';
import { createPassiveGame } from './helpers/createPassiveDisplayGame';
import { useActionResolution } from '../src/state/useActionResolution';
import { ACTION_EFFECT_DELAY } from '../src/state/useGameLog';
import { formatPhaseResolution } from '../src/state/formatPhaseResolution';
import { createTranslationDiffContext } from '../src/translation/log/resourceSources/context';
import type { PlayerSnapshot } from '../src/translation';
import type {
	LegacyGameEngineContextValue,
	PlayerId,
} from '@kingdom-builder/engine';
import type { SessionAdvanceResult } from '@kingdom-builder/protocol/session';
import { createContentFactory } from '@kingdom-builder/testing';

interface HoverCardScenario {
	mockGame: LegacyGameEngineContextValue;
	costResource: string;
	costIcon: string;
	actionCostResource: string;
	activePlayerId: PlayerId;
	opponentId: PlayerId;
	exampleAction: { id: string; name: string; icon?: string };
	sessionState: ReturnType<typeof createSessionSnapshot>;
}

function ensureIconDescriptor(
	metadata: HoverCardScenario['mockGame']['translationContext']['assets']['resources'],
	resourceKey: string,
	fallbackIcon: string,
): string {
	const descriptor = metadata[resourceKey];
	if (descriptor?.icon) {
		return descriptor.icon;
	}
	metadata[resourceKey] = {
		label: descriptor?.label ?? `Resource ${resourceKey}`,
		icon: fallbackIcon,
	};
	return fallbackIcon;
}

function createHoverCardScenario(): HoverCardScenario {
	const scaffold = createTestSessionScaffold();
	const resourceKeys = Object.keys(scaffold.registries.resources);
	const metadata = structuredClone(scaffold.metadata);
	const actionCostResource =
		resourceKeys.find(
			(key) => key !== scaffold.ruleSnapshot.tieredResourceKey,
		) ??
		resourceKeys[0] ??
		scaffold.ruleSnapshot.tieredResourceKey;
	const costResource =
		resourceKeys.find((key) => key !== actionCostResource) ??
		actionCostResource;
	const activePlayerId = 'player-1' as PlayerId;
	const opponentId = 'player-2' as PlayerId;
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: { [costResource]: 5 },
	});
	const opponent = createSnapshotPlayer({ id: opponentId, name: 'Player Two' });
	const sessionState = createSessionSnapshot({
		players: [activePlayer, opponent],
		activePlayerId,
		opponentId,
		phases: scaffold.phases,
		actionCostResource,
		ruleSnapshot: scaffold.ruleSnapshot,
		metadata,
	});
	const { mockGame } = createPassiveGame(sessionState, {
		ruleSnapshot: scaffold.ruleSnapshot,
		registries: scaffold.registries,
		metadata,
	});
	const sessionView = selectSessionView(sessionState, scaffold.registries);
	mockGame.selectors.sessionView = sessionView;
	mockGame.sessionView = sessionView;
	mockGame.sessionState = sessionState;
	const translationContext = mockGame.translationContext;
	const costIcon = ensureIconDescriptor(
		translationContext.assets.resources,
		costResource,
		'🪙',
	);
	const actionEntries = Array.from(scaffold.registries.actions.entries());
	const [exampleActionId, exampleActionDefinition] =
		actionEntries.find(([, definition]) => definition.icon) ??
		actionEntries[0]!;
	const exampleAction = {
		id: exampleActionId,
		name: exampleActionDefinition?.name ?? exampleActionId,
		icon: exampleActionDefinition?.icon,
	};
	return {
		mockGame: mockGame as LegacyGameEngineContextValue,
		costResource,
		costIcon,
		actionCostResource,
		activePlayerId,
		opponentId,
		exampleAction,
		sessionState,
	};
}

let scenario = createHoverCardScenario();
let mockGame = scenario.mockGame;

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
	scenario = createHoverCardScenario();
	mockGame = scenario.mockGame;
	resetResolutionState();
});

afterEach(() => {
	resetResolutionState();
	vi.useRealTimers();
});

describe('<HoverCard />', () => {
	it('renders hover card details from context', () => {
		const { costResource, costIcon } = scenario;
		mockGame.hoverCard = {
			title: '🌱 Expand',
			effects: [],
			requirements: ['Requires fertile land'],
			costs: { [costResource]: 2 },
		};
		render(<HoverCard />);
		expect(screen.getByText('🌱 Expand')).toBeInTheDocument();
		expect(screen.getByText(`${costIcon}2`)).toBeInTheDocument();
		expect(screen.getByText('Requires fertile land')).toBeInTheDocument();
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
		const { exampleAction } = scenario;
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
		const resolutionSource = {
			kind: 'action' as const,
			label: 'Action',
			id: exampleAction.id,
			name: exampleAction.name,
			icon: exampleAction.icon,
		};
		act(() => {
			resolutionPromise = mockGame.showResolution({
				lines: ['First reveal', 'Second reveal'],
				player: {
					id: activePlayerView.id,
					name: activePlayerView.name,
				},
				action: resolutionSource,
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
		const availableResourceKeys = Object.keys(
			mockGame.translationContext.assets.resources,
		);
		const resourceKey =
			availableResourceKeys.find(
				(key) => key !== scenario.actionCostResource,
			) ?? availableResourceKeys[0]!;
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
		const sessionPlayer: SessionAdvanceResult['player'] = {
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
		const advance: SessionAdvanceResult = {
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
			assets: mockGame.translationContext.assets,
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
