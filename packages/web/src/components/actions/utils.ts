import type { IconLabelDisplay } from './actionSelectors';

type ResourceDisplayResolver = (resourceKey: string) => IconLabelDisplay;

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

export function formatMissingResources(
	costs: Record<string, number>,
	playerResources: Record<string, number | undefined>,
	resolveResourceDisplay: ResourceDisplayResolver,
): string | undefined {
	const missing: string[] = [];
	for (const [resourceKey, cost] of Object.entries(costs)) {
		const available = playerResources[resourceKey] ?? 0;
		const shortage = cost - available;
		if (shortage <= 0) {
			continue;
		}
		const display = resolveResourceDisplay(resourceKey);
		const descriptor = [display.icon, display.label].filter(Boolean).join(' ');
		missing.push(`${shortage} ${descriptor || resourceKey}`);
	}
	if (missing.length === 0) {
		return undefined;
	}
	return `Need ${missing.join(', ')}`;
}
