import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import { useGameEngine } from './GameContext';
import {
	getActionCosts as fetchSessionActionCosts,
	getActionOptions as fetchSessionActionOptions,
	getActionRequirements as fetchSessionActionRequirements,
} from './sessionSdk';
import { serializeActionParams } from './actionMetadataCache';

export interface UseActionMetadataOptions {
	params?: ActionParametersPayload;
}

export interface UseActionMetadataResult {
	costs: SessionActionCostMap;
	requirements: SessionActionRequirementList;
	options: ActionEffectGroup[];
	getCachedCosts: (params?: ActionParametersPayload) => SessionActionCostMap;
	getCachedRequirements: (
		params?: ActionParametersPayload,
	) => SessionActionRequirementList;
	getCachedOptions: () => ActionEffectGroup[];
	fetchCosts: (
		params?: ActionParametersPayload,
	) => Promise<SessionActionCostMap>;
	fetchRequirements: (
		params?: ActionParametersPayload,
	) => Promise<SessionActionRequirementList>;
	fetchOptions: () => Promise<ActionEffectGroup[]>;
}

export function useActionMetadata(
	actionId: string,
	options: UseActionMetadataOptions = {},
): UseActionMetadataResult {
	const { session, sessionId } = useGameEngine();
	const paramsKey = useMemo(
		() => serializeActionParams(options.params),
		[options.params],
	);
	const [costs, setCosts] = useState<SessionActionCostMap>(() =>
		session.getActionCosts(actionId, options.params),
	);
	const [requirements, setRequirements] =
		useState<SessionActionRequirementList>(() =>
			session.getActionRequirements(actionId, options.params),
		);
	const [actionOptions, setActionOptions] = useState<ActionEffectGroup[]>(() =>
		session.getActionOptions(actionId),
	);

	useEffect(() => {
		setCosts(session.getActionCosts(actionId, options.params));
		setRequirements(session.getActionRequirements(actionId, options.params));
		setActionOptions(session.getActionOptions(actionId));
	}, [session, actionId, paramsKey]);

	useEffect(() => {
		const unsubscribeCosts = session.subscribeActionCosts(
			actionId,
			options.params,
			setCosts,
		);
		const unsubscribeRequirements = session.subscribeActionRequirements(
			actionId,
			options.params,
			setRequirements,
		);
		const unsubscribeOptions = session.subscribeActionOptions(
			actionId,
			setActionOptions,
		);
		return () => {
			unsubscribeCosts();
			unsubscribeRequirements();
			unsubscribeOptions();
		};
	}, [session, actionId, paramsKey]);

	const fetchCosts = useCallback(
		(params?: ActionParametersPayload) =>
			fetchSessionActionCosts({
				sessionId,
				actionId,
				...(params ? { params } : {}),
			}),
		[sessionId, actionId],
	);
	const fetchRequirements = useCallback(
		(params?: ActionParametersPayload) =>
			fetchSessionActionRequirements({
				sessionId,
				actionId,
				...(params ? { params } : {}),
			}),
		[sessionId, actionId],
	);
	const fetchOptions = useCallback(
		() =>
			fetchSessionActionOptions({
				sessionId,
				actionId,
			}),
		[sessionId, actionId],
	);

	useEffect(() => {
		const load = async () => {
			try {
				await Promise.all([
					fetchCosts(options.params),
					fetchRequirements(options.params),
					fetchOptions(),
				]);
			} catch (error) {
				if (process.env.NODE_ENV !== 'test') {
					console.error('Failed to fetch action metadata.', error);
				}
			}
		};
		void load();
	}, [fetchCosts, fetchRequirements, fetchOptions, paramsKey]);

	const getCachedCosts = useCallback(
		(params?: ActionParametersPayload) =>
			session.getActionCosts(actionId, params),
		[session, actionId],
	);
	const getCachedRequirements = useCallback(
		(params?: ActionParametersPayload) =>
			session.getActionRequirements(actionId, params),
		[session, actionId],
	);
	const getCachedOptions = useCallback(
		() => session.getActionOptions(actionId),
		[session, actionId],
	);

	return {
		costs,
		requirements,
		options: actionOptions,
		getCachedCosts,
		getCachedRequirements,
		getCachedOptions,
		fetchCosts,
		fetchRequirements,
		fetchOptions,
	};
}
