export interface IconSource {
	icon?: string;
}

export interface ResolvePrimaryIconOptions {
	resources?: Record<string, IconSource>;
	primaryResourceKey?: string | null;
	explicitIcon?: string | null;
}

function findFirstIcon(
	resources: Record<string, IconSource> | undefined,
): string | undefined {
	if (!resources) {
		return undefined;
	}
	for (const [, info] of Object.entries(resources)) {
		if (typeof info?.icon === 'string' && info.icon.length > 0) {
			return info.icon;
		}
	}
	return undefined;
}

export function resolvePrimaryIcon(
	options: ResolvePrimaryIconOptions,
): string | undefined {
	if (options.explicitIcon && options.explicitIcon.length > 0) {
		return options.explicitIcon;
	}
	const { resources, primaryResourceKey } = options;
	if (primaryResourceKey && resources) {
		const resource = resources[primaryResourceKey];
		if (resource?.icon) {
			return resource.icon;
		}
	}
	return findFirstIcon(resources);
}
