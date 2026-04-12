import type { ActionParametersPayload } from '@boardsmith/protocol/actions';
import type { ActionEffectGroup } from '@boardsmith/protocol';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
	SessionPlayerId,
} from '@boardsmith/protocol/session';
import { ensureGameApi } from './gameApiInstance';
import { runAiTurn } from './sessionSdk';
import {
	getOrCreateRemoteAdapter,
	getRemoteAdapter,
	type RemoteSessionAdapter,
} from './remoteSessionAdapter';
import type { SessionActionMetadataSnapshot } from './sessionTypes';

const EMPTY_SNAPSHOT: SessionActionMetadataSnapshot = {};

function ensureRemoteAdapter(sessionId: string): RemoteSessionAdapter {
	const adapter = getRemoteAdapter(sessionId);
	if (adapter) {
		return adapter;
	}
	return getOrCreateRemoteAdapter(sessionId, {
		ensureGameApi,
		runAiTurn,
	});
}

export function readSessionActionMetadata(
	sessionId: string,
	actionId: string,
	params?: ActionParametersPayload,
	playerId?: SessionPlayerId,
): SessionActionMetadataSnapshot {
	const adapter = getRemoteAdapter(sessionId);
	if (!adapter) {
		return EMPTY_SNAPSHOT;
	}
	return adapter.readActionMetadata(actionId, params, playerId);
}

export function subscribeSessionActionMetadata(
	sessionId: string,
	actionId: string,
	params: ActionParametersPayload | undefined,
	playerId: SessionPlayerId | undefined,
	listener: (snapshot: SessionActionMetadataSnapshot) => void,
): () => void {
	const adapter = ensureRemoteAdapter(sessionId);
	return adapter.subscribeActionMetadata(actionId, params, playerId, listener);
}

export function setSessionActionCosts(
	sessionId: string,
	actionId: string,
	costs: SessionActionCostMap,
	params?: ActionParametersPayload,
	playerId?: SessionPlayerId,
): void {
	const adapter = ensureRemoteAdapter(sessionId);
	adapter.setActionCosts(actionId, costs, params, playerId);
}

export function setSessionActionRequirements(
	sessionId: string,
	actionId: string,
	requirements: SessionActionRequirementList,
	params?: ActionParametersPayload,
	playerId?: SessionPlayerId,
): void {
	const adapter = ensureRemoteAdapter(sessionId);
	adapter.setActionRequirements(actionId, requirements, params, playerId);
}

export function setSessionActionOptions(
	sessionId: string,
	actionId: string,
	groups: ActionEffectGroup[],
): void {
	const adapter = ensureRemoteAdapter(sessionId);
	adapter.setActionOptions(actionId, groups);
}
