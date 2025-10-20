import type { SessionSnapshot } from '@kingdom-builder/protocol/session';
import type { GameApiRequestOptions } from '../services/gameApi';
import { selectSessionOptions } from './sessionSelectors';
import type { SessionRegistries } from './sessionTypes';
import {
	loadActionCosts,
	loadActionOptions,
	loadActionRequirements,
} from './sessionSdk';

interface PrepareSessionActionMetadataOptions {
	signal?: AbortSignal;
}

async function loadMetadataForAction(
	sessionId: string,
	actionId: string,
	requestOptions: GameApiRequestOptions,
): Promise<void> {
	await Promise.all([
		loadActionCosts(sessionId, actionId, undefined, requestOptions),
		loadActionRequirements(sessionId, actionId, undefined, requestOptions),
		loadActionOptions(sessionId, actionId, requestOptions),
	]);
}

export async function prepareSessionActionMetadata(
	sessionId: string,
	snapshot: SessionSnapshot,
	registries: SessionRegistries,
	options: PrepareSessionActionMetadataOptions = {},
): Promise<void> {
	const { actionsByPlayer } = selectSessionOptions(snapshot, registries);
	const actionIds = new Set<string>();
	for (const actionList of actionsByPlayer.values()) {
		for (const action of actionList) {
			if (!action?.id) {
				continue;
			}
			actionIds.add(action.id);
		}
	}
	if (actionIds.size === 0) {
		return;
	}
	const requestOptions: GameApiRequestOptions = options.signal
		? { signal: options.signal }
		: {};
	await Promise.all(
		[...actionIds].map((actionId) =>
			loadMetadataForAction(sessionId, actionId, requestOptions),
		),
	);
}
