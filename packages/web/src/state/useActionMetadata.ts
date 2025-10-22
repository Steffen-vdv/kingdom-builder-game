import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
	SessionPlayerId,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import { useGameEngine } from './GameContext';
import {
	readSessionActionMetadata,
	subscribeSessionActionMetadata,
} from './sessionActionMetadataStore';
import {
	loadActionCosts,
	loadActionOptions,
	loadActionRequirements,
} from './sessionSdk';
import { serializeActionParams } from './actionMetadataKey';
import type { SessionActionMetadataSnapshot } from './sessionTypes';
import { isAbortError } from './isAbortError';

interface UseActionMetadataOptions {
	actionId: string | null | undefined;
	params?: ActionParametersPayload;
	playerId?: SessionPlayerId;
}

export interface UseActionMetadataResult {
	costs: SessionActionCostMap | undefined;
	requirements: SessionActionRequirementList | undefined;
	groups: ActionEffectGroup[] | undefined;
	loading: {
		costs: boolean;
		requirements: boolean;
		groups: boolean;
	};
}

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

const EMPTY_SNAPSHOT: SessionActionMetadataSnapshot = {};

export function useActionMetadata({
	actionId,
	params,
	playerId,
}: UseActionMetadataOptions): UseActionMetadataResult {
	const { sessionId } = useGameEngine();
	const paramsKey = useMemo(() => serializeActionParams(params), [params]);
	const normalizedParams = useMemo<ActionParametersPayload | undefined>(() => {
		if (!params) {
			return undefined;
		}
		return clone(params);
	}, [paramsKey]);
	const [snapshot, setSnapshot] = useState<SessionActionMetadataSnapshot>(
		() => {
			if (!actionId) {
				return EMPTY_SNAPSHOT;
			}
			return readSessionActionMetadata(
				sessionId,
				actionId,
				normalizedParams,
				playerId,
			);
		},
	);
	const loadingRef = useRef({
		costs: false,
		requirements: false,
		groups: false,
	});

	useEffect(() => {
		loadingRef.current = { costs: false, requirements: false, groups: false };
	}, [actionId, paramsKey, playerId]);

	useEffect(() => {
		if (!actionId) {
			setSnapshot(EMPTY_SNAPSHOT);
			return () => {};
		}
		let disposed = false;
		const unsubscribe = subscribeSessionActionMetadata(
			sessionId,
			actionId,
			normalizedParams,
			playerId,
			(next) => {
				if (!disposed) {
					setSnapshot(next);
				}
			},
		);
		return () => {
			disposed = true;
			unsubscribe();
		};
	}, [sessionId, actionId, normalizedParams, paramsKey, playerId]);

	useEffect(() => {
		if (!actionId) {
			setSnapshot(EMPTY_SNAPSHOT);
			return;
		}
		setSnapshot(
			readSessionActionMetadata(
				sessionId,
				actionId,
				normalizedParams,
				playerId,
			),
		);
	}, [sessionId, actionId, normalizedParams, paramsKey, playerId]);

	useEffect(() => {
		const costsStale = snapshot.stale?.costs === true;
		if (!actionId || (snapshot.costs !== undefined && !costsStale)) {
			return () => {};
		}
		if (loadingRef.current.costs) {
			return () => {};
		}
		const controller = new AbortController();
		let active = true;
		loadingRef.current.costs = true;
		void loadActionCosts(
			sessionId,
			actionId,
			normalizedParams,
			{ signal: controller.signal },
			playerId,
		)
			.catch((error) => {
				if (isAbortError(error)) {
					return;
				}
				throw error;
			})
			.finally(() => {
				if (!active) {
					return;
				}
				loadingRef.current.costs = false;
			});
		return () => {
			active = false;
			controller.abort();
			loadingRef.current.costs = false;
		};
	}, [
		actionId,
		sessionId,
		snapshot.costs,
		normalizedParams,
		paramsKey,
		playerId,
	]);

	useEffect(() => {
		const requirementsStale = snapshot.stale?.requirements === true;
		if (
			!actionId ||
			(snapshot.requirements !== undefined && !requirementsStale)
		) {
			return () => {};
		}
		if (loadingRef.current.requirements) {
			return () => {};
		}
		const controller = new AbortController();
		let active = true;
		loadingRef.current.requirements = true;
		void loadActionRequirements(
			sessionId,
			actionId,
			normalizedParams,
			{ signal: controller.signal },
			playerId,
		)
			.catch((error) => {
				if (isAbortError(error)) {
					return;
				}
				throw error;
			})
			.finally(() => {
				if (!active) {
					return;
				}
				loadingRef.current.requirements = false;
			});
		return () => {
			active = false;
			controller.abort();
			loadingRef.current.requirements = false;
		};
	}, [
		actionId,
		sessionId,
		snapshot.requirements,
		normalizedParams,
		paramsKey,
		playerId,
	]);

	useEffect(() => {
		const groupsStale = snapshot.stale?.groups === true;
		if (!actionId || (snapshot.groups !== undefined && !groupsStale)) {
			return () => {};
		}
		if (loadingRef.current.groups) {
			return () => {};
		}
		const controller = new AbortController();
		let active = true;
		loadingRef.current.groups = true;
		void loadActionOptions(sessionId, actionId, {
			signal: controller.signal,
		})
			.catch((error) => {
				if (isAbortError(error)) {
					return;
				}
				throw error;
			})
			.finally(() => {
				if (!active) {
					return;
				}
				loadingRef.current.groups = false;
			});
		return () => {
			active = false;
			controller.abort();
			loadingRef.current.groups = false;
		};
	}, [actionId, sessionId, snapshot.groups, paramsKey]);

	return useMemo(() => {
		const result: UseActionMetadataResult = {
			costs: snapshot.costs,
			requirements: snapshot.requirements,
			groups: snapshot.groups,
			loading: {
				costs: snapshot.costs === undefined || snapshot.stale?.costs === true,
				requirements:
					snapshot.requirements === undefined ||
					snapshot.stale?.requirements === true,
				groups:
					snapshot.groups === undefined || snapshot.stale?.groups === true,
			},
		};
		return result;
	}, [snapshot]);
}

export type { UseActionMetadataOptions };
