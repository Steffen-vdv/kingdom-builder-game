import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { isAbortError } from './isAbortError';

interface OverviewMetadataSnapshot {
	registries: SessionRegistries;
	metadata: SessionSnapshotMetadata;
}

interface OverviewMetadataState {
	registries: SessionRegistries | null;
	metadata: SessionSnapshotMetadata | null;
	isLoading: boolean;
	error: Error | null;
}

export interface UseOverviewMetadataResult extends OverviewMetadataState {
	retry: () => void;
}

const DEFAULT_STATE: OverviewMetadataState = {
	registries: null,
	metadata: null,
	isLoading: false,
	error: null,
};

let cachedSnapshot: OverviewMetadataSnapshot | null = null;

const normalizeMetadata = (
	metadata: SessionMetadataSnapshot,
): SessionSnapshotMetadata => {
	const cloned = clone(metadata);
	return {
		passiveEvaluationModifiers: {},
		...cloned,
	};
};

export function useOverviewMetadata(enabled = true): UseOverviewMetadataResult {
	const [state, setState] = useState<OverviewMetadataState>(() => {
		if (!cachedSnapshot) {
			return DEFAULT_STATE;
		}
		return {
			registries: cachedSnapshot.registries,
			metadata: cachedSnapshot.metadata,
			isLoading: false,
			error: null,
		};
	});
	const [reloadToken, setReloadToken] = useState(0);

	const retry = useCallback(() => {
		setReloadToken((token) => token + 1);
	}, []);

	useEffect(() => {
		if (!enabled) {
			return;
		}
		if (cachedSnapshot) {
			setState({
				registries: cachedSnapshot.registries,
				metadata: cachedSnapshot.metadata,
				isLoading: false,
				error: null,
			});
			return;
		}
		let disposed = false;
		const controller = new AbortController();
		setState((previous) => ({
			registries: previous.registries,
			metadata: previous.metadata,
			isLoading: true,
			error: null,
		}));
		const api = ensureGameApi();
		void api
			.fetchMetadataSnapshot({ signal: controller.signal })
			.then((response) => {
				if (disposed) {
					return;
				}
				const registries = deserializeSessionRegistries(response.registries);
				const metadata = normalizeMetadata(response.metadata);
				const snapshot: OverviewMetadataSnapshot = {
					registries,
					metadata,
				};
				cachedSnapshot = snapshot;
				setState({
					registries,
					metadata,
					isLoading: false,
					error: null,
				});
			})
			.catch((error) => {
				if (disposed || isAbortError(error)) {
					return;
				}
				const normalized =
					error instanceof Error ? error : new Error(String(error));
				setState({
					registries: null,
					metadata: null,
					isLoading: false,
					error: normalized,
				});
			});
		return () => {
			disposed = true;
			controller.abort();
		};
	}, [enabled, reloadToken]);

	return useMemo(
		() => ({
			...state,
			retry,
		}),
		[state, retry],
	);
}

export function clearOverviewMetadataCache(): void {
	cachedSnapshot = null;
}
