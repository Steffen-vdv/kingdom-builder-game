/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
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
import type { ActionResolution } from '../src/state/useActionResolution';
import { ACTION_EFFECT_DELAY } from '../src/state/useGameLog';
import { formatPhaseResolution } from '../src/state/formatPhaseResolution';
import { createTranslationDiffContext } from '../src/translation/log/resourceSources/context';
import type { PlayerSnapshot } from '../src/translation';
import type { SessionPlayerId } from '@kingdom-builder/protocol';
import type { GameEngineContextValue } from '../src/state/GameContext.types';
import type { SessionAdvanceResult } from '@kingdom-builder/protocol/session';
import { createContentFactory } from '@kingdom-builder/testing';

const LEADING_EMOJI_PATTERN =
	/^(?:\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?)*)/u;
function resolvePhaseHeader(label: string | undefined) {
	if (!label) {
		return 'Phase Resolution';
	}
	const sanitized = label
		.replace(LEADING_EMOJI_PATTERN, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
	return sanitized || 'Phase Resolution';
}

interface HoverCardScenario {
	mockGame: GameEngineContextValue;
	costResource: string;
	costIcon: string;
	actionCostResource: string;
	activePlayerId: SessionPlayerId;
	opponentId: SessionPlayerId;
	exampleAction: { id: string; name: string; icon?: string };
	sessionState: ReturnType<typeof createSessionSnapshot>;
}

function createHoverCardScenario(): HoverCardScenario {
	const scaffold = createTestSessionScaffold();
	// Use ungrouped V2 resource IDs from the catalog
	// Resources with groupId = null/undefined are in ResourceBar
	// Resources with a groupId are managed by other components
	const v2ResourceIds = scaffold.resourceCatalogV2.resources.ordered
		.filter((def) => def.groupId === null || def.groupId === undefined)
		.map((def) => def.id);
	const metadata = structuredClone(scaffold.metadata);
	const actionCostResource =
		v2ResourceIds.find(
			(key) => key !== scaffold.ruleSnapshot.tieredResourceKey,
		) ??
		v2ResourceIds[0] ??
		scaffold.ruleSnapshot.tieredResourceKey;
	const costResource =
		v2ResourceIds.find((key) => key !== actionCostResource) ??
		actionCostResource;
	const activePlayerId = 'player-1' as SessionPlayerId;
	const opponentId = 'player-2' as SessionPlayerId;
	const activePlayerResources: Record<string, number> = {
		[actionCostResource]: 1,
	};
	if (costResource !== actionCostResource) {
		activePlayerResources[costResource] = 5;
	}
	const activePlayer = createSnapshotPlayer({
		id: activePlayerId,
		name: 'Player One',
		resources: activePlayerResources,
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
	mockGame.sessionSnapshot = sessionState;
	const translationContext = mockGame.translationContext;
	// Get icon from V2 metadata instead of legacy assets
	const costMetadata = translationContext.resourceMetadataV2.get(costResource);
	const costIcon = costMetadata?.icon ?? '🪙';
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
		mockGame: mockGame as GameEngineContextValue,
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
	useOptionalGameEngine: () => mockGame,
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
	mockGame.requests.advancePhase.mockClear();
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
					addResolutionLog: vi.fn(),
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
		const activePlayerView = mockGame.selectors.sessionView.active;
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

	it('advances the turn when the final action resolution is acknowledged', () => {
		const { actionCostResource } = scenario;
		const activePlayer = mockGame.sessionSnapshot.game.players.find(
			(player) => player.id === mockGame.phase.activePlayerId,
		);
		if (!activePlayer) {
			throw new Error('Expected active player for next turn test');
		}
		activePlayer.valuesV2[actionCostResource] = 0;
		mockGame.phase = {
			...mockGame.phase,
			canEndTurn: true,
			isAdvancing: false,
			isActionPhase: true,
		};
		const resolution: ActionResolution = {
			lines: ['Final action resolves'],
			visibleLines: ['Final action resolves'],
			timeline: [],
			visibleTimeline: [],
			isComplete: true,
			summaries: [],
			source: 'action' as const,
			requireAcknowledgement: true,
			action: {
				id: 'action-id',
				name: 'Final Action',
			},
			player: {
				id: activePlayer.id,
				name: activePlayer.name,
			},
		};
		mockGame.resolution = resolution;
		render(<HoverCard />);
		const nextTurnButton = screen.getByRole('button', {
			name: 'Next Turn',
		});
		fireEvent.click(nextTurnButton);
		expect(mockGame.acknowledgeResolution).toHaveBeenCalledTimes(1);
		expect(mockGame.requests.advancePhase).toHaveBeenCalledTimes(1);
	});

	it('renders formatted phase resolutions and logs phase advances', async () => {
		vi.useFakeTimers();
		const addResolutionLog = vi.fn();
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
					addResolutionLog,
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

		const activePlayerView = mockGame.selectors.sessionView.active;
		if (!activePlayerView) {
			throw new Error('Expected active player for phase resolution test');
		}
		// Use V2 resource IDs from resourceMetadataV2 - ungrouped resources
		// are in the resource bar and suitable for diffing
		const resourceMetadataV2 = mockGame.translationContext.resourceMetadataV2;
		const availableResourceKeys = resourceMetadataV2
			.list()
			.filter((metadata) => metadata.groupId === null)
			.map((metadata) => metadata.id);
		const resourceKey =
			availableResourceKeys.find(
				(key) => key !== scenario.actionCostResource,
			) ?? availableResourceKeys[0]!;
		const createPlayerSnapshot = (
			resources: Record<string, number>,
		): PlayerSnapshot => {
			// Resources are already V2 IDs, copy directly to valuesV2
			return {
				resources,
				stats: {},
				population: {},
				valuesV2: { ...resources },
				resourceBoundsV2: {},
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
			resourceTouchedV2: {},
			valuesV2: {},
			resourceBoundsV2: {},
			population: {},
			lands: [],
			buildings: [],
			actions: [],
			resourceSources: {},
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
			actionCategories: mockGame.translationContext.actionCategories,
			passives: { evaluationMods: new Map(), get: () => undefined },
			assets: mockGame.translationContext.assets,
			resourceMetadataV2: mockGame.translationContext.resourceMetadataV2,
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
		const expectedHeader = resolvePhaseHeader(formatted.actorLabel);
		const headerMatches = screen.getAllByText(expectedHeader);
		expect(headerMatches.length).toBeGreaterThan(0);
		const playerLabels = screen.getAllByLabelText('Player');
		expect(
			playerLabels.some(
				(playerLabel) => playerLabel.textContent === sessionPlayer.name,
			),
		).toBe(true);
		const continueButton = screen.getByRole('button', {
			name: 'Continue',
		});
		expect(continueButton).toBeDisabled();
		const firstLine = formatted.lines[0]!;
		const normalizedHeadlineMatches = screen.getAllByText((content) => {
			const trimmed = content.trim();
			return (
				trimmed === firstLine.trim() ||
				trimmed === resolvePhaseHeader(firstLine)
			);
		});
		expect(normalizedHeadlineMatches.length).toBeGreaterThan(0);
		expect(addResolutionLog).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(ACTION_EFFECT_DELAY - 1);
		});
		expect(continueButton).toBeDisabled();
		const secondLine = formatted.lines[1]!;
		const effectMatcher = (content: string) =>
			content.trim() === secondLine.trim();
		expect(screen.queryByText(effectMatcher)).not.toBeInTheDocument();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		const visibleMatches = screen.getAllByText(effectMatcher);
		expect(visibleMatches.length).toBeGreaterThanOrEqual(1);
		expect(addResolutionLog).toHaveBeenCalledTimes(1);
		const phaseSnapshot = addResolutionLog.mock.calls[0][0];
		expect(phaseSnapshot.lines).toEqual(formatted.lines);
		expect(phaseSnapshot.visibleLines).toEqual(formatted.lines);
		expect(phaseSnapshot.player).toEqual({
			id: sessionPlayer.id,
			name: sessionPlayer.name,
		});
		expect(phaseSnapshot.requireAcknowledgement).toBe(false);
		expect(continueButton).not.toBeDisabled();
		act(() => {
			mockGame.acknowledgeResolution();
		});
		await expect(resolutionPromise).resolves.toBeUndefined();
		expect(mockGame.resolution).toBeNull();
	});
});
