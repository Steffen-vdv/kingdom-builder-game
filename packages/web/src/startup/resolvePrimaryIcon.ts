import type { IconSource } from './runtimeBootstrap';

export interface ResolvePrimaryIconOptions {
	primaryResourceId?: string | null;
	metadata?: Record<string, IconSource | undefined>;
	registry?: Record<string, IconSource | undefined>;
}

function findIcon(
	pool: Record<string, IconSource | undefined> | undefined,
	identifier: string | null | undefined,
): string | undefined {
	if (!pool || !identifier) {
		return undefined;
	}
	const entry = pool[identifier];
	return typeof entry?.icon === 'string' ? entry.icon : undefined;
}

function findFirstIcon(
	pool: Record<string, IconSource | undefined> | undefined,
): string | undefined {
	if (!pool) {
		return undefined;
	}
	for (const info of Object.values(pool)) {
		if (typeof info?.icon === 'string') {
			return info.icon;
		}
	}
	return undefined;
}

export function resolvePrimaryIcon({
	primaryResourceId,
	metadata,
	registry,
}: ResolvePrimaryIconOptions): string | undefined {
	const directIcon =
		findIcon(metadata, primaryResourceId) ??
		findIcon(registry, primaryResourceId);
	if (directIcon) {
		return directIcon;
	}
	return findFirstIcon(metadata) ?? findFirstIcon(registry);
}
