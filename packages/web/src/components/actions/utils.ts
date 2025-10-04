import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';

function isResourceKey(resourceKey: string): resourceKey is ResourceKey {
	return resourceKey in RESOURCES;
}

export function formatMissingResources(
	costs: Record<string, number>,
	playerResources: Record<string, number | undefined>,
): string | undefined {
	const missing: string[] = [];
	for (const [resourceKey, cost] of Object.entries(costs)) {
		const available = playerResources[resourceKey] ?? 0;
		const shortage = cost - available;
		if (shortage <= 0) {
			continue;
		}
		if (isResourceKey(resourceKey)) {
			const resourceInfo = RESOURCES[resourceKey];
			missing.push(`${shortage} ${resourceInfo.icon} ${resourceInfo.label}`);
		} else {
			missing.push(`${shortage} ${resourceKey}`);
		}
	}
	if (missing.length === 0) {
		return undefined;
	}
	return `Need ${missing.join(', ')}`;
}
