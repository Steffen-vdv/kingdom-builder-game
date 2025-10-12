export interface IconSource {
	icon?: string;
}

export type PrimaryIconSource = 'primary' | 'fallback' | 'none';

export interface PrimaryIconResolution {
	icon?: string;
	resourceKey?: string;
	source: PrimaryIconSource;
}

export function resolvePrimaryIcon(
	resources: Record<string, IconSource>,
	primaryId?: string | null,
): PrimaryIconResolution {
	const entries = Object.entries(resources);
	if (entries.length === 0) {
		return { source: 'none' };
	}

	if (primaryId) {
		const resource = resources[primaryId];
		if (resource?.icon) {
			return { icon: resource.icon, resourceKey: primaryId, source: 'primary' };
		}
	}

	const fallback = entries.find(([, info]) => typeof info?.icon === 'string');
	if (fallback && fallback[1]?.icon) {
		return {
			icon: fallback[1].icon,
			resourceKey: fallback[0],
			source: 'fallback',
		};
	}

	return { source: 'none' };
}
