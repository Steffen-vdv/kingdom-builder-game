import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import { ensureGameApi } from './gameApiInstance';
import {
	getOrCreateRemoteAdapter,
	type RemoteSessionAdapter,
} from './remoteSessionAdapter';
import { runAiTurn } from './sessionSdk';
import type { SessionActionMetadataSnapshot } from './sessionTypes';

function ensureSessionAdapter(sessionId: string): RemoteSessionAdapter {
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
	return ensureSessionAdapter(sessionId).readActionMetadata(actionId, params);
}

export function subscribeSessionActionMetadata(
	sessionId: string,
	actionId: string,
	params: ActionParametersPayload | undefined,
	listener: (snapshot: SessionActionMetadataSnapshot) => void,
): () => void {
	const adapter = ensureSessionAdapter(sessionId);
	return adapter.subscribeActionMetadata(actionId, params, listener);
}

export function setSessionActionCosts(
	sessionId: string,
	actionId: string,
	costs: SessionActionCostMap,
	params?: ActionParametersPayload,
): void {
	const adapter = ensureSessionAdapter(sessionId);
	adapter.setActionCosts(actionId, costs, params);
}

export function setSessionActionRequirements(
	sessionId: string,
	actionId: string,
	requirements: SessionActionRequirementList,
	params?: ActionParametersPayload,
): void {
	const adapter = ensureSessionAdapter(sessionId);
	adapter.setActionRequirements(actionId, requirements, params);
}

export function setSessionActionOptions(
	sessionId: string,
	actionId: string,
	groups: ActionEffectGroup[],
): void {
	const adapter = ensureSessionAdapter(sessionId);
	adapter.setActionOptions(actionId, groups);
}
