import type {
	SessionPassiveRecordSnapshot,
	SessionPlayerStateSnapshot,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import type { SessionResourceKey } from '../../src/state/sessionTypes';

interface SessionStateHandle {
	sessionState: SessionSnapshot;
}

interface SessionStateOptions {
	primaryResource: SessionResourceKey;
	defaultPhases: SessionSnapshot['phases'];
}

interface SessionOverrides {
	game?: Partial<SessionSnapshot['game']>;
	phases?: SessionSnapshot['phases'];
	metadata?: SessionSnapshot['metadata'];
}

export interface SessionStateHelpers {
	createSessionState(
		players: SessionPlayerStateSnapshot[],
		overrides?: SessionOverrides,
	): SessionSnapshot;
	reset(players: SessionPlayerStateSnapshot[]): void;
	setPlayers(players: SessionPlayerStateSnapshot[]): void;
	setGameState(overrides: Partial<SessionSnapshot['game']>): void;
}

export function createSessionHelpers(
	handle: SessionStateHandle,
	{ primaryResource, defaultPhases }: SessionStateOptions,
): SessionStateHelpers {
	function buildState(
		players: SessionPlayerStateSnapshot[],
		overrides: SessionOverrides = {},
	): SessionSnapshot {
		const { game: gameOverrides = {}, phases = defaultPhases } = overrides;
		const phaseIndex = gameOverrides.phaseIndex ?? 0;
		const phase = phases[phaseIndex] ?? phases[0];
		const defaultPhaseId = phase?.id ?? 'phase-0';
		const [firstPlayer, secondPlayer] = players;
		const activeId =
			gameOverrides.activePlayerId ?? firstPlayer?.id ?? 'player-1';
		const opponentId =
			gameOverrides.opponentId ??
			secondPlayer?.id ??
			firstPlayer?.id ??
			'player-1';
		const passiveRecords: Record<string, SessionPassiveRecordSnapshot[]> = {};
		for (const player of players) {
			passiveRecords[player.id] = [];
		}
		if (!(activeId in passiveRecords)) {
			passiveRecords[activeId] = [];
		}
		if (!(opponentId in passiveRecords)) {
			passiveRecords[opponentId] = [];
		}
		const overridesMetadata = overrides?.metadata;
		const metadata = overridesMetadata
			? structuredClone(overridesMetadata)
			: { passiveEvaluationModifiers: {} };
		return {
			game: {
				turn: gameOverrides.turn ?? 1,
				currentPlayerIndex: gameOverrides.currentPlayerIndex ?? 0,
				currentPhase: gameOverrides.currentPhase ?? defaultPhaseId,
				currentStep: gameOverrides.currentStep ?? 'step-0',
				phaseIndex,
				stepIndex: gameOverrides.stepIndex ?? 0,
				devMode: gameOverrides.devMode ?? false,
				players,
				activePlayerId: activeId,
				opponentId,
			},
			phases,
			actionCostResource: primaryResource,
			recentResourceGains: [],
			compensations: {},
			rules: {
				tieredResourceKey: primaryResource,
				tierDefinitions: [],
				winConditions: [],
			},
			passiveRecords,
			metadata,
		};
	}

	function resetState(players: SessionPlayerStateSnapshot[]) {
		handle.sessionSnapshot = buildState(players);
	}

	function applyPlayers(players: SessionPlayerStateSnapshot[]) {
		const {
			game: { players: _ignored, ...restGame },
			phases,
		} = handle.sessionSnapshot;
		handle.sessionSnapshot = buildState(players, {
			game: restGame,
			phases,
		});
	}

	function applyGameState(overrides: Partial<SessionSnapshot['game']>) {
		const {
			game: { players, ...restGame },
			phases,
		} = handle.sessionSnapshot;
		handle.sessionSnapshot = buildState(players, {
			game: { ...restGame, ...overrides },
			phases,
		});
	}

	return {
		createSessionState: (players, overrides) => buildState(players, overrides),
		reset: (players) => {
			resetState(players);
		},
		setPlayers: (players) => {
			applyPlayers(players);
		},
		setGameState: (overrides) => {
			applyGameState(overrides);
		},
	};
}
