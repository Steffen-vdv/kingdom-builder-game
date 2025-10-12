import type { EngineSession } from '@kingdom-builder/engine';
import type {
	SessionPlayerId,
	SessionPlayerNameMap,
	SessionRequirementFailure,
} from '@kingdom-builder/protocol';
import type { TransportHttpResponse } from './TransportTypes.js';

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

export function extractRequirementFailure(
	error: unknown,
): SessionRequirementFailure | undefined {
	if (!error || typeof error !== 'object') {
		return undefined;
	}
	const failure = (error as { requirementFailure?: SessionRequirementFailure })
		.requirementFailure;
	if (!failure) {
		return undefined;
	}
	return structuredClone(failure);
}

export function attachHttpStatus<T extends object>(
	payload: T,
	status: number,
): TransportHttpResponse<T> {
	Object.defineProperty(payload, 'httpStatus', {
		value: status,
		enumerable: false,
	});
	return payload as TransportHttpResponse<T>;
}
