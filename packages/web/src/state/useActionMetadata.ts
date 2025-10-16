import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import { useGameEngine } from './GameContext';
import {
	getActionCosts as fetchActionCosts,
	getActionOptions as fetchActionOptions,
	getActionRequirements as fetchActionRequirements,
} from './sessionSdk';

const clone = <T>(value: T): T => {
	if (typeof structuredClone === 'function') {
		return structuredClone(value);
	}
	return JSON.parse(JSON.stringify(value)) as T;
};

function paramsKey(params?: ActionParametersPayload): string {
	if (params === undefined) {
		return '__no_params__';
	}
	return JSON.stringify(params);
}

interface ActionMetadataSnapshot {
	costs: SessionActionCostMap;
	requirements: SessionActionRequirementList;
	options: ActionEffectGroup[];
}

export interface UseActionMetadataResult {
	costs: SessionActionCostMap;
	requirements: SessionActionRequirementList;
	options: ActionEffectGroup[];
	getCosts: (params?: ActionParametersPayload) => SessionActionCostMap;
	hasCosts: (params?: ActionParametersPayload) => boolean;
	ensureCosts: (
		params?: ActionParametersPayload,
	) => Promise<SessionActionCostMap>;
	getRequirements: (
		params?: ActionParametersPayload,
	) => SessionActionRequirementList;
	hasRequirements: (params?: ActionParametersPayload) => boolean;
	ensureRequirements: (
		params?: ActionParametersPayload,
	) => Promise<SessionActionRequirementList>;
	getOptions: () => ActionEffectGroup[];
	hasOptions: () => boolean;
	ensureOptions: () => Promise<ActionEffectGroup[]>;
}

export function useActionMetadata(
	actionId: string,
	params?: ActionParametersPayload,
): UseActionMetadataResult {
	const { session, sessionId } = useGameEngine();
	const serializedParams = useMemo(() => paramsKey(params), [params]);
	const defaultParams = useMemo<ActionParametersPayload | undefined>(() => {
		if (params === undefined) {
			return undefined;
		}
		return clone(params);
	}, [serializedParams, params]);
	const subscribe = useCallback(
		(listener: () => void) =>
			session.subscribeActionMetadata(actionId, listener),
		[session, actionId],
	);
	const getSnapshot = useCallback(
		() => session.getActionMetadataVersion(actionId),
		[session, actionId],
	);
	const version = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
	const snapshot = useMemo<ActionMetadataSnapshot>(
		() => ({
			costs: session.getActionCosts(actionId, defaultParams),
			requirements: session.getActionRequirements(actionId, defaultParams),
			options: session.getActionOptions(actionId),
		}),
		[session, actionId, defaultParams, version],
	);
	const getCosts = useCallback(
		(override?: ActionParametersPayload) =>
			session.getActionCosts(actionId, override ?? defaultParams),
		[session, actionId, defaultParams],
	);
	const hasCosts = useCallback(
		(override?: ActionParametersPayload) =>
			session.hasActionCosts(actionId, override ?? defaultParams),
		[session, actionId, defaultParams],
	);
	const ensureCosts = useCallback(
		async (override?: ActionParametersPayload) => {
			const resolved = override ?? defaultParams;
			if (session.hasActionCosts(actionId, resolved)) {
				return session.getActionCosts(actionId, resolved);
			}
			const request = {
				sessionId,
				actionId,
				...(resolved ? { params: resolved } : {}),
			};
			await fetchActionCosts(request);
			return session.getActionCosts(actionId, resolved);
		},
		[session, sessionId, actionId, defaultParams],
	);
	const getRequirements = useCallback(
		(override?: ActionParametersPayload) =>
			session.getActionRequirements(actionId, override ?? defaultParams),
		[session, actionId, defaultParams],
	);
	const hasRequirements = useCallback(
		(override?: ActionParametersPayload) =>
			session.hasActionRequirements(actionId, override ?? defaultParams),
		[session, actionId, defaultParams],
	);
	const ensureRequirements = useCallback(
		async (override?: ActionParametersPayload) => {
			const resolved = override ?? defaultParams;
			if (session.hasActionRequirements(actionId, resolved)) {
				return session.getActionRequirements(actionId, resolved);
			}
			const request = {
				sessionId,
				actionId,
				...(resolved ? { params: resolved } : {}),
			};
			await fetchActionRequirements(request);
			return session.getActionRequirements(actionId, resolved);
		},
		[session, sessionId, actionId, defaultParams],
	);
	const getOptions = useCallback(
		() => session.getActionOptions(actionId),
		[session, actionId],
	);
	const hasOptions = useCallback(
		() => session.hasActionOptions(actionId),
		[session, actionId],
	);
	const ensureOptions = useCallback(async () => {
		if (session.hasActionOptions(actionId)) {
			return session.getActionOptions(actionId);
		}
		const request = { sessionId, actionId };
		await fetchActionOptions(request);
		return session.getActionOptions(actionId);
	}, [session, sessionId, actionId]);
	useEffect(() => {
		void ensureCosts();
		void ensureRequirements();
		void ensureOptions();
	}, [ensureCosts, ensureRequirements, ensureOptions]);
	return {
		costs: snapshot.costs,
		requirements: snapshot.requirements,
		options: snapshot.options,
		getCosts,
		hasCosts,
		ensureCosts,
		getRequirements,
		hasRequirements,
		ensureRequirements,
		getOptions,
		hasOptions,
		ensureOptions,
	};
}
