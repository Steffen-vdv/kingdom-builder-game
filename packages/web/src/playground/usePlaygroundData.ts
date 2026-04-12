import { useEffect, useState } from 'react';
import type { SessionMetadataSnapshotResponse } from '@boardsmith/protocol';
import { ensureGameApi } from '../state/gameApiInstance';

interface PlaygroundData {
	data: SessionMetadataSnapshotResponse | null;
	loading: boolean;
	error: string | null;
}

export function usePlaygroundData(): PlaygroundData {
	const [data, setData] = useState<SessionMetadataSnapshotResponse | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		const api = ensureGameApi();
		api
			.fetchMetadataSnapshot()
			.then((response) => {
				if (!cancelled) {
					setData(response);
					setLoading(false);
				}
			})
			.catch((err: unknown) => {
				if (!cancelled) {
					const message =
						err instanceof Error ? err.message : 'Failed to load metadata';
					setError(message);
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, []);

	return { data, loading, error };
}
