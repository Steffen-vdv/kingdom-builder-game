import type { EngineSession, PlayerId } from '@kingdom-builder/engine';
import type {
	SessionAdvanceResult,
	SessionSnapshot,
} from '@kingdom-builder/protocol';
import type { SessionManager } from '../session/SessionManager.js';

export interface SessionAiTurnResult {
	ranTurn: boolean;
	snapshot: SessionSnapshot;
	advance?: SessionAdvanceResult;
}

export async function runSessionAiTurn(
	session: EngineSession,
	sessionManager: SessionManager,
	playerId: PlayerId,
): Promise<SessionAiTurnResult> {
	if (!session.hasAiController(playerId)) {
		return {
			ranTurn: false,
			snapshot: sessionManager.captureSnapshot(session),
		};
	}
	let advance: SessionAdvanceResult | undefined;
	const overrides = buildAiOverrides(session, (value) => {
		advance = value;
	});
	const ranTurn = await session.runAiTurn(playerId, overrides);
	const snapshot = sessionManager.captureSnapshot(session);
	const result: SessionAiTurnResult = {
		ranTurn,
		snapshot,
	};
	if (advance) {
		result.advance = advance;
	}
	return result;
}

function buildAiOverrides(
	session: EngineSession,
	onAdvance: (result: SessionAdvanceResult) => void,
): NonNullable<Parameters<EngineSession['runAiTurn']>[1]> {
	return {
		performAction: (actionId, _context, params) => {
			return session.performAction(actionId, params as never);
		},
		advance: () => {
			const result = session.advancePhase();
			onAdvance(result);
			return;
		},
	};
}
