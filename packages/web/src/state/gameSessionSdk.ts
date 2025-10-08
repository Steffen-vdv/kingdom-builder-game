import {
	createEngineSession,
	type EngineSession,
	type EngineSessionSnapshot,
	type RuleSnapshot,
} from '@kingdom-builder/engine';
import {
	ACTIONS,
	BUILDINGS,
	DEVELOPMENTS,
	GAME_START,
	PHASES,
	POPULATIONS,
	RULES,
	BuildingId,
} from '@kingdom-builder/contents';
import { initializeDeveloperMode } from './developerModeSetup';

interface CreateSessionOptions {
	devMode?: boolean;
	playerName?: string;
}

interface CreateSessionResult {
	sessionId: string;
	session: EngineSession;
	snapshot: EngineSessionSnapshot;
	ruleSnapshot: RuleSnapshot;
}

let sessionCounter = 0;

const nextSessionId = () => `local-${Date.now()}-${sessionCounter++}`;

const ensurePlayerName = (
	session: EngineSession,
	snapshot: EngineSessionSnapshot,
	desiredName?: string,
): EngineSessionSnapshot => {
	if (!desiredName) {
		return snapshot;
	}
	const primaryPlayer = snapshot.game.players[0];
	if (!primaryPlayer?.id || primaryPlayer.name === desiredName) {
		return snapshot;
	}
	session.updatePlayerName(primaryPlayer.id, desiredName);
	return session.getSnapshot();
};

const ensureDeveloperSetup = (
	session: EngineSession,
	snapshot: EngineSessionSnapshot,
	devMode: boolean,
): EngineSessionSnapshot => {
	if (!devMode) {
		return snapshot;
	}
	const primaryPlayer = snapshot.game.players[0];
	if (!primaryPlayer?.id) {
		return snapshot;
	}
	const hasMill = primaryPlayer.buildings.includes(BuildingId.Mill);
	if (snapshot.game.turn !== 1 || hasMill) {
		return snapshot;
	}
	initializeDeveloperMode(session, primaryPlayer.id);
	return session.getSnapshot();
};

export function createSession({
	devMode = false,
	playerName,
}: CreateSessionOptions = {}): CreateSessionResult {
	const session = createEngineSession({
		actions: ACTIONS,
		buildings: BUILDINGS,
		developments: DEVELOPMENTS,
		populations: POPULATIONS,
		phases: PHASES,
		start: GAME_START,
		rules: RULES,
		devMode,
	});
	session.setDevMode(devMode);
	let snapshot = session.getSnapshot();
	snapshot = ensureDeveloperSetup(session, snapshot, devMode);
	snapshot = ensurePlayerName(session, snapshot, playerName);
	const ruleSnapshot = session.getRuleSnapshot();
	return {
		sessionId: nextSessionId(),
		session,
		snapshot,
		ruleSnapshot,
	};
}

export function fetchSnapshot(session: EngineSession): Promise<{
	snapshot: EngineSessionSnapshot;
	ruleSnapshot: RuleSnapshot;
}> {
	return Promise.resolve({
		snapshot: session.getSnapshot(),
		ruleSnapshot: session.getRuleSnapshot(),
	});
}

export async function releaseSession(_sessionId: string): Promise<void> {
	return Promise.resolve();
}

export type { CreateSessionResult };
