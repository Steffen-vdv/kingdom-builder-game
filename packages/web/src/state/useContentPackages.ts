import { useEffect, useState } from 'react';
import type { ContentPackageMeta } from '@kingdom-builder/protocol';
import { getRuntimeContentConfig } from '../startup/runtimeConfig';

interface ContentPackagesState {
	packages: ContentPackageMeta[];
	defaultContentId: string | null;
}

const FALLBACK: ContentPackagesState = {
	packages: [],
	defaultContentId: null,
};

/**
 * Returns the available content packages and the default
 * content ID from the runtime configuration.
 *
 * The runtime config is fetched once at startup and cached,
 * so subsequent calls resolve immediately.
 */
export function useContentPackages(): ContentPackagesState {
	const [state, setState] = useState<ContentPackagesState>(FALLBACK);

	useEffect(() => {
		let cancelled = false;
		getRuntimeContentConfig()
			.then((config) => {
				if (cancelled) {
					return;
				}
				setState({
					packages: config.contentPackages ?? [],
					defaultContentId: config.defaultContentId ?? null,
				});
			})
			.catch(() => {
				// Runtime config may not be available in
				// test environments. Keep the fallback.
			});
		return () => {
			cancelled = true;
		};
	}, []);

	return state;
}
