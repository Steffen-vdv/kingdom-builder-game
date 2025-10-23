import type { SessionResourceRegistryPayload } from '@kingdom-builder/protocol/session';

export type PrimaryIconSource = 'primary' | 'fallback' | 'none';

export interface PrimaryIconResolution {
	icon?: string;
	resourceKey?: string;
	source: PrimaryIconSource;
}

type ResourceDefinition = SessionResourceRegistryPayload['definitions'][string];

function resolveDefinitionIcon(
	definition: ResourceDefinition | undefined,
): string | undefined {
	const icon = definition?.display?.icon;
	if (typeof icon !== 'string') {
		return undefined;
	}
	const trimmed = icon.trim();
	return trimmed ? trimmed : undefined;
}

export function resolvePrimaryIcon(
	resourceValues: SessionResourceRegistryPayload,
	primaryId?: string | null,
): PrimaryIconResolution {
	const entries = Object.entries(resourceValues.definitions ?? {});
	if (entries.length === 0) {
		return { source: 'none' };
	}

	if (primaryId) {
		const icon = resolveDefinitionIcon(resourceValues.definitions[primaryId]);
		if (icon) {
			return { icon, resourceKey: primaryId, source: 'primary' };
		}
	}

	const fallback = entries.find(([, definition]) =>
		Boolean(resolveDefinitionIcon(definition)),
	);
	if (fallback) {
		const icon = resolveDefinitionIcon(fallback[1]);
		if (icon) {
			return {
				icon,
				resourceKey: fallback[0],
				source: 'fallback',
			};
		}
	}

	return { source: 'none' };
}
