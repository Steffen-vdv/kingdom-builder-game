import type { EngineSession } from '@kingdom-builder/engine';
import type {
	SessionPlayerId,
	SessionPlayerNameMap,
} from '@kingdom-builder/protocol';

export function applyPlayerNames(
	session: EngineSession,
	names: SessionPlayerNameMap,
): void {
	const playerIds = Object.keys(names) as SessionPlayerId[];
	for (const playerId of playerIds) {
		const playerName = names[playerId];
		const sanitizedName = playerName?.trim();
		if (!sanitizedName) {
			continue;
		}
		session.updatePlayerName(playerId, sanitizedName);
	}
}
