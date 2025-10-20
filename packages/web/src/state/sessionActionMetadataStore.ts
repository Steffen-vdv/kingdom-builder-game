import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
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
): SessionActionMetadataSnapshot {
	const adapter = getRemoteAdapter(sessionId);
	if (!adapter) {
		return EMPTY_SNAPSHOT;
	}
	return adapter.readActionMetadata(actionId, params);
}

export function subscribeSessionActionMetadata(
	sessionId: string,
	actionId: string,
	params: ActionParametersPayload | undefined,
	listener: (snapshot: SessionActionMetadataSnapshot) => void,
): () => void {
	const adapter = ensureRemoteAdapter(sessionId);
	return adapter.subscribeActionMetadata(actionId, params, listener);
}

export function setSessionActionCosts(
	sessionId: string,
	actionId: string,
	costs: SessionActionCostMap,
	params?: ActionParametersPayload,
): void {
	const adapter = ensureRemoteAdapter(sessionId);
	adapter.setActionCosts(actionId, costs, params);
}

export function setSessionActionRequirements(
	sessionId: string,
	actionId: string,
	requirements: SessionActionRequirementList,
	params?: ActionParametersPayload,
): void {
	const adapter = ensureRemoteAdapter(sessionId);
	adapter.setActionRequirements(actionId, requirements, params);
}

export function setSessionActionOptions(
	sessionId: string,
	actionId: string,
	groups: ActionEffectGroup[],
): void {
	const adapter = ensureRemoteAdapter(sessionId);
	adapter.setActionOptions(actionId, groups);
}
