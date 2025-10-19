import { vi } from 'vitest';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
	SessionPlayerId,
	SimulateUpcomingPhasesOptions,
	SimulateUpcomingPhasesResult,
} from '@kingdom-builder/protocol/session';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionMetadataSnapshot,
	SessionAdapter,
} from '../../src/state/sessionTypes';

interface ActionsPanelStateOptions {
	actionCostResource: string;
	phaseId: string;
	session?: SessionAdapter;
}

export function createActionsPanelState({
	actionCostResource,
	phaseId,
	session,
}: ActionsPanelStateOptions) {
	const defaultSimulation: SimulateUpcomingPhasesResult = {
		delta: { resources: {}, stats: {}, population: {} },
		playerId: 'player-forecast' as SessionPlayerId,
		before: {
			id: 'player-forecast' as SessionPlayerId,
			name: 'Forecaster',
			resources: {},
			stats: {},
			population: {},
			statsHistory: {},
			lands: [],
			buildings: [],
			actions: [],
			statSources: {},
			skipPhases: {},
			skipSteps: {},
			passives: [],
		},
		after: {
			id: 'player-forecast' as SessionPlayerId,
			name: 'Forecaster',
			resources: {},
			stats: {},
			population: {},
			statsHistory: {},
			lands: [],
			buildings: [],
			actions: [],
			statSources: {},
			skipPhases: {},
			skipSteps: {},
			passives: [],
		},
		steps: [],
	};

	const readMetadata = session
		? (
				actionId: string,
				params?: ActionParametersPayload,
			): SessionActionMetadataSnapshot =>
				session.readActionMetadata(actionId, params)
		: vi.fn<
				(
					actionId: string,
					params?: ActionParametersPayload,
				) => SessionActionMetadataSnapshot
			>(() => ({}));
	const subscribeMetadata = session
		? (
				actionId: string,
				params: ActionParametersPayload | undefined,
				listener: (snapshot: SessionActionMetadataSnapshot) => void,
			) => session.subscribeActionMetadata(actionId, params, listener)
		: vi.fn<
				(
					actionId: string,
					params: ActionParametersPayload | undefined,
					listener: (snapshot: SessionActionMetadataSnapshot) => void,
				) => () => void
			>(() => () => {});
	const getCosts = session
		? (actionId: string, params?: ActionParametersPayload) =>
				session.getActionCosts(actionId, params)
		: vi.fn<
				(
					actionId: string,
					params?: ActionParametersPayload,
				) => SessionActionCostMap
			>(() => ({}));
	const getRequirements = session
		? (actionId: string, params?: ActionParametersPayload) =>
				session.getActionRequirements(actionId, params)
		: vi.fn<
				(
					actionId: string,
					params?: ActionParametersPayload,
				) => SessionActionRequirementList
			>(() => []);
	const enqueueTask = session
		? session.enqueue.bind(session)
		: vi.fn(<T>(task: () => Promise<T> | T) => Promise.resolve().then(task));
	return {
		log: [],
		hoverCard: null,
		handleHoverCard: vi.fn(),
		clearHoverCard: vi.fn(),
		phase: {
			currentPhaseId: phaseId,
			isActionPhase: true,
			canEndTurn: true,
			isAdvancing: false,
		},
		actionCostResource,
		requests: {
			performAction: vi.fn().mockResolvedValue(undefined),
			advancePhase: vi.fn().mockResolvedValue(undefined),
			refreshSession: vi.fn().mockResolvedValue(undefined),
			hasAiController: session
				? (playerId: SessionPlayerId) => session.hasAiController(playerId)
				: vi.fn<[SessionPlayerId], boolean>().mockReturnValue(false),
			readActionMetadata: readMetadata,
			subscribeActionMetadata: subscribeMetadata,
			getActionCosts: getCosts,
			getActionRequirements: getRequirements,
			enqueueTask,
			simulateUpcomingPhases: session
				? (
						playerId: SessionPlayerId,
						options?: SimulateUpcomingPhasesOptions,
					) => session.simulateUpcomingPhases(playerId, options)
				: vi.fn<
						(
							playerId: SessionPlayerId,
							options?: SimulateUpcomingPhasesOptions,
						) => SimulateUpcomingPhasesResult
					>(() => defaultSimulation),
		},
		runUntilActionPhase: vi.fn(),
		refreshPhaseState: vi.fn(),
		darkMode: false,
		onToggleDark: vi.fn(),
		resolution: null,
		showResolution: vi.fn().mockResolvedValue(undefined),
		acknowledgeResolution: vi.fn(),
		timeScale: 1,
		setTimeScale: vi.fn(),
	} as const;
}
