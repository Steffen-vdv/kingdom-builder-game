import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type { SessionActionCostMap } from '@kingdom-builder/protocol/session';
import { useGameEngine } from '../../state/GameContext';
import {
	readSessionActionMetadata,
	subscribeSessionActionMetadata,
} from '../../state/sessionActionMetadataStore';
import { loadActionCosts } from '../../state/sessionSdk';
import { isAbortError } from '../../state/isAbortError';

interface ActionCostRequest {
	readonly key: string;
	readonly params?: ActionParametersPayload;
}

type CostMap = Map<string, SessionActionCostMap | undefined>;

const cloneParams = (
	params: ActionParametersPayload | undefined,
): ActionParametersPayload | undefined => {
	if (!params) {
		return undefined;
	}
	if (typeof structuredClone === 'function') {
		return structuredClone(params);
	}
	return JSON.parse(JSON.stringify(params)) as ActionParametersPayload;
};

const toRequestsKey = (
	entries: readonly [string, ActionParametersPayload | undefined][],
) => JSON.stringify(entries.map(([key, params]) => [key, params ?? null]));

export function useActionOptionCosts(
	actionId: string | undefined,
	requests: ActionCostRequest[],
): CostMap {
	const { sessionId } = useGameEngine();
	const normalizedRequests = useMemo(() => {
		const map = new Map<string, ActionParametersPayload | undefined>();
		for (const request of requests) {
			if (map.has(request.key)) {
				continue;
			}
			map.set(request.key, cloneParams(request.params));
		}
		return map;
	}, [requests]);
	const requestEntries = useMemo(
		() => [...normalizedRequests.entries()],
		[normalizedRequests],
	);
	const requestKey = useMemo(
		() => toRequestsKey(requestEntries),
		[requestEntries],
	);
	const [costs, setCosts] = useState<CostMap>(() => {
		const map: CostMap = new Map();
		if (!actionId) {
			return map;
		}
		for (const [key, params] of requestEntries) {
			const snapshot = readSessionActionMetadata(sessionId, actionId, params);
			map.set(key, snapshot.costs);
		}
		return map;
	});
	const [staleMap, setStaleMap] = useState<Map<string, boolean>>(() => {
		const map = new Map<string, boolean>();
		if (!actionId) {
			return map;
		}
		for (const [key, params] of requestEntries) {
			const snapshot = readSessionActionMetadata(sessionId, actionId, params);
			map.set(key, snapshot.stale?.costs === true);
		}
		return map;
	});
	useEffect(() => {
		setCosts(() => {
			const map: CostMap = new Map();
			if (!actionId) {
				return map;
			}
			for (const [key, params] of requestEntries) {
				const snapshot = readSessionActionMetadata(sessionId, actionId, params);
				map.set(key, snapshot.costs);
			}
			return map;
		});
		setStaleMap(() => {
			const map = new Map<string, boolean>();
			if (!actionId) {
				return map;
			}
			for (const [key, params] of requestEntries) {
				const snapshot = readSessionActionMetadata(sessionId, actionId, params);
				map.set(key, snapshot.stale?.costs === true);
			}
			return map;
		});
	}, [sessionId, actionId, requestKey, requestEntries]);
	useEffect(() => {
		if (!actionId) {
			return () => {};
		}
		const disposers = requestEntries.map(([key, params]) =>
			subscribeSessionActionMetadata(
				sessionId,
				actionId,
				params,
				(snapshot) => {
					setCosts((previous) => {
						const next: CostMap = new Map(previous);
						next.set(key, snapshot.costs);
						return next;
					});
					setStaleMap((previous) => {
						const next = new Map(previous);
						next.set(key, snapshot.stale?.costs === true);
						return next;
					});
				},
			),
		);
		return () => {
			for (const dispose of disposers) {
				dispose();
			}
		};
	}, [sessionId, actionId, requestKey, requestEntries]);
	const pendingRef = useRef(new Set<string>());
	useEffect(() => {
		if (!actionId) {
			return () => {};
		}
		const pending = pendingRef.current;
		const controllers: Array<{ key: string; controller: AbortController }> = [];
		for (const [key, params] of requestEntries) {
			const isStale = staleMap.get(key) === true;
			if ((costs.get(key) !== undefined && !isStale) || pending.has(key)) {
				continue;
			}
			const controller = new AbortController();
			controllers.push({ key, controller });
			pending.add(key);
			void loadActionCosts(actionId ? sessionId : '', actionId, params, {
				signal: controller.signal,
			})
				.catch((error) => {
					if (isAbortError(error)) {
						return;
					}
					throw error;
				})
				.finally(() => {
					pending.delete(key);
				});
		}
		return () => {
			for (const { key, controller } of controllers) {
				controller.abort();
				pending.delete(key);
			}
		};
	}, [sessionId, actionId, requestKey, requestEntries, costs, staleMap]);
	return costs;
}

export type { ActionCostRequest };
