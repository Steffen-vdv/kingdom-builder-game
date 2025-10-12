import type { EngineSession } from '@kingdom-builder/engine';
import {
	SESSION_PLAYER_NAME_MAX_LENGTH,
	type SessionPlayerId,
	type SessionPlayerNameMap,
} from '@kingdom-builder/protocol';
import { TransportError } from './TransportTypes.js';

export function applyPlayerNamesToSession(
	session: EngineSession,
	names: SessionPlayerNameMap,
): void {
	const entries = Object.entries(names) as Array<
		[SessionPlayerId, SessionPlayerNameMap[SessionPlayerId]]
	>;
	for (const [playerId, playerName] of entries) {
		const sanitizedName =
			typeof playerName === 'string' ? playerName.trim() : undefined;
		if (!sanitizedName) {
			continue;
		}
		if (sanitizedName.length > SESSION_PLAYER_NAME_MAX_LENGTH) {
			const message =
				`Player name for player ${playerId} must be ` +
				`no more than ${SESSION_PLAYER_NAME_MAX_LENGTH} characters.`;
			const clippedName = sanitizedName.slice(
				0,
				SESSION_PLAYER_NAME_MAX_LENGTH,
			);
			const violation = {
				code: 'PLAYER_NAME_TOO_LONG',
				playerId,
				maxLength: SESSION_PLAYER_NAME_MAX_LENGTH,
				length: sanitizedName.length,
				clippedName,
			} as const;
			throw new TransportError('INVALID_REQUEST', message, {
				issues: [violation],
			});
		}
		session.updatePlayerName(playerId, sanitizedName);
	}
}
