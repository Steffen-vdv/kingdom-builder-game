export function resolvePrimaryIcon(
	resources: Record<string, { icon?: string } | undefined>,
	primaryId?: string | null,
): string | undefined {
	const entries = Object.entries(resources);
	if (entries.length === 0) {
		return undefined;
	}

	if (primaryId) {
		const resource = resources[primaryId];
		if (resource?.icon) {
			return resource.icon;
		}
	}

	const fallback = entries.find(([, info]) => typeof info?.icon === 'string');
	if (!fallback) {
		return undefined;
	}
	const [, info] = fallback;
	return info?.icon;
}
