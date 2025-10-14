import type { EngineSession } from '@kingdom-builder/engine';
import type {
	SessionRunAiRequest,
	SessionRunAiResponse,
	SessionRunAiOverrides,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import type { SessionManager } from '../session/SessionManager.js';

interface RunAiTurnTaskOptions {
	session: EngineSession;
	sessionManager: SessionManager;
	sessionId: string;
	playerId: SessionRunAiRequest['playerId'];
	overrides?: SessionRunAiOverrides;
}

interface RunAiTurnTaskResult {
	ranTurn: boolean;
	snapshot: SessionSnapshot;
	advance?: SessionRunAiResponse['advance'];
}

export async function runAiTurnTask({
	session,
	sessionManager,
	sessionId,
	playerId,
	overrides,
}: RunAiTurnTaskOptions): Promise<RunAiTurnTaskResult> {
	if (!session.hasAiController(playerId)) {
		const snapshot = sessionManager.getSnapshot(sessionId);
		return { ranTurn: false, snapshot };
	}
	let advanceResult: SessionRunAiResponse['advance'];
	const dependencyOverrides: SessionRunAiOverrides =
		overrides && typeof overrides === 'object' ? { ...overrides } : {};
	dependencyOverrides.advance = () => {
		const advance = session.advancePhase();
		advanceResult = advance;
		return advance;
	};
	const ranTurn = await session.runAiTurn(
		playerId,
		dependencyOverrides as never,
	);
	const snapshot = sessionManager.getSnapshot(sessionId);
	return { ranTurn, snapshot, advance: advanceResult };
}
