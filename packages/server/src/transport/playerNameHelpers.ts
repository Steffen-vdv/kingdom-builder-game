import type {
	SessionPlayerId,
	SessionPlayerNameMap,
} from '@kingdom-builder/protocol';
import { TransportError } from './TransportTypes.js';

export const PLAYER_NAME_MAX_LENGTH = 40;

export type SanitizedPlayerNameEntry = [SessionPlayerId, string];

export function sanitizePlayerName(playerName: string): string | undefined {
	const sanitizedName = playerName.trim();
	if (!sanitizedName) {
		return undefined;
	}
	if (sanitizedName.length > PLAYER_NAME_MAX_LENGTH) {
		throw new TransportError(
			'INVALID_REQUEST',
			`Player names must be ${PLAYER_NAME_MAX_LENGTH} characters or fewer.`,
		);
	}
	return sanitizedName;
}

export function sanitizePlayerNameEntries(
	names: SessionPlayerNameMap,
): SanitizedPlayerNameEntry[] {
	const entries: SanitizedPlayerNameEntry[] = [];
	const playerIds = Object.keys(names) as SessionPlayerId[];
	for (const playerId of playerIds) {
		const playerName = names[playerId];
		if (playerName === undefined) {
			continue;
		}
		const sanitizedName = sanitizePlayerName(playerName);
		if (!sanitizedName) {
			continue;
		}
		entries.push([playerId, sanitizedName]);
	}
	return entries;
}
