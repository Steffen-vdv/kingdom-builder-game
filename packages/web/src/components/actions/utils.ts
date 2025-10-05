import { RESOURCES, type ResourceKey } from '@kingdom-builder/contents';

export function playerHasRequiredResources(
	playerResources: Record<string, number>,
	costs: Record<string, number>,
): boolean {
	return Object.entries(costs).every(([resourceKey, requiredAmount]) => {
		const playerAmount = playerResources[resourceKey] || 0;
		const neededAmount = requiredAmount ?? 0;
		return playerAmount >= neededAmount;
	});
}

export function sumNonActionCosts(
	costs: Record<string, number>,
	actionCostResource: string,
): number {
	return Object.entries(costs).reduce((sum, [resourceKey, requiredAmount]) => {
		if (resourceKey === actionCostResource) {
			return sum;
		}
		const neededAmount = requiredAmount ?? 0;
		return sum + neededAmount;
	}, 0);
}

export function getOptionalProperty<T>(
	value: unknown,
	property: string,
): T | undefined {
	if (typeof value === 'object' && value !== null && property in value) {
		return (value as Record<string, unknown>)[property] as T;
	}
	return undefined;
}

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
