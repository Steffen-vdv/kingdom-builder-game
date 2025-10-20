import { useCallback, useEffect, useState } from 'react';
import type {
	SessionMetadataSnapshot,
	SessionSnapshotMetadata,
} from '@kingdom-builder/protocol/session';
import { ensureGameApi } from './gameApiInstance';
import {
	deserializeSessionRegistries,
	type SessionRegistries,
} from './sessionRegistries';
import { clone } from './clone';
import {
	formatFailureDetails,
	type SessionFailureDetails,
} from './sessionFailures';

interface OverviewMetadataSnapshot {
	registries: SessionRegistries;
	metadata: SessionSnapshotMetadata | null;
}

type OverviewMetadataStatus = 'idle' | 'loading' | 'ready' | 'error';

interface OverviewMetadataState {
	status: OverviewMetadataStatus;
	snapshot: OverviewMetadataSnapshot | null;
	failure: SessionFailureDetails | null;
}

export interface OverviewMetadataResult {
	registries: SessionRegistries | null;
	metadata: SessionSnapshotMetadata | null;
	isLoading: boolean;
	error: SessionFailureDetails | null;
	retry: () => void;
}

let cachedSnapshot: OverviewMetadataSnapshot | null = null;
let cachedFailure: SessionFailureDetails | null = null;
let activeLoad: Promise<OverviewMetadataSnapshot> | null = null;

const toSnapshotMetadata = (
	metadata: SessionMetadataSnapshot | undefined,
): SessionSnapshotMetadata | null => {
	if (!metadata) {
		return null;
	}
	return {
		passiveEvaluationModifiers: {},
		...clone(metadata),
	} satisfies SessionSnapshotMetadata;
};

const loadOverviewMetadata = async (): Promise<OverviewMetadataSnapshot> => {
	const api = ensureGameApi();
	const response = await api.fetchMetadataSnapshot();
	return {
		registries: deserializeSessionRegistries(response.registries),
		metadata: toSnapshotMetadata(response.metadata),
	};
};

const createInitialState = (isActive: boolean): OverviewMetadataState => {
	if (cachedSnapshot) {
		return {
			status: 'ready',
			snapshot: cachedSnapshot,
			failure: null,
		};
	}
	if (cachedFailure) {
		return {
			status: isActive ? 'error' : 'idle',
			snapshot: null,
			failure: cachedFailure,
		};
	}
	return {
		status: isActive ? 'loading' : 'idle',
		snapshot: null,
		failure: null,
	};
};

export function useOverviewMetadata(isActive: boolean): OverviewMetadataResult {
	const [state, setState] = useState<OverviewMetadataState>(() =>
		createInitialState(isActive),
	);

	useEffect(() => {
		if (!isActive) {
			return;
		}
		if (cachedSnapshot) {
			setState({
				status: 'ready',
				snapshot: cachedSnapshot,
				failure: null,
			});
			return;
		}
		setState((previous) => {
			if (previous.status === 'loading') {
				return previous;
			}
			return {
				status: 'loading',
				snapshot: previous.snapshot,
				failure: null,
			};
		});
	}, [isActive]);

	useEffect(() => {
		if (!isActive || state.status !== 'loading') {
			return;
		}
		let subscribed = true;
		const loadPromise = activeLoad ?? loadOverviewMetadata();
		activeLoad = loadPromise;
		loadPromise
			.then((snapshot) => {
				if (!subscribed) {
					return;
				}
				cachedSnapshot = snapshot;
				cachedFailure = null;
				activeLoad = null;
				setState({
					status: 'ready',
					snapshot,
					failure: null,
				});
			})
			.catch((error) => {
				if (!subscribed) {
					return;
				}
				activeLoad = null;
				const failure = formatFailureDetails(error);
				cachedFailure = failure;
				setState({
					status: 'error',
					snapshot: cachedSnapshot,
					failure,
				});
			});
		return () => {
			subscribed = false;
		};
	}, [isActive, state.status]);

	const retry = useCallback(() => {
		cachedFailure = null;
		activeLoad = null;
		setState({
			status: isActive ? 'loading' : 'idle',
			snapshot: cachedSnapshot,
			failure: null,
		});
	}, [isActive]);

	const snapshot = state.snapshot ?? cachedSnapshot;
	return {
		registries: snapshot?.registries ?? null,
		metadata: snapshot?.metadata ?? null,
		isLoading: isActive && state.status === 'loading',
		error: state.failure,
		retry,
	};
}

export const resetOverviewMetadataCacheForTesting = (): void => {
	cachedSnapshot = null;
	cachedFailure = null;
	activeLoad = null;
};
