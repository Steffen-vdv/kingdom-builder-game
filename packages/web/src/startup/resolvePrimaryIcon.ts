export interface IconSource {
	icon?: string;
}

export interface ResolvePrimaryIconOptions {
	resources: Record<string, IconSource>;
	preferredResourceKey?: string | null;
	fallbackKeys?: ReadonlyArray<string>;
}

const resolveIcon = (
	resources: Record<string, IconSource>,
	key: string | undefined,
): string | undefined => {
	if (!key) {
		return undefined;
	}
	const icon = resources[key]?.icon;
	return typeof icon === 'string' && icon.trim() ? icon : undefined;
};

export function resolvePrimaryIcon({
	resources,
	preferredResourceKey,
	fallbackKeys = [],
}: ResolvePrimaryIconOptions): string | undefined {
	const entries = Object.entries(resources);
	if (entries.length === 0) {
		return undefined;
	}

	const preferredIcon = resolveIcon(
		resources,
		preferredResourceKey ?? undefined,
	);
	if (preferredIcon) {
		return preferredIcon;
	}

	for (const key of fallbackKeys) {
		const icon = resolveIcon(resources, key);
		if (icon) {
			return icon;
		}
	}

	for (const [key] of entries) {
		const icon = resolveIcon(resources, key);
		if (icon) {
			return icon;
		}
	}

	return undefined;
}
