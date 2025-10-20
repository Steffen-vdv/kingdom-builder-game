import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import { getRemoteAdapter, waitForRemoteAdapter } from './remoteSessionAdapter';
import { isAbortError } from './isAbortError';
import type { SessionActionMetadataSnapshot } from './sessionTypes';

const EMPTY_SNAPSHOT: SessionActionMetadataSnapshot = {};

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
	const adapter = getRemoteAdapter(sessionId);
	if (adapter) {
		return adapter.subscribeActionMetadata(actionId, params, listener);
	}
	const controller = new AbortController();
	let disposed = false;
	let unsubscribe: (() => void) | null = null;
	void waitForRemoteAdapter(sessionId, { signal: controller.signal })
		.then((resolved) => {
			if (disposed) {
				return;
			}
			unsubscribe = resolved.subscribeActionMetadata(
				actionId,
				params,
				listener,
			);
		})
		.catch((error) => {
			if (isAbortError(error)) {
				return;
			}
			throw error;
		});
	return () => {
		disposed = true;
		controller.abort();
		if (unsubscribe) {
			unsubscribe();
		}
	};
}

export function setSessionActionCosts(
	sessionId: string,
	actionId: string,
	costs: SessionActionCostMap,
	params?: ActionParametersPayload,
): void {
	const adapter = getRemoteAdapter(sessionId);
	if (!adapter) {
		return;
	}
	adapter.setActionCosts(actionId, costs, params);
}

export function setSessionActionRequirements(
	sessionId: string,
	actionId: string,
	requirements: SessionActionRequirementList,
	params?: ActionParametersPayload,
): void {
	const adapter = getRemoteAdapter(sessionId);
	if (!adapter) {
		return;
	}
	adapter.setActionRequirements(actionId, requirements, params);
}

export function setSessionActionOptions(
	sessionId: string,
	actionId: string,
	groups: ActionEffectGroup[],
): void {
	const adapter = getRemoteAdapter(sessionId);
	if (!adapter) {
		return;
	}
	adapter.setActionOptions(actionId, groups);
}
