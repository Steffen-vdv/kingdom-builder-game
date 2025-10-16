import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActionEffectGroup } from '@kingdom-builder/protocol';
import type {
	SessionActionCostMap,
	SessionActionRequirementList,
} from '@kingdom-builder/protocol/session';
import type { ActionParametersPayload } from '@kingdom-builder/protocol/actions';
import { useGameEngine } from './GameContext';
import {
	loadActionCosts,
	loadActionOptions,
	loadActionRequirements,
} from './sessionSdk';

interface UseActionMetadataOptions {
	actionId: string;
	params?: ActionParametersPayload;
	enabled?: boolean;
}

export interface UseActionMetadataResult {
	costs: SessionActionCostMap | null;
	requirements: SessionActionRequirementList | null;
	groups: ActionEffectGroup[] | null;
}

const serializePrimitive = (value: unknown): string => {
	if (value === null) {
		return 'null';
	}
	if (value === undefined) {
		return 'undefined';
	}
	if (typeof value !== 'object') {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map((item) => serializePrimitive(item)).join(',')}]`;
	}
	const entries = Object.entries(value as Record<string, unknown>)
		.map(([key, entry]) => [key, entry] as const)
		.sort(([first], [second]) => first.localeCompare(second))
		.map(
			([key, entry]) => `${JSON.stringify(key)}:${serializePrimitive(entry)}`,
		);
	return `{${entries.join(',')}}`;
};

const serializeParams = (params?: ActionParametersPayload): string =>
	serializePrimitive(params ?? null);

export function useActionMetadata({
	actionId,
	params,
	enabled = true,
}: UseActionMetadataOptions): UseActionMetadataResult {
	const { sessionId, session } = useGameEngine();
	const paramsKey = useMemo(() => serializeParams(params), [params]);
	const normalizedParams = useMemo(() => params, [paramsKey]);
	const active = enabled && actionId.length > 0;
	const [revision, setRevision] = useState(0);
	const bump = useCallback(() => {
		setRevision((value) => value + 1);
	}, []);

	useEffect(() => {
		if (!active) {
			return;
		}
		const unsubscribers: Array<() => void> = [];
		unsubscribers.push(
			session.subscribeActionCosts(actionId, normalizedParams, bump),
		);
		unsubscribers.push(
			session.subscribeActionRequirements(actionId, normalizedParams, bump),
		);
		unsubscribers.push(session.subscribeActionOptions(actionId, bump));
		return () => {
			for (const unsubscribe of unsubscribers) {
				unsubscribe();
			}
		};
	}, [session, actionId, normalizedParams, bump, active, paramsKey]);

	useEffect(() => {
		if (!active) {
			return;
		}
		if (!session.hasActionCosts(actionId, normalizedParams)) {
			void loadActionCosts(sessionId, actionId, normalizedParams);
		}
		if (!session.hasActionRequirements(actionId, normalizedParams)) {
			void loadActionRequirements(sessionId, actionId, normalizedParams);
		}
		if (!session.hasActionOptions(actionId)) {
			void loadActionOptions(sessionId, actionId);
		}
	}, [actionId, normalizedParams, session, sessionId, active, paramsKey]);

	return useMemo(() => {
		if (!active) {
			return {
				costs: null,
				requirements: null,
				groups: null,
			} satisfies UseActionMetadataResult;
		}
		const costs = session.hasActionCosts(actionId, normalizedParams)
			? session.getActionCosts(actionId, normalizedParams)
			: null;
		const requirements = session.hasActionRequirements(
			actionId,
			normalizedParams,
		)
			? session.getActionRequirements(actionId, normalizedParams)
			: null;
		const groups = session.hasActionOptions(actionId)
			? session.getActionOptions(actionId)
			: null;
		return { costs, requirements, groups } satisfies UseActionMetadataResult;
	}, [actionId, normalizedParams, session, active, revision]);
}
